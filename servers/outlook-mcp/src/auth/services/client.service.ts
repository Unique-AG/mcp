import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { OAuthClient } from '@rekog/mcp-nest';
import { RegisterClientDto } from '../dtos/register-client.dto';
import { McpOAuthStore } from '../mcp-oauth.store';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(private readonly store: McpOAuthStore) {}

  /**
   * Register a client application.
   * Always creates a new client record. client_name is not treated as unique.
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

    const clientSecret =
      registerClientDto.token_endpoint_auth_method !== 'none'
        ? randomBytes(32).toString('hex')
        : undefined;

    const newClient: OAuthClient = {
      ...registerClientDto,
      client_id: clientId,
      client_secret: clientSecret,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.logger.log({
      msg: 'Client registered with new id',
      name: newClient.client_name,
      clientId,
    });

    return this.store.storeClient(newClient);
  }

  public async getClient(clientId: string): Promise<OAuthClient | null> {
    const client = await this.store.getClient(clientId);
    if (!client) return null;

    return client;
  }

  public async validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.getClient(clientId);
    const valid = client ? client.redirect_uris.includes(redirectUri) : false;

    if (!valid)
      this.logger.log({
        msg: 'Invalid redirect URI',
        clientId,
        validRedirectUris: client?.redirect_uris,
      });

    return valid;
  }
}
