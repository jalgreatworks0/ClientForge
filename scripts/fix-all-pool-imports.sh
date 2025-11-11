#!/bin/bash
# Fix all database pool import paths based on directory depth
# Target file: backend/database/postgresql/pool.ts

cd d:/clientforge-crm/backend

echo "Fixing database pool imports..."

# Files at api/rest/v1/routes/ (4 levels deep - need ../../../../)
echo "Fixing api/rest/v1/routes/ files..."
find api/rest/v1/routes -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../../../../database/postgresql/pool'|from '../../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../../database/postgresql/pool'|from '../../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../database/postgresql/pool'|from '../../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../database/postgresql/pool'|from '../../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../../../../database/postgresql/pool'|g" "$file"
done

# Files at api/ (1 level deep - need ../)
echo "Fixing api/ files..."
find api -maxdepth 1 -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
done

# Files at core/{category}/ (2 levels deep - need ../../)
echo "Fixing core/ files..."
find core -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
done

# Files at modules/{category}/ (2 levels deep - need ../../)
echo "Fixing modules/ files..."
find modules -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
done

# Files at services/{category}/ (2 levels deep - need ../../)
echo "Fixing services/{category}/ files..."
find services -maxdepth 2 -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../../database/postgresql/pool'|g" "$file"
done

# Files at services/{category}/{subcategory}/ (3 levels deep - need ../../../)
echo "Fixing services/{category}/{subcategory}/ files..."
find services -mindepth 3 -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../../../database/postgresql/pool'|from '../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../../../database/postgresql/pool'|from '../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../database/postgresql/pool'|from '../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../database/postgresql/pool'|from '../../../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../../../database/postgresql/pool'|g" "$file"
done

# Files at middleware/ (1 level deep - need ../)
echo "Fixing middleware/ files..."
find middleware -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
done

# Files at queues/ (1 level deep - need ../)
echo "Fixing queues/ files..."
find queues -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
done

# Files at scripts/ (1 level deep - need ../)
echo "Fixing scripts/ files..."
find scripts -name "*.ts" 2>/dev/null | while read file; do
  sed -i "s|from '../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from '../../database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
  sed -i "s|from 'database/postgresql/pool'|from '../database/postgresql/pool'|g" "$file"
done

echo "✅ All imports fixed!"
