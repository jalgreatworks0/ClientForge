/**
 * PostgreSQL Backup Script
 * Creates compressed backups and optionally uploads to S3/R2
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

interface BackupConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  backupDir: string
  retentionDays: number
  s3Bucket?: string
  s3Region?: string
}

const config: BackupConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'clientforge_crm',
  username: process.env.DB_USER || 'crm_admin',
  password: process.env.DB_PASSWORD || 'dev_password_change_in_prod',
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../backups/postgres'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  s3Bucket: process.env.BACKUP_S3_BUCKET,
  s3Region: process.env.BACKUP_S3_REGION || 'us-east-1',
}

/**
 * Create PostgreSQL backup
 */
async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
  const backupFile = path.join(config.backupDir, `clientforge-${timestamp}-${time}.sql.gz`)

  console.log(`[${new Date().toISOString()}] Starting PostgreSQL backup...`)
  console.log(`Database: ${config.database}`)
  console.log(`Backup file: ${backupFile}`)

  // Ensure backup directory exists
  await fs.mkdir(config.backupDir, { recursive: true })

  // Set password via environment variable for pg_dump
  const env = {
    ...process.env,
    PGPASSWORD: config.password,
  }

  // Create backup with pg_dump
  const dumpCommand = `pg_dump -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} --format=plain --no-owner --no-acl | gzip > "${backupFile}"`

  try {
    await execAsync(dumpCommand, { env, maxBuffer: 1024 * 1024 * 100 }) // 100MB buffer

    // Verify backup was created
    const stats = await fs.stat(backupFile)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)

    console.log(`✅ Backup created successfully`)
    console.log(`   File: ${backupFile}`)
    console.log(`   Size: ${sizeMB} MB`)

    return backupFile
  } catch (error: any) {
    console.error(`❌ Backup failed:`, error.message)
    throw error
  }
}

/**
 * Upload backup to S3/R2 (if configured)
 */
async function uploadToS3(backupFile: string): Promise<void> {
  if (!config.s3Bucket) {
    console.log('ℹ️  S3 upload skipped (BACKUP_S3_BUCKET not configured)')
    return
  }

  console.log(`\n[${new Date().toISOString()}] Uploading to S3...`)
  console.log(`Bucket: ${config.s3Bucket}`)

  const fileName = path.basename(backupFile)
  const s3Path = `postgres/${new Date().toISOString().split('T')[0]}/${fileName}`

  try {
    // Use AWS CLI for upload (works with R2 via S3 compatibility)
    const uploadCommand = `aws s3 cp "${backupFile}" "s3://${config.s3Bucket}/${s3Path}" --region ${config.s3Region}`

    await execAsync(uploadCommand)

    console.log(`✅ Uploaded to S3: s3://${config.s3Bucket}/${s3Path}`)
  } catch (error: any) {
    console.error(`❌ S3 upload failed:`, error.message)
    console.error(`   Backup is still available locally: ${backupFile}`)
    // Don't throw - local backup is still valid
  }
}

/**
 * Clean up old backups
 */
async function cleanupOldBackups(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] Cleaning up old backups...`)
  console.log(`Retention: ${config.retentionDays} days`)

  try {
    const files = await fs.readdir(config.backupDir)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays)

    let deletedCount = 0

    for (const file of files) {
      if (!file.endsWith('.sql.gz')) continue

      const filePath = path.join(config.backupDir, file)
      const stats = await fs.stat(filePath)

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath)
        deletedCount++
        console.log(`   Deleted: ${file}`)
      }
    }

    if (deletedCount === 0) {
      console.log(`   No old backups to delete`)
    } else {
      console.log(`✅ Deleted ${deletedCount} old backup(s)`)
    }
  } catch (error: any) {
    console.error(`⚠️  Cleanup failed:`, error.message)
    // Don't throw - cleanup failure shouldn't fail the backup
  }
}

/**
 * Main backup process
 */
async function main() {
  console.log('='.repeat(60))
  console.log('PostgreSQL Backup Script')
  console.log('='.repeat(60))

  try {
    // 1. Create backup
    const backupFile = await createBackup()

    // 2. Upload to S3 (if configured)
    await uploadToS3(backupFile)

    // 3. Clean up old backups
    await cleanupOldBackups()

    console.log('\n' + '='.repeat(60))
    console.log('✅ Backup completed successfully!')
    console.log('='.repeat(60))
    process.exit(0)
  } catch (error: any) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ Backup failed!')
    console.error('='.repeat(60))
    console.error(error)
    process.exit(1)
  }
}

// Run backup
main()
