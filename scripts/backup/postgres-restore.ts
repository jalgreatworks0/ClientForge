/**
 * PostgreSQL Restore Script
 * Restores database from backup file
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as readline from 'readline/promises'

const execAsync = promisify(exec)

interface RestoreConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  backupDir: string
}

const config: RestoreConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'clientforge_crm',
  username: process.env.DB_USER || 'crm_admin',
  password: process.env.DB_PASSWORD || 'dev_password_change_in_prod',
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../backups/postgres'),
}

/**
 * List available backups
 */
async function listBackups(): Promise<string[]> {
  try {
    const files = await fs.readdir(config.backupDir)
    const backups = files
      .filter(f => f.endsWith('.sql.gz'))
      .sort()
      .reverse() // Most recent first

    return backups
  } catch (error) {
    console.error(`❌ Failed to list backups:`, error)
    return []
  }
}

/**
 * Restore from backup file
 */
async function restoreBackup(backupFile: string): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] Starting PostgreSQL restore...`)
  console.log(`Backup file: ${backupFile}`)
  console.log(`Database: ${config.database}`)

  // Set password via environment variable
  const env = {
    ...process.env,
    PGPASSWORD: config.password,
  }

  try {
    // Verify backup file exists
    await fs.access(backupFile)

    // Get table count before restore
    const beforeCommand = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"`
    const before = await execAsync(beforeCommand, { env })
    const tablesBefore = parseInt(before.stdout.trim())

    console.log(`\n⚠️  WARNING: This will OVERWRITE the current database!`)
    console.log(`Current database has ${tablesBefore} tables`)

    // Restore database
    const restoreCommand = `gunzip < "${backupFile}" | psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database}`

    console.log(`\n🔄 Restoring database...`)
    await execAsync(restoreCommand, { env, maxBuffer: 1024 * 1024 * 100 }) // 100MB buffer

    // Get table count after restore
    const afterCommand = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"`
    const after = await execAsync(afterCommand, { env })
    const tablesAfter = parseInt(after.stdout.trim())

    console.log(`\n✅ Restore completed successfully!`)
    console.log(`   Tables in database: ${tablesAfter}`)

    // Run ANALYZE to update statistics
    console.log(`\n🔄 Running ANALYZE to update statistics...`)
    const analyzeCommand = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} -c "ANALYZE"`
    await execAsync(analyzeCommand, { env })

    console.log(`✅ Database statistics updated`)
  } catch (error: any) {
    console.error(`\n❌ Restore failed:`, error.message)
    throw error
  }
}

/**
 * Main restore process
 */
async function main() {
  console.log('='.repeat(60))
  console.log('PostgreSQL Restore Script')
  console.log('='.repeat(60))

  try {
    // Check if backup file was provided as argument
    const backupFile = process.argv[2]

    if (backupFile) {
      // Use provided backup file
      const fullPath = path.isAbsolute(backupFile)
        ? backupFile
        : path.join(config.backupDir, backupFile)

      await restoreBackup(fullPath)
    } else {
      // List available backups
      console.log('\nAvailable backups:')
      const backups = await listBackups()

      if (backups.length === 0) {
        console.log('   No backups found')
        process.exit(1)
      }

      backups.forEach((backup, index) => {
        console.log(`   ${index + 1}. ${backup}`)
      })

      // Prompt for selection
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      const answer = await rl.question('\nSelect backup number (or "latest" for most recent): ')
      rl.close()

      let selectedBackup: string

      if (answer.toLowerCase() === 'latest' || answer === '1') {
        selectedBackup = backups[0]
      } else {
        const index = parseInt(answer) - 1
        if (index < 0 || index >= backups.length) {
          console.error('❌ Invalid selection')
          process.exit(1)
        }
        selectedBackup = backups[index]
      }

      const fullPath = path.join(config.backupDir, selectedBackup)
      await restoreBackup(fullPath)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Restore completed successfully!')
    console.log('='.repeat(60))
    process.exit(0)
  } catch (error: any) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ Restore failed!')
    console.error('='.repeat(60))
    console.error(error)
    process.exit(1)
  }
}

// Run restore
main()
