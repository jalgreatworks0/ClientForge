# Shared Docker Infrastructure Setup

**Use Case:** Run ClientForge CRM + multiple bots/agents using shared database containers

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────┐
│           Docker Desktop (Always Running)        │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ PostgreSQL   │  │   MongoDB    │            │
│  │ Port: 5432   │  │ Port: 27017  │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │    Redis     │  │ Elasticsearch│            │
│  │ Port: 6379   │  │ Port: 9200   │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
└─────────────────────────────────────────────────┘
           ↑           ↑           ↑
           │           │           │
    ┌──────┴───┐  ┌───┴────┐  ┌──┴─────┐
    │ClientForge│  │ Bot 1  │  │ Bot 2  │
    │    CRM    │  │        │  │        │
    └───────────┘  └────────┘  └────────┘
```

---

## 📦 Database Separation Strategy

### PostgreSQL: Separate Databases
```sql
-- Each app gets its own database
CREATE DATABASE clientforge;
CREATE DATABASE discord_bot;
CREATE DATABASE telegram_bot;
CREATE DATABASE mcp_coordinator;
```

**Connection strings:**
```bash
# ClientForge CRM
DATABASE_URL=postgresql://crm:password@localhost:5432/clientforge

# Discord Bot
DATABASE_URL=postgresql://crm:password@localhost:5432/discord_bot

# Telegram Bot
DATABASE_URL=postgresql://crm:password@localhost:5432/telegram_bot
```

### MongoDB: Separate Databases
```javascript
// Each app uses different database name
const clientforgeDB = mongoClient.db('clientforge');
const discordBotDB = mongoClient.db('discord_bot');
const telegramBotDB = mongoClient.db('telegram_bot');
```

### Redis: Key Prefixes
```bash
# Each app uses different key prefix
# ClientForge
redis.set('crm:user:123', data)

# Discord Bot
redis.set('discord:guild:456', data)

# Telegram Bot
redis.set('telegram:chat:789', data)
```

---

## 🚀 Setup Instructions

### Step 1: Create Shared Docker Compose File

**File:** `D:/ScrollForge/docker-compose.shared.yml`

```yaml
version: '3.8'

services:
  # PostgreSQL - Shared by all apps
  postgres:
    image: postgres:15-alpine
    container_name: scrollforge-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: crm
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_MULTIPLE_DATABASES: clientforge,discord_bot,telegram_bot,mcp_coordinator
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/postgres-init:/docker-entrypoint-initdb.d
    networks:
      - scrollforge-network

  # MongoDB - Shared by all apps
  mongodb:
    image: mongo:6
    container_name: scrollforge-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: crm
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-password}
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    networks:
      - scrollforge-network

  # Redis - Shared by all apps
  redis:
    image: redis:7-alpine
    container_name: scrollforge-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-password}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - scrollforge-network

  # Elasticsearch - Shared by all apps
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: scrollforge-elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - scrollforge-network

volumes:
  postgres-data:
  mongodb-data:
  redis-data:
  elasticsearch-data:

networks:
  scrollforge-network:
    driver: bridge
```

### Step 2: Create PostgreSQL Multi-Database Init Script

**File:** `D:/ScrollForge/scripts/postgres-init/create-multiple-databases.sh`

```bash
#!/bin/bash
set -e

# Create multiple databases from environment variable
if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Creating multiple databases: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        echo "  Creating database '$db'"
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
            CREATE DATABASE $db;
            GRANT ALL PRIVILEGES ON DATABASE $db TO $POSTGRES_USER;
EOSQL
    done
