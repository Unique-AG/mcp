import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterClientDto } from '../dtos/register-client.dto';
import type { IOAuthStore } from '../interfaces/io-auth-store.interface';
import { OAuthClient } from '../interfaces/oauth-client.interface';
import { OAUTH_STORE_TOKEN } from '../mcp-oauth.module-definition';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(@Inject(OAUTH_STORE_TOKEN) private readonly store: IOAuthStore) {}

  /**
   * Register a client application.
   * Always creates a new client record. client_name is not treated as unique.
   * Returns the client with the plaintext secret (only time it's available).
   */
  public async registerClient(registerClientDto: RegisterClientDto): Promise<OAuthClient> {
    this.logger.log({
      msg: 'Register new oAuth client',
      name: registerClientDto.client_name,
      description: registerClientDto.client_description,
      developerName: registerClientDto.developer_name,
      developerEmail: registerClientDto.developer_email,
      redirectUris: registerClientDto.redirect_uris,
      grantTypes: registerClientDto.grant_types,
      responseTypes: registerClientDto.response_types,
      tokenEndpointAuthMethod: registerClientDto.token_endpoint_auth_method,
    });

    const clientId = this.store.generateClientId({
      ...registerClientDto,
      client_id: '',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const plaintextSecret =
      registerClientDto.token_endpoint_auth_method !== 'none'
        ? randomBytes(32).toString('hex')
        : undefined;

    const hashedSecret = plaintextSecret ? await bcrypt.hash(plaintextSecret, 10) : undefined;

    const newClient: OAuthClient = {
      ...registerClientDto,
      client_id: clientId,
      client_secret: hashedSecret,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.logger.log({
      msg: 'Client registered with new id',
      name: newClient.client_name,
      clientId,
    });

    const storedClient = await this.store.storeClient(newClient);

    // Return the client with plaintext secret (only time it's visible)
    return {
      ...storedClient,
      client_secret: plaintextSecret,
    };
  }

  public async getClient(clientId: string): Promise<OAuthClient | null> {
    const client = await this.store.getClient(clientId);
    if (!client) return null;

    return client;
  }

  public async validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.getClient(clientId);
    if (!client) return false;

    // Strict validation: no wildcards, exact match only
    // Exception: Allow localhost with different ports for development
    const isValid = client.redirect_uris.some((registeredUri) => {
      if (registeredUri === redirectUri) return true;

      // Allow loopback interface exceptions per RFC 8252
      try {
        const registered = new URL(registeredUri);
        const requested = new URL(redirectUri);

        // Only for localhost/127.0.0.1 - allow port variations
        if (
          (registered.hostname === 'localhost' || registered.hostname === '127.0.0.1') &&
          (requested.hostname === 'localhost' || requested.hostname === '127.0.0.1') &&
          registered.pathname === requested.pathname &&
          registered.search === requested.search
        ) {
          return true;
        }
      } catch {
        // Invalid URL, reject
      }

      return false;
    });

    if (!isValid) {
      this.logger.log({
        msg: 'Invalid redirect URI',
        clientId,
        requested: redirectUri,
        validRedirectUris: client.redirect_uris,
      });
    }

    return isValid;
  }

  /**
   * Validates client credentials using constant-time comparison.
   * @returns true if valid, false otherwise
   */
  public async validateClientCredentials(
    clientId: string,
    clientSecret: string | undefined,
  ): Promise<boolean> {
    const client = await this.getClient(clientId);
    if (!client) return false;

    // Public clients (token_endpoint_auth_method === 'none')
    if (!client.client_secret) return !clientSecret;

    // Confidential clients - require secret
    if (!clientSecret) return false;

    try {
      return await bcrypt.compare(clientSecret, client.client_secret);
    } catch (error) {
      this.logger.error({
        msg: 'Error comparing client secrets',
        error,
      });
      return false;
    }
  }
}
