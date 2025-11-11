/**
 * MongoDB Backup Script
 * Creates compressed backups of MongoDB collections
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

interface BackupConfig {
  uri: string
  database: string
  backupDir: string
  retentionDays: number
  s3Bucket?: string
  s3Region?: string
}

const config: BackupConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://admin:dev_password_change_in_prod@localhost:27017/clientforge_logs?authSource=admin',
  database: process.env.MONGO_DB_NAME || 'clientforge_logs',
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../backups/mongodb'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
  s3Bucket: process.env.BACKUP_S3_BUCKET,
  s3Region: process.env.BACKUP_S3_REGION || 'us-east-1',
}

/**
 * Create MongoDB backup
 */
async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
  const backupDir = path.join(config.backupDir, `${timestamp}-${time}`)
  const archiveFile = `${backupDir}.tar.gz`

  console.log(`[${new Date().toISOString()}] Starting MongoDB backup...`)
  console.log(`Database: ${config.database}`)
  console.log(`Backup dir: ${backupDir}`)

  try {
    // Ensure backup directory exists
    await fs.mkdir(config.backupDir, { recursive: true })

    // Create backup with mongodump
    const dumpCommand = `mongodump --uri="${config.uri}" --out="${backupDir}" --gzip`

    await execAsync(dumpCommand, { maxBuffer: 1024 * 1024 * 100 }) // 100MB buffer

    // Create tar.gz archive
    const tarCommand = `tar -czf "${archiveFile}" -C "${config.backupDir}" "${path.basename(backupDir)}"`
    await execAsync(tarCommand)

    // Remove temp directory
    await fs.rm(backupDir, { recursive: true, force: true })

    // Get archive size
    const stats = await fs.stat(archiveFile)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)

    console.log(`✅ Backup created successfully`)
    console.log(`   File: ${archiveFile}`)
    console.log(`   Size: ${sizeMB} MB`)

    return archiveFile
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

  const fileName = path.basename(backupFile)
  const s3Path = `mongodb/${new Date().toISOString().split('T')[0]}/${fileName}`

  try {
    const uploadCommand = `aws s3 cp "${backupFile}" "s3://${config.s3Bucket}/${s3Path}" --region ${config.s3Region}`
    await execAsync(uploadCommand)

    console.log(`✅ Uploaded to S3: s3://${config.s3Bucket}/${s3Path}`)
  } catch (error: any) {
    console.error(`❌ S3 upload failed:`, error.message)
    console.error(`   Backup is still available locally: ${backupFile}`)
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
      if (!file.endsWith('.tar.gz')) continue

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
  }
}

/**
 * Main backup process
 */
async function main() {
  console.log('='.repeat(60))
  console.log('MongoDB Backup Script')
  console.log('='.repeat(60))

  try {
    const backupFile = await createBackup()
    await uploadToS3(backupFile)
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

main()
