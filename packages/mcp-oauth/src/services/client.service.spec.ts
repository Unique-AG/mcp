import { type Mocked, TestBed } from '@suites/unit';
import { beforeEach, describe, expect, it } from 'vitest';
import { IOAuthStore } from '../interfaces/io-auth-store.interface';
import { OAUTH_STORE_TOKEN } from '../mcp-oauth.module-definition';
import { ClientService } from './client.service';

describe('ClientService', () => {
  let clientService: ClientService;
  let store: Mocked<IOAuthStore>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(ClientService).compile();

    clientService = unit;
    store = unitRef.get(OAUTH_STORE_TOKEN);
  });

  describe('registerClient', () => {
    const registerClientDto = {
      client_name: 'test',
      redirect_uris: ['http://localhost:3000/mcp'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };

    it('registers a dynamic oauthclient', async () => {
      const client = await clientService.registerClient(registerClientDto);
      expect(client).toBeDefined();
    });

    it('generates a client id', async () => {
      store.generateClientId.mockReturnValue('test');
      store.storeClient.mockImplementation((client) => Promise.resolve(client));
      const client = await clientService.registerClient(registerClientDto);
      expect(client.client_id).toBe('test');
    });

    it('stores the client', async () => {
      await clientService.registerClient(registerClientDto);
      expect(store.storeClient).toHaveBeenCalled();
    });

    it('returns the client with the plaintext secret', async () => {
      const client = await clientService.registerClient({
        ...registerClientDto,
        token_endpoint_auth_method: 'client_secret_basic',
      });
      expect(client.client_secret).toBeDefined();
    });
  });
});
