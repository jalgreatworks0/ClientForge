#!/usr/bin/env node
/**
 * Fix all database pool import paths
 * This script corrects relative import paths to backend/database/postgresql/pool
 */

const fs = require('fs');
const path = require('path');

// Target file that everyone needs to import
const TARGET_FILE = 'backend/database/postgresql/pool';

// Calculate correct relative path from source to target
function getCorrectPath(sourceFile) {
  const sourceParts = sourceFile.split('/');
  const targetParts = TARGET_FILE.split('/');

  // Remove filename from source
  sourceParts.pop();

  // Count how many levels up we need to go
  let levelsUp = sourceParts.length - 1; // -1 because we start from backend/

  // Build the relative path
  let relativePath = '';
  for (let i = 0; i < levelsUp; i++) {
    relativePath += '../';
  }

  // Add the path from backend/ to database/postgresql/pool
  relativePath += 'database/postgresql/pool';

  return relativePath;
}

// Fix patterns in file content
function fixFileImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const correctPath = getCorrectPath(filePath);

  // Pattern variations to fix
  const patterns = [
    /from ['"]\.\.\/\.\.\/database\/postgresql\/pool['"]/g,
    /from ['"]\.\.\/\.\.\/\.\.\/database\/postgresql\/pool['"]/g,
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/database\/postgresql\/pool['"]/g,
    /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/database\/postgresql\/pool['"]/g,
    /require\(['"]\.\.\/\.\.\/database\/postgresql\/pool['"]\)/g,
    /require\(['"]\.\.\/\.\.\/\.\.\/database\/postgresql\/pool['"]\)/g,
    /require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/database\/postgresql\/pool['"]\)/g,
    /require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/database\/postgresql\/pool['"]\)/g,
  ];

  patterns.forEach(pattern => {
    if (pattern.toString().includes('require')) {
      const replacement = `require('${correctPath}')`;
      if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    } else {
      const replacement = `from '${correctPath}'`;
      if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath} -> ${correctPath}`);
    return true;
  }

  return false;
}

// Recursively find and fix all TypeScript files
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let fixedCount = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        fixedCount += processDirectory(fullPath);
      }
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      if (fixFileImports(fullPath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

// Start processing
console.log('🔧 Fixing database pool import paths...\n');
const fixedCount = processDirectory('backend');
console.log(`\n✨ Fixed ${fixedCount} files`);
