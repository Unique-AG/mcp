import { Logger } from '@nestjs/common';
import {
  AccessTokenMetadata,
  AuthorizationCode,
  type IEncryptionService,
  IOAuthStore,
  OAuthClient,
  OAuthSession,
  OAuthUserProfile,
  PassportUser,
  RefreshTokenMetadata,
} from '@unique-ag/mcp-oauth';
import { typeid } from 'typeid-js';
import { PrismaService } from '../prisma/prisma.service';
import {
  convertAuthCodeToPrisma,
  convertOAuthClientToPrisma,
  convertPrismaToAuthCode,
  convertPrismaToOAuthClient,
  convertPrismaToSession,
  convertSessionToPrisma,
} from '../utils/case-converter';

export class McpOAuthStore implements IOAuthStore {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: IEncryptionService,
  ) {}

  public async storeClient(client: OAuthClient): Promise<OAuthClient> {
    const saved = await this.prisma.oAuthClient.create({
      data: convertOAuthClientToPrisma(client),
    });

    return convertPrismaToOAuthClient(saved);
  }

  public async getClient(client_id: string): Promise<OAuthClient | undefined> {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId: client_id },
    });

    if (!client) return undefined;

    return convertPrismaToOAuthClient(client);
  }

  public async findClient(client_name: string): Promise<OAuthClient | undefined> {
    const client = await this.prisma.oAuthClient.findFirst({
      where: { clientName: client_name },
    });

    if (!client) return undefined;

    return convertPrismaToOAuthClient(client);
  }

  public generateClientId(client: OAuthClient): string {
    const normalizedName = client.client_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    // TODO: We need to discuss if we want to add the normalizedName as a clientId prefix.
    return typeid(normalizedName).toString();
  }

  public async storeAuthCode(code: AuthorizationCode): Promise<void> {
    await this.prisma.authorizationCode.create({
      data: convertAuthCodeToPrisma(code),
    });
  }

  public async getAuthCode(code: string): Promise<AuthorizationCode | undefined> {
    const authCode = await this.prisma.authorizationCode.findUnique({
      where: { code },
    });

    if (!authCode) return undefined;
    if (authCode.expiresAt < new Date()) {
      await this.removeAuthCode(code);
      return undefined;
    }

    return convertPrismaToAuthCode(authCode);
  }

  public async removeAuthCode(code: string): Promise<void> {
    await this.prisma.authorizationCode
      .delete({
        where: { code },
      })
      .catch((error) => {
        this.logger.warn(`Failed to remove auth code: ${error.message}`);
      });
  }

  public async storeOAuthSession(sessionId: string, session: OAuthSession): Promise<void> {
    const prismaData = convertSessionToPrisma(session);

    await this.prisma.oAuthSession.create({
      data: {
        ...prismaData,
        sessionId,
      },
    });
  }

  public async getOAuthSession(sessionId: string): Promise<OAuthSession | undefined> {
    const session = await this.prisma.oAuthSession.findUnique({
      where: { sessionId },
    });

    if (!session) return undefined;
    if (session.expiresAt < new Date()) {
      await this.removeOAuthSession(sessionId);
      return undefined;
    }

    return convertPrismaToSession(session);
  }

  public async removeOAuthSession(sessionId: string): Promise<void> {
    await this.prisma.oAuthSession
      .delete({
        where: { sessionId },
      })
      .catch((error) => {
        this.logger.warn(`Failed to remove OAuth session: ${error.message}`);
      });
  }

  public async upsertUserProfile(user: PassportUser): Promise<string> {
    const { profile, accessToken, refreshToken, provider } = user;

    const encryptedAccessToken = this.encryptionService.encryptToString(accessToken);
    const encryptedRefreshToken = this.encryptionService.encryptToString(refreshToken);

    const mappedProfile = {
      provider,
      providerUserId: profile.id,
      username: profile.username,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      raw: profile.raw,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
    };

    const saved = await this.prisma.userProfile.upsert({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.id,
        },
      },
      update: mappedProfile,
      create: mappedProfile,
    });

    return saved.id;
  }

  public async getUserProfileById(
    profileId: string,
  ): Promise<(OAuthUserProfile & { profile_id: string; provider: string }) | undefined> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) return undefined;

    return {
      profile_id: profile.id,
      provider: profile.provider,
      id: profile.providerUserId,
      username: profile.username,
      email: profile.email || undefined,
      displayName: profile.displayName || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      raw: profile.raw || undefined,
    };
  }

  public async storeAccessToken(token: string, metadata: AccessTokenMetadata): Promise<void> {
    const profile = await this.getUserProfileById(metadata.userProfileId);
    if (!profile) throw new Error('User profile not found');

    await this.prisma.token.create({
      data: {
        token,
        type: 'ACCESS',
        expiresAt: metadata.expiresAt,
        userId: metadata.userId,
        clientId: metadata.clientId,
        scope: metadata.scope,
        resource: metadata.resource,
        userProfileId: metadata.userProfileId,
      },
    });
  }

  public async getAccessToken(token: string): Promise<AccessTokenMetadata | undefined> {
    const metadata = await this.prisma.token.findUnique({
      where: { token },
      include: {
        userProfile: true,
      },
    });
    if (!metadata) return undefined;
    if (metadata.expiresAt < new Date()) {
      await this.removeAccessToken(token);
      return undefined;
    }

    return {
      ...metadata,
      userData: metadata.userProfile?.raw,
    };
  }

  public async removeAccessToken(token: string): Promise<void> {
    await this.prisma.token.delete({
      where: { token },
    });
  }

  public async storeRefreshToken(token: string, metadata: RefreshTokenMetadata): Promise<void> {
    const profile = await this.getUserProfileById(metadata.userProfileId);
    if (!profile) throw new Error('User profile not found');

    await this.prisma.token.create({
      data: {
        token,
        type: 'REFRESH',
        expiresAt: metadata.expiresAt,
        userId: metadata.userId,
        clientId: metadata.clientId,
        scope: metadata.scope,
        resource: metadata.resource,
        userProfileId: metadata.userProfileId,
      },
    });
  }

  public async getRefreshToken(token: string): Promise<RefreshTokenMetadata | undefined> {
    const metadata = await this.prisma.token.findUnique({
      where: { token },
    });

    if (!metadata) return undefined;
    if (metadata.expiresAt < new Date()) {
      await this.removeRefreshToken(token);
      return undefined;
    }

    return metadata;
  }

  public async removeRefreshToken(token: string): Promise<void> {
    await this.prisma.token.delete({
      where: { token },
    });
  }
}
