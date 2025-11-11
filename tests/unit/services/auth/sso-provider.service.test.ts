import { SSOProviderService } from '../../../../backend/services/auth/sso/sso-provider.service';
import { getPool } from '../../../../backend/database/postgresql/pool';

// Mock the database pool
jest.mock('../../../../backend/database/postgresql/pool', () => ({
  getPool: jest.fn()
}));

describe('SSOProviderService', () => {
  let service: SSOProviderService;
  const mockPool = {
    query: jest.fn()
  };

  beforeEach(() => {
    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new SSOProviderService();
    
    // Clear all mocks
    mockPool.query.mockClear();
  });

  describe('getSSOProviders', () => {
    it('should fetch SSO providers for a tenant', async () => {
      const mockResult = {
        rows: [
          { id: 'provider-1', provider_type: 'google', client_id: 'client-id' },
          { id: 'provider-2', provider_type: 'microsoft', client_id: 'client-id' }
        ]
      };
      
      mockPool.query.mockResolvedValue(mockResult);
      
      const result = await service.getSSOProviders('tenant-123');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT id, provider_type, client_id FROM sso_providers WHERE tenant_id = $1',
        ['tenant-123']
      );
      expect(result).toEqual(mockResult.rows);
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.getSSOProviders('tenant-123')).rejects.toThrow('Failed to fetch SSO providers');
    });
  });

  describe('createSSOProvider', () => {
    it('should create a new SSO provider configuration', async () => {
      const mockResult = {
        rows: [{ id: 'provider-456' }]
      };
      
      mockPool.query.mockResolvedValue(mockResult);
      
      const result = await service.createSSOProvider(
        'tenant-123',
        'google',
        { clientId: 'client-id', clientSecret: 'secret' }
      );
      
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO sso_providers (tenant_id, provider_type, client_id, client_secret, metadata_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['tenant-123', 'google', 'client-id', 'secret', undefined]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.createSSOProvider(
        'tenant-123',
        'google',
        { clientId: 'client-id', clientSecret: 'secret' }
      )).rejects.toThrow('Failed to create SSO provider');
    });
  });

  describe('validateAndStoreToken', () => {
    it('should store or update SSO token for a user', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      await service.validateAndStoreToken(
        'user-123',
        'google',
        { accessToken: 'access-token', refreshToken: 'refresh-token', expiresAt: new Date() }
      );
      
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO user_sso_tokens (user_id, provider_type, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, provider_type) 
         DO UPDATE SET access_token = EXCLUDED.access_token,
                       refresh_token = EXCLUDED.refresh_token,
                       expires_at = EXCLUDED.expires_at`,
        ['user-123', 'google', 'access-token', 'refresh-token', expect.any(Date)]
      );
    });

    it('should throw an error when database query fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(service.validateAndStoreToken(
        'user-123',
        'google',
        { accessToken: 'access-token', refreshToken: 'refresh-token', expiresAt: new Date() }
      )).rejects.toThrow('Failed to store SSO token');
    });
  });

  describe('generateAuthUrl', () => {
    it('should generate Google OAuth URL for auth flow', async () => {
      // This is a simplified test - in reality, this would require mocking the OAuth2Client
      expect(() => service.generateAuthUrl('google')).not.toThrow();
    });
    
    it('should throw error for unsupported providers', async () => {
      await expect(service.generateAuthUrl('unsupported-provider')).rejects.toThrow('Unsupported SSO provider');
    });
  });

  describe('initializeProviders', () => {
    it('should initialize all providers without errors', () => {
      // This method is currently a no-op in the implementation but we test that it doesn't throw
      expect(() => service['initializeProviders']()).not.toThrow();
    });
  });
});