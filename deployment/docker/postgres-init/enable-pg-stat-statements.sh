#!/bin/bash
# Enable pg_stat_statements in PostgreSQL
# This script modifies postgresql.conf to load the extension

set -e

echo "Enabling pg_stat_statements extension..."

# Add shared_preload_libraries to postgresql.conf if not already present
if ! grep -q "shared_preload_libraries.*pg_stat_statements" "$PGDATA/postgresql.conf"; then
    echo "shared_preload_libraries = 'pg_stat_statements'" >> "$PGDATA/postgresql.conf"
    echo "✓ Added pg_stat_statements to shared_preload_libraries"
else
    echo "✓ pg_stat_statements already in shared_preload_libraries"
fi

# Configure pg_stat_statements settings
cat >> "$PGDATA/postgresql.conf" <<EOF

# pg_stat_statements configuration
pg_stat_statements.max = 10000  # Track up to 10000 distinct queries
pg_stat_statements.track = all  # Track all statements including nested
pg_stat_statements.track_utility = on  # Track utility commands
pg_stat_statements.save = on  # Save stats across restarts
EOF

echo "✓ pg_stat_statements configuration added"
echo ""
echo "IMPORTANT: PostgreSQL must be restarted for changes to take effect"
echo "After restart, run: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