fi
```

### Step 3: Start Shared Infrastructure

```bash
cd D:/ScrollForge
docker-compose -f docker-compose.shared.yml up -d
```

### Step 4: Configure Each App

**ClientForge CRM (.env):**
```bash
DATABASE_URL=postgresql://crm:password@localhost:5432/clientforge
MONGODB_URI=mongodb://crm:password@localhost:27017/clientforge
REDIS_URL=redis://:password@localhost:6379
REDIS_KEY_PREFIX=crm:
```

**Discord Bot (.env):**
```bash
DATABASE_URL=postgresql://crm:password@localhost:5432/discord_bot
MONGODB_URI=mongodb://crm:password@localhost:27017/discord_bot
REDIS_URL=redis://:password@localhost:6379
REDIS_KEY_PREFIX=discord:
```

**Telegram Bot (.env):**
```bash
DATABASE_URL=postgresql://crm:password@localhost:5432/telegram_bot
MONGODB_URI=mongodb://crm:password@localhost:27017/telegram_bot
REDIS_URL=redis://:password@localhost:6379
REDIS_KEY_PREFIX=telegram:
```

---

## 🎛️ Management Commands

### Start All Databases
```bash
docker-compose -f D:/ScrollForge/docker-compose.shared.yml up -d
```

### Stop All Databases
```bash
docker-compose -f D:/ScrollForge/docker-compose.shared.yml down
```

### View Logs
```bash
docker-compose -f D:/ScrollForge/docker-compose.shared.yml logs -f
```

### Restart Specific Service
```bash
docker-compose -f D:/ScrollForge/docker-compose.shared.yml restart postgres
```

### Check Status
```bash
docker-compose -f D:/ScrollForge/docker-compose.shared.yml ps
```

---

## 💾 Backup Strategy

### Backup All Databases
```bash
# PostgreSQL
docker exec scrollforge-postgres pg_dumpall -U crm > backup_postgres_$(date +%Y%m%d).sql

# MongoDB
docker exec scrollforge-mongodb mongodump --username crm --password password --out /backup

# Redis
docker exec scrollforge-redis redis-cli --pass password BGSAVE
```

### Restore
```bash
# PostgreSQL
docker exec -i scrollforge-postgres psql -U crm < backup_postgres_20251109.sql

# MongoDB
docker exec scrollforge-mongodb mongorestore --username crm --password password /backup
```

---

## 🔧 Resource Limits

To prevent Docker from using too much RAM with multiple apps:

**Edit docker-compose.shared.yml:**
```yaml
services:
  postgres:
    # ... existing config ...
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  mongodb:
    # ... existing config ...
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  elasticsearch:
    # ... existing config ...
    deploy:
      resources:
        limits:
          memory: 2G  # Elasticsearch needs more
          cpus: '2.0'
```

---

## 📊 Monitoring All Apps

### View All Connections
```sql
-- PostgreSQL: See which apps are connected
SELECT datname, application_name, count(*)
FROM pg_stat_activity
WHERE datname IN ('clientforge', 'discord_bot', 'telegram_bot')
GROUP BY datname, application_name;
```

```javascript
// MongoDB: See database sizes
use admin
db.runCommand({ listDatabases: 1 })
```

```bash
# Redis: See key distribution by prefix
redis-cli --pass password KEYS "*" | awk -F: '{print $1}' | sort | uniq -c
```

---

## ✅ Benefits of This Setup

1. **Resource Efficient** - One set of containers for all apps
2. **Easy Management** - One docker-compose file to rule them all
3. **Data Isolation** - Each app has separate databases
4. **Scalable** - Easy to add new apps/bots
5. **Visible** - All containers show in Docker Desktop
6. **Auto-Start** - Docker Desktop starts → containers start → apps connect

---

## 🎯 Example: Adding a New Bot

```bash
# 1. No Docker changes needed! Just create new database:
docker exec scrollforge-postgres psql -U crm -c "CREATE DATABASE my_new_bot;"

# 2. Configure your bot's .env:
DATABASE_URL=postgresql://crm:password@localhost:5432/my_new_bot
MONGODB_URI=mongodb://crm:password@localhost:27017/my_new_bot
REDIS_URL=redis://:password@localhost:6379
REDIS_KEY_PREFIX=mybot:

# 3. Start your bot - it just works!
```

---

## 🔐 Security Best Practices

1. **Change Default Passwords** - Update in `.env` file
2. **Don't Expose Ports Externally** - Keep `localhost` only
3. **Regular Backups** - Automate with cron/Task Scheduler
4. **Monitor Resource Usage** - Docker Desktop → Settings → Resources

---

**Perfect for:** ClientForge CRM, Ollama Fleet, MCP Agents, Discord Bots, Telegram Bots, Custom AI Agents, etc.

**All using one shared, efficient Docker infrastructure!** 🚀
