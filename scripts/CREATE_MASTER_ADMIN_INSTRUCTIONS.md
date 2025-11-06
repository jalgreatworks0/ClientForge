# Create Master Admin Account

## Credentials
- **Email**: `Master@clientforge.io`
- **Password**: `Admin123`

## Prerequisites

Before running this script, ensure PostgreSQL database is running.

### Option 1: Start PostgreSQL Database with Docker

```bash
# Start PostgreSQL
docker run -d \
  --name clientforge-postgres \
  -e POSTGRES_USER=crm \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=clientforge \
  -p 5432:5432 \
  postgres:15-alpine

# Verify it's running
docker ps | grep clientforge-postgres
```

### Option 2: Use Existing PostgreSQL Installation

Make sure your PostgreSQL service is running:

**Windows:**
```bash
# Start PostgreSQL service
net start postgresql-x64-15
```

**Linux/Mac:**
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
# or
brew services start postgresql
```

## Database Setup

1. **Create the database tables** (if not already created):

```bash
cd d:\clientforge-crm
npm run db:migrate
```

2. **Run the master admin creation script**:

```bash
node scripts/create-master-admin.js
```

## Expected Output

```
🔧 Creating master admin account...
✅ Tenant created/updated: <tenant-id>
✅ Role created/updated: <role-id>

✅ Master admin account created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:    Master@clientforge.io
🔑 Password: Admin123
🆔 User ID:  <user-id>
🏢 Tenant:   <tenant-id>
👤 Role:     <role-id>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Change this password after first login!

✨ Done!
```

## Troubleshooting

### Error: `ECONNREFUSED`
- The database is not running
- Check DATABASE_URL in `.env` file
- Verify database credentials match

### Error: `relation "tenants" does not exist`
- Database tables haven't been created
- Run migrations: `npm run db:migrate`

### Error: `database "clientforge" does not exist`
- Create the database first:
```sql
CREATE DATABASE clientforge;
```

## Login Instructions

1. Navigate to: `http://localhost:3001`
2. Enter credentials:
   - Email: `Master@clientforge.io`
   - Password: `Admin123`
3. **IMPORTANT**: Change the password immediately after first login

## Security Notes

⚠️ **This is a development convenience script**

- Never use these credentials in production
- Always change the default password immediately
- Use strong, unique passwords for production environments
- Consider implementing multi-factor authentication (MFA)
