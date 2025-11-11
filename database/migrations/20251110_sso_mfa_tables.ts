import { MigrationBuilder } from 'node-pg-migrate';

export function up(pgm: MigrationBuilder): void {
  // Create SSO providers table
  pgm.createTable('sso_providers', {
    id: { type: 'UUID', primaryKey: true, default: 'gen_random_uuid()' },
    tenant_id: { 
      type: 'UUID', 
      references: 'organizations(id)',
      notNull: true 
    },
    provider_type: { type: 'VARCHAR(50)', notNull: true }, // google, microsoft, saml
    client_id: { type: 'TEXT', notNull: true },
    client_secret: { type: 'TEXT', notNull: true },
    metadata_url: { type: 'TEXT' },
    created_at: { 
      type: 'TIMESTAMPTZ', 
      default: pgm.func('NOW()'),
      notNull: true
    }
  });

  // Create user MFA table
  pgm.createTable('user_mfa', {
    user_id: { 
      type: 'UUID', 
      references: 'users(id)',
      primaryKey: true,
      notNull: true 
    },
    mfa_type: { type: 'VARCHAR(20)', notNull: true }, // totp, sms, email
    secret: { type: 'TEXT' },
    backup_codes: { type: 'TEXT[]' },
    enabled: { type: 'BOOLEAN', default: false, notNull: true },
    created_at: { 
      type: 'TIMESTAMPTZ', 
      default: pgm.func('NOW()'),
      notNull: true
    },
    updated_at: { 
      type: 'TIMESTAMPTZ', 
      default: pgm.func('NOW()'),
      notNull: true
    }
  });

  // Create user SSO tokens table
  pgm.createTable('user_sso_tokens', {
    user_id: { 
      type: 'UUID', 
      references: 'users(id)',
      primaryKey: true,
      notNull: true 
    },
    provider_type: { type: 'VARCHAR(50)', notNull: true }, // google, microsoft
    access_token: { type: 'TEXT', notNull: true },
    refresh_token: { type: 'TEXT' },
    expires_at: { type: 'TIMESTAMPTZ' },
    created_at: { 
      type: 'TIMESTAMPTZ', 
      default: pgm.func('NOW()'),
      notNull: true
    },
    updated_at: { 
      type: 'TIMESTAMPTZ', 
      default: pgm.func('NOW()'),
      notNull: true
    }
  });

  // Create user MFA backup codes table
  pgm.createTable('user_mfa_backup_codes', {
    user_id: { 
      type: 'UUID', 
      references: 'users(id)',
      primaryKey: true,
      notNull: true 
    },
    codes: { type: 'TEXT[]', default: '{}', notNull: true },
    created_at: { 
      type: 'TIMESTAMPTZ', 
      default: pgm.func('NOW()'),
      notNull: true
    },
    updated_at: { 
      type: 'TIMESTAMPTZ', 
      default: pgm.func('NOW()'),
      notNull: true
    }
  });

  // Create indexes for better performance
  pgm.createIndex('sso_providers', ['tenant_id']);
  pgm.createIndex('user_mfa', ['user_id']);
  pgm.createIndex('user_sso_tokens', ['user_id']);
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('user_mfa_backup_codes');
  pgm.dropTable('user_sso_tokens');
  pgm.dropTable('user_mfa');
  pgm.dropTable('sso_providers');
}