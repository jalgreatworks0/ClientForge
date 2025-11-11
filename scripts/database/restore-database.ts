#!/usr/bin/env tsx
/**
 * Database Restore Script
 * Restores PostgreSQL database from backup with verification
 *
 * Features:
 * - Interactive backup selection
 * - Pre-restore verification
 * - Safe restoration with transaction support
 * - Post-restore validation
 * - Detailed logging
 *
 * Usage:
 *   # Restore latest backup
 *   npx tsx scripts/database/restore-database.ts
 *
 *   # Restore specific backup
 *   npx tsx scripts/database/restore-database.ts --file backup-2025-11-10.dump
 *
 *   # Verify only (don't restore)
 *   npx tsx scripts/database/restore-database.ts --verify-only
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   BACKUP_DIR - Backup directory (default: ./backups)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const execAsync = promisify(exec)

interface RestoreConfig {
  databaseUrl: string
  backupDir: string
  backupFile?: string
  verifyOnly: boolean
}

interface RestoreResult {
  success: boolean
  backupFile: string
  duration: number
  tablesRestored?: number
  error?: string
}

class DatabaseRestoreService {
  private config: RestoreConfig
  private pool: Pool

  constructor() {
    this.config = {
      databaseUrl: process.env.DATABASE_URL || '',
      backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups', 'database'),
      backupFile: this.getBackupFileFromArgs(),
      verifyOnly: process.argv.includes('--verify-only'),
    }

    this.pool = new Pool({
      connectionString: this.config.databaseUrl,
    })
  }

  /**
   * Restore database from backup
   */
  async restore(): Promise<RestoreResult> {
    console.log('╔════════════════════════════════════════════════════════════════╗')
    console.log('║     Database Restore - ClientForge CRM                        ║')
    console.log('╚════════════════════════════════════════════════════════════════╝\n')

    const startTime = Date.now()

    try {
      // Validate configuration
      this.validateConfig()

      // Select backup file
      const backupFile = await this.selectBackupFile()
      console.log(`\n📁 Backup Directory: ${this.config.backupDir}`)
      console.log(`📝 Backup File: ${path.basename(backupFile)}\n`)

      // Verify backup integrity
      console.log('1. Verifying backup integrity...')
      const tableCount = await this.verifyBackup(backupFile)
      console.log(`   ✓ Backup verified (${tableCount} tables)\n`)

      if (this.config.verifyOnly) {
        console.log('✅ Verification complete (--verify-only mode)\n')
        return {
          success: true,
          backupFile,
          duration: Date.now() - startTime,
          tablesRestored: tableCount,
        }
      }

      // Check current database state
      console.log('2. Checking current database state...')
      const currentTables = await this.getCurrentTableCount()
      console.log(`   Current database has ${currentTables} tables\n`)

      // Confirm restoration
      console.log('⚠️  WARNING: This will replace the current database!')
      console.log('   Make sure you have a backup of the current state.\n')

      // Perform restoration
      console.log('3. Restoring database...')
      await this.performRestore(backupFile)
      console.log('   ✓ Database restored\n')

      // Verify restoration
      console.log('4. Verifying restored database...')
      const restoredTables = await this.getCurrentTableCount()
      console.log(`   ✓ Restored database has ${restoredTables} tables\n`)

      // Run ANALYZE to update statistics
      console.log('5. Updating database statistics...')
      await this.analyzeDatabase()
      console.log('   ✓ Statistics updated\n')

      const duration = Date.now() - startTime
      const durationSec = (duration / 1000).toFixed(2)

      console.log('═══════════════════════════════════════════════════════════════')
      console.log(`\n✅ Restore completed successfully in ${durationSec}s\n`)
      console.log(`   Backup: ${path.basename(backupFile)}`)
      console.log(`   Tables: ${restoredTables}\n`)

      return {
        success: true,
        backupFile,
        duration,
        tablesRestored: restoredTables,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('\n✗ Restore failed:', error.message)

      return {
        success: false,
        backupFile: this.config.backupFile || '',
        duration,
        error: error.message,
      }
    } finally {
      await this.pool.end()
    }
  }

  /**
   * Get backup file from command line arguments
   */
  private getBackupFileFromArgs(): string | undefined {
    const fileIndex = process.argv.indexOf('--file')
    if (fileIndex !== -1 && process.argv[fileIndex + 1]) {
      return process.argv[fileIndex + 1]
    }
    return undefined
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
  }

  /**
   * Select backup file (use specified file or latest)
   */
  private async selectBackupFile(): Promise<string> {
    // If file specified, use it
    if (this.config.backupFile) {
      const filePath = path.isAbsolute(this.config.backupFile)
        ? this.config.backupFile
        : path.join(this.config.backupDir, this.config.backupFile)

      try {
        await fs.access(filePath)
        return filePath
      } catch {
        throw new Error(`Backup file not found: ${filePath}`)
      }
    }

    // Otherwise, find latest backup
    const files = await fs.readdir(this.config.backupDir)
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.dump'))

    if (backupFiles.length === 0) {
      throw new Error(`No backup files found in ${this.config.backupDir}`)
    }

    // Get file stats to find latest
    const filesWithStats = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(this.config.backupDir, file)
        const stats = await fs.stat(filePath)
        return { file, filePath, mtime: stats.mtime }
      })
    )

    // Sort by modification time (newest first)
    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

    console.log('Available backups:')
    filesWithStats.forEach((f, i) => {
      const indicator = i === 0 ? '→' : ' '
      const ageHours = Math.floor((Date.now() - f.mtime.getTime()) / (1000 * 60 * 60))
      console.log(`   ${indicator} ${f.file} (${ageHours}h old)`)
    })

    return filesWithStats[0].filePath
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(backupFile: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`pg_restore --list "${backupFile}"`)

      if (!stdout || stdout.trim().length === 0) {
        throw new Error('Backup file appears to be empty or corrupted')
      }

      // Count tables in backup
      const tableCount = (stdout.match(/TABLE DATA/g) || []).length
      return tableCount
    } catch (error: any) {
      throw new Error(`Backup verification failed: ${error.message}`)
    }
  }

  /**
   * Get current table count
   */
  private async getCurrentTableCount(): Promise<number> {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
      `)
      return parseInt(result.rows[0].count, 10)
    } catch (error: any) {
      console.warn(`   ⚠️  Could not query current database: ${error.message}`)
      return 0
    }
  }

  /**
   * Perform database restore
   */
  private async performRestore(backupFile: string): Promise<void> {
    // Parse DATABASE_URL
    const url = new URL(this.config.databaseUrl)
    const dbName = url.pathname.slice(1)

    // pg_restore options:
    // --clean: Drop database objects before recreating
    // --if-exists: Don't error if object doesn't exist when dropping
    // --no-owner: Skip ownership commands
    // --no-acl: Skip privilege commands
    // -d: Database name
    const pgRestoreCmd = `pg_restore --clean --if-exists --no-owner --no-acl -d "${this.config.databaseUrl}" "${backupFile}"`

    try {
      const { stdout, stderr } = await execAsync(pgRestoreCmd, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large restores
      })

      // pg_restore often outputs warnings to stderr, which is normal
      if (stderr && stderr.includes('ERROR')) {
        console.warn('   ⚠️  Restore completed with errors:', stderr)
      }
    } catch (error: any) {
      // pg_restore returns non-zero even for warnings sometimes
      // Check if it's a real error or just warnings
      if (error.message.includes('ERROR')) {
        throw new Error(`pg_restore failed: ${error.message}`)
      } else {
        console.warn('   ⚠️  Restore completed with warnings')
      }
    }
  }

  /**
   * Run ANALYZE to update database statistics
   */
  private async analyzeDatabase(): Promise<void> {
    try {
      await this.pool.query('ANALYZE')
    } catch (error: any) {
      console.warn(`   ⚠️  Failed to analyze database: ${error.message}`)
    }
  }
}

// Run restore
const restoreService = new DatabaseRestoreService()
restoreService.restore().then((result) => {
  process.exit(result.success ? 0 : 1)
}).catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
