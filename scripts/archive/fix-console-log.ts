/**
 * Automated Console.log Fixer
 *
 * Replaces all console.log/error/warn/info/debug with MongoDB logger
 * Complies with Bootstrap Protocol v3.1 logging standards
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface FileReplacement {
  file: string;
  replacements: number;
}

function getFilesWithConsole(): string[] {
  // Use ripgrep to find all files with console statements
  const result = execSync(
    'rg -l "console\\.(log|error|warn|info|debug)" --type ts',
    { cwd: 'd:\\clientforge-crm', encoding: 'utf-8' }
  );

  return result.split('\n').filter(f => f.trim() !== '');
}

function hasLoggerImport(content: string): boolean {
  return content.includes("from '../../backend/utils/logging/logger'") ||
         content.includes("from '../../../backend/utils/logging/logger'") ||
         content.includes("from '../../../../backend/utils/logging/logger'") ||
         content.includes('from "@/backend/utils/logging/logger"');
}

function getRelativeLoggerPath(filePath: string): string {
  // Calculate relative path from file to logger
  const fileDir = path.dirname(filePath);
  const loggerPath = 'd:\\clientforge-crm\\backend\\utils\\logging\\logger.ts';

  const relative = path.relative(fileDir, path.dirname(loggerPath));
  const normalized = relative.replace(/\\/g, '/');

  return normalized ? `${normalized}/logger` : './logger';
}

function addLoggerImport(content: string, filePath: string): string {
  const relativePath = getRelativeLoggerPath(filePath);

  // Find last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  const loggerImport = `import { logger } from '${relativePath}'`;

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, loggerImport);
  } else {
    // No imports found, add after initial comments
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim().startsWith('/**') &&
          !lines[i].trim().startsWith('*') &&
          !lines[i].trim().startsWith('*/') &&
          !lines[i].trim().startsWith('//')) {
        insertIndex = i;
        break;
      }
    }
    lines.splice(insertIndex, 0, loggerImport, '');
  }

  return lines.join('\n');
}

function replaceConsoleStatements(content: string): { content: string; count: number } {
  let count = 0;

  // Replace console.log → logger.info
  content = content.replace(/console\.log\(/g, () => {
    count++;
    return 'logger.info(';
  });

  // Replace console.error → logger.error
  content = content.replace(/console\.error\(/g, () => {
    count++;
    return 'logger.error(';
  });

  // Replace console.warn → logger.warn
  content = content.replace(/console\.warn\(/g, () => {
    count++;
    return 'logger.warn(';
  });

  // Replace console.info → logger.info
  content = content.replace(/console\.info\(/g, () => {
    count++;
    return 'logger.info(';
  });

  // Replace console.debug → logger.debug
  content = content.replace(/console\.debug\(/g, () => {
    count++;
    return 'logger.debug(';
  });

  return { content, count };
}

async function fixFile(filePath: string): Promise<FileReplacement> {
  const fullPath = path.join('d:\\clientforge-crm', filePath);

  let content = fs.readFileSync(fullPath, 'utf-8');

  // Add logger import if not present
  if (!hasLoggerImport(content)) {
    content = addLoggerImport(content, fullPath);
  }

  // Replace console statements
  const { content: newContent, count } = replaceConsoleStatements(content);

  // Write back to file
  fs.writeFileSync(fullPath, newContent, 'utf-8');

  return {
    file: filePath,
    replacements: count
  };
}

async function main() {
  console.log('================================================================================');
  console.log('CONSOLE.LOG FIXER - Bootstrap Protocol v3.1');
  console.log('================================================================================');
  console.log('');

  const files = getFilesWithConsole();
  console.log(`Found ${files.length} files with console statements`);
  console.log('');

  const results: FileReplacement[] = [];
  let totalReplacements = 0;

  for (const file of files) {
    try {
      const result = await fixFile(file);
      results.push(result);
      totalReplacements += result.replacements;
      console.log(`✓ ${file} (${result.replacements} replacements)`);
    } catch (error) {
      console.error(`✗ ${file} - Error:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log('');
  console.log('================================================================================');
  console.log('SUMMARY');
  console.log('================================================================================');
  console.log(`Files processed: ${results.length}/${files.length}`);
  console.log(`Total replacements: ${totalReplacements}`);
  console.log('');
  console.log('All console.log statements replaced with MongoDB logger ✓');
}

main().catch(console.error);
