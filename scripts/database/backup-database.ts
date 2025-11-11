#!/usr/bin/env tsx
/**
 * Database Backup Script
 * Performs automated backups of PostgreSQL database with rotation policy
 *
 * Features:
 * - Full pg_dump with custom format (best compression + restoration)
 * - Automatic retention policy (keeps last N backups)
 * - Backup verification
 * - Detailed logging
 * - Support for both local and remote storage
 *
 * Usage:
 *   npx tsx scripts/database/backup-database.ts
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   BACKUP_DIR - Backup directory (default: ./backups)
 *   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 7)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const execAsync = promisify(exec)

interface BackupConfig {
  databaseUrl: string
  backupDir: string
  retentionDays: number
  compressionLevel: number
}

interface BackupResult {
  success: boolean
  backupFile: string
  size: number
  duration: number
  error?: string
}

class DatabaseBackupService {
  private config: BackupConfig

  constructor() {
    this.config = {
      databaseUrl: process.env.DATABASE_URL || '',
      backupDir: process.env.BACKUP_DIR || path.join(process.cwd(), 'backups', 'database'),
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
      compressionLevel: 9, // Maximum compression
    }
  }

  /**
   * Perform database backup
   */
  async backup(): Promise<BackupResult> {
    console.log('╔════════════════════════════════════════════════════════════════╗')
    console.log('║     Database Backup - ClientForge CRM                         ║')
    console.log('╚════════════════════════════════════════════════════════════════╝\n')

    const startTime = Date.now()

    try {
      // Validate configuration
      this.validateConfig()

      // Ensure backup directory exists
      await this.ensureBackupDirectory()

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = path.join(this.config.backupDir, `backup-${timestamp}.dump`)

      console.log(`📁 Backup Directory: ${this.config.backupDir}`)
      console.log(`📝 Backup File: ${path.basename(backupFile)}`)
      console.log(`⏱️  Retention: ${this.config.retentionDays} days\n`)

      // Perform backup
      console.log('1. Starting database backup...')
      await this.performBackup(backupFile)

      // Verify backup
      console.log('\n2. Verifying backup integrity...')
      await this.verifyBackup(backupFile)

      // Get backup file size
      const stats = await fs.stat(backupFile)
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.log(`   ✓ Backup size: ${sizeMB} MB`)

      // Clean up old backups
      console.log('\n3. Cleaning up old backups...')
      const deletedCount = await this.cleanupOldBackups()
      console.log(`   ✓ Deleted ${deletedCount} old backup(s)`)

      // List current backups
      console.log('\n4. Current backups:')
      await this.listBackups()

      const duration = Date.now() - startTime
      const durationSec = (duration / 1000).toFixed(2)

      console.log('\n═══════════════════════════════════════════════════════════════')
      console.log(`\n✅ Backup completed successfully in ${durationSec}s\n`)
      console.log(`   File: ${backupFile}`)
      console.log(`   Size: ${sizeMB} MB\n`)

      return {
        success: true,
        backupFile,
        size: stats.size,
        duration,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('\n✗ Backup failed:', error.message)

      return {
        success: false,
        backupFile: '',
        size: 0,
        duration,
        error: error.message,
      }
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // Parse DATABASE_URL to validate format
    try {
      const url = new URL(this.config.databaseUrl)
      if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
        throw new Error('Invalid DATABASE_URL protocol')
      }
    } catch (error: any) {
      throw new Error(`Invalid DATABASE_URL format: ${error.message}`)
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.config.backupDir)
    } catch {
      await fs.mkdir(this.config.backupDir, { recursive: true })
      console.log(`✓ Created backup directory: ${this.config.backupDir}\n`)
    }
  }

  /**
   * Perform pg_dump backup
   */
  private async performBackup(backupFile: string): Promise<void> {
    // Use custom format (-Fc) for best compression and selective restoration
    // --no-owner: Don't output commands to set ownership
    // --no-acl: Don't output commands to set privileges
    // -Z: Compression level (0-9)
    const pgDumpCmd = `pg_dump "${this.config.databaseUrl}" -Fc -Z ${this.config.compressionLevel} --no-owner --no-acl -f "${backupFile}"`

    try {
      const { stdout, stderr } = await execAsync(pgDumpCmd)

      if (stderr && !stderr.includes('WARNING')) {
        console.warn('   ⚠️  pg_dump warnings:', stderr)
      }

      console.log('   ✓ Database backup completed')
    } catch (error: any) {
      throw new Error(`pg_dump failed: ${error.message}`)
    }
  }

  /**
   * Verify backup integrity using pg_restore --list
   */
  private async verifyBackup(backupFile: string): Promise<void> {
    try {
      // pg_restore --list reads the TOC (Table of Contents) without restoring
      const { stdout } = await execAsync(`pg_restore --list "${backupFile}"`)

      // Check if TOC has content
      if (!stdout || stdout.trim().length === 0) {
        throw new Error('Backup file appears to be empty or corrupted')
      }

      // Count tables in backup
      const tableCount = (stdout.match(/TABLE DATA/g) || []).length
      console.log(`   ✓ Backup verified (${tableCount} tables)`)
    } catch (error: any) {
      throw new Error(`Backup verification failed: ${error.message}`)
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<number> {
    try {
      const files = await fs.readdir(this.config.backupDir)
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.dump'))

      // Get file stats with creation time
      const filesWithStats = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.config.backupDir, file)
          const stats = await fs.stat(filePath)
          return { file, filePath, mtime: stats.mtime }
        })
      )

      // Calculate cutoff date
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

      // Delete old backups
      const toDelete = filesWithStats.filter(f => f.mtime < cutoffDate)

      for (const { filePath, file } of toDelete) {
        await fs.unlink(filePath)
        console.log(`   - Deleted: ${file}`)
      }

      return toDelete.length
    } catch (error: any) {
      console.warn(`   ⚠️  Failed to clean up old backups: ${error.message}`)
      return 0
    }
  }

  /**
   * List current backups
   */
  private async listBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.backupDir)
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.dump'))

      if (backupFiles.length === 0) {
        console.log('   (no backups found)')
        return
      }

      // Get file stats
      const filesWithStats = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.config.backupDir, file)
          const stats = await fs.stat(filePath)
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
          return { file, mtime: stats.mtime, sizeMB }
        })
      )

      // Sort by modification time (newest first)
      filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

      // Display backups
      for (const { file, mtime, sizeMB } of filesWithStats) {
        const ageHours = Math.floor((Date.now() - mtime.getTime()) / (1000 * 60 * 60))
        const ageDays = Math.floor(ageHours / 24)
        const ageStr = ageDays > 0 ? `${ageDays}d ${ageHours % 24}h` : `${ageHours}h`
        console.log(`   - ${file} (${sizeMB} MB, ${ageStr} old)`)
      }
    } catch (error: any) {
      console.warn(`   ⚠️  Failed to list backups: ${error.message}`)
    }
  }
}

// Run backup
const backupService = new DatabaseBackupService()
backupService.backup().then((result) => {
  process.exit(result.success ? 0 : 1)
}).catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
