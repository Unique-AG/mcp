import { AuthenticationProvider, AuthenticationProviderOptions } from "@microsoft/microsoft-graph-client";
import { Logger } from "@nestjs/common";
import { serializeError } from "serialize-error-cjs";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeError } from "../utils/normalize-error";

export class TokenProvider implements AuthenticationProvider {
  private readonly logger = new Logger(TokenProvider.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileId: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly scopes: string[],
  ) {}

  public async getAccessToken(_authenticationProviderOptions?: AuthenticationProviderOptions): Promise<string> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: {
        id: this.userProfileId,
      },
    });

    if (!userProfile) throw new Error(`User profile not found: ${this.userProfileId}`);
    if (!userProfile.accessToken) throw new Error(`Access token not found for user: ${this.userProfileId}`);

    // Return the access token directly
    // If the token is expired, the Microsoft Graph SDK will handle the error
    // when making actual API calls, and you can implement retry logic there
    return userProfile.accessToken;
  }

  public async refreshAccessToken(userProfileId: string): Promise<string> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: {
        id: userProfileId,
      },
    });

    if (!userProfile?.refreshToken) throw new Error(`No refresh token available for user: ${this.userProfileId}`);

    try {
      // Microsoft OAuth2 token refresh endpoint
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: userProfile.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: this.scopes.join(' '),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Token refresh failed: ${response.status} ${errorText}`);
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      // Update the stored tokens
      await this.prisma.userProfile.update({
        where: { id: this.userProfileId },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || userProfile.refreshToken, // Keep old refresh token if new one not provided
        },
      });

      this.logger.debug(`Successfully refreshed token for user ${this.userProfileId}`);
      return tokenData.access_token;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to refresh token for user',
        error: serializeError(normalizeError(error)),
      });
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}