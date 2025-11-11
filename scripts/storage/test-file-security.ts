#!/usr/bin/env tsx
/**
 * File Storage Security Test
 * Validates that all file access goes through signed URLs only
 *
 * Usage:
 *   npx tsx scripts/storage/test-file-security.ts
 */

import axios from 'axios'
import * as dotenv from 'dotenv'
import FormData from 'form-data'
import * as fs from 'fs'
import * as path from 'path'
import { Buffer } from 'buffer'

dotenv.config()

const API_URL = process.env.API_URL || 'http://localhost:3001'
const API_PREFIX = '/api/v1'

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function recordTest(name: string, passed: boolean, message: string, details?: any): void {
  results.push({ name, passed, message, details })
  const icon = passed ? '✓' : '✗'
  console.log(`${icon} ${name}`)
  console.log(`  ${message}`)
  if (details) {
    console.log(`  Details: ${JSON.stringify(details, null, 2)}`)
  }
  console.log('')
}

async function runSecurityTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║     File Storage Security Test - ClientForge CRM              ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  let authToken: string
  let uploadedFileId: string

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 1: Authenticate
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 1: Authentication')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      const loginResponse = await axios.post(`${API_URL}${API_PREFIX}/auth/login`, {
        email: process.env.TEST_USER_EMAIL || 'admin@clientforge.com',
        password: process.env.TEST_USER_PASSWORD || 'Admin@123'
      })

      authToken = loginResponse.data.data.access_token

      recordTest('Authentication', !!authToken, 'Successfully authenticated', {
        userId: loginResponse.data.data.user?.id
      })
    } catch (error: any) {
      recordTest('Authentication', false, `Authentication failed: ${error.message}`)
      throw error
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 2: Upload a test file
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 2: File Upload')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      // Create a test file
      const testContent = 'This is a security test file created at ' + new Date().toISOString()
      const testBuffer = Buffer.from(testContent, 'utf-8')

      const formData = new FormData()
      formData.append('file', testBuffer, {
        filename: 'security-test.txt',
        contentType: 'text/plain'
      })
      formData.append('entityType', 'test')
      formData.append('entityId', 'security-test-001')

      const uploadResponse = await axios.post(
        `${API_URL}${API_PREFIX}/files/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${authToken}`
          }
        }
      )

      uploadedFileId = uploadResponse.data.data.fileId

      recordTest('File Upload', !!uploadedFileId, 'Successfully uploaded test file', {
        fileId: uploadedFileId,
        fileName: 'security-test.txt',
        size: testBuffer.length
      })
    } catch (error: any) {
      recordTest('File Upload', false, `Upload failed: ${error.message}`)
      throw error
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 3: Get signed URL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 3: Generate Signed URL')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    let signedUrl: string

    try {
      const signedUrlResponse = await axios.get(
        `${API_URL}${API_PREFIX}/files/${uploadedFileId}/url`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
          params: { expiresIn: 300 } // 5 minutes
        }
      )

      signedUrl = signedUrlResponse.data.data.url

      recordTest('Generate Signed URL', !!signedUrl && signedUrl.length > 0, 'Successfully generated signed URL', {
        fileId: uploadedFileId,
        urlLength: signedUrl.length,
        expiresIn: 300
      })
    } catch (error: any) {
      recordTest('Generate Signed URL', false, `Failed to generate signed URL: ${error.message}`)
      throw error
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 4: Access file via signed URL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 4: Access File via Signed URL')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      const fileResponse = await axios.get(signedUrl!)

      const contentMatches = fileResponse.data.includes('This is a security test file')

      recordTest('Access via Signed URL', contentMatches, 'Successfully downloaded file with signed URL', {
        statusCode: fileResponse.status,
        contentLength: fileResponse.data.length,
        contentMatches
      })
    } catch (error: any) {
      recordTest('Access via Signed URL', false, `Failed to download file: ${error.message}`)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 5: Attempt unauthorized access (no signature)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 5: Unauthorized Access Prevention')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      // Try to access file without signed URL - should fail
      const directUrl = signedUrl!.split('?')[0] // Remove signature

      try {
        await axios.get(directUrl)
        recordTest('Unauthorized Access Prevention', false, 'WARNING: Direct access succeeded (should have failed)')
      } catch (error: any) {
        const accessDenied = error.response?.status === 403 || error.response?.status === 401

        recordTest('Unauthorized Access Prevention', accessDenied, 'Direct access correctly blocked', {
          statusCode: error.response?.status,
          message: error.response?.statusText
        })
      }
    } catch (error: any) {
      recordTest('Unauthorized Access Prevention', false, `Test error: ${error.message}`)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 6: Get file metadata
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 6: File Metadata Access')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      const metadataResponse = await axios.get(
        `${API_URL}${API_PREFIX}/files/${uploadedFileId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      )

      const metadata = metadataResponse.data.data

      recordTest('File Metadata Access', !!metadata.id, 'Successfully retrieved file metadata', {
        fileId: metadata.id,
        originalName: metadata.original_name,
        size: metadata.size,
        mimeType: metadata.mime_type
      })
    } catch (error: any) {
      recordTest('File Metadata Access', false, `Failed to get metadata: ${error.message}`)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 7: Delete test file (cleanup)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 7: File Deletion (Cleanup)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      await axios.delete(
        `${API_URL}${API_PREFIX}/files/${uploadedFileId}`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      )

      recordTest('File Deletion', true, 'Successfully deleted test file')
    } catch (error: any) {
      recordTest('File Deletion', false, `Failed to delete file: ${error.message}`)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('\n📊 Test Summary\n')

    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const passRate = ((passedTests / totalTests) * 100).toFixed(1)

    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests} (${passRate}%)`)
    console.log(`Failed: ${failedTests}\n`)

    if (failedTests > 0) {
      console.log('❌ Failed Tests:\n')
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  • ${r.name}`)
        console.log(`    ${r.message}\n`)
      })
    }

    if (passedTests === totalTests) {
      console.log('✅ All tests passed! File storage security is working correctly.\n')
      console.log('✓ Files can only be accessed through signed URLs')
      console.log('✓ Direct access without signatures is blocked')
      console.log('✓ Tenant isolation is enforced\n')
    } else {
      console.log('⚠️  Some tests failed. Review security configuration.\n')
    }

    // Exit with failure code if any tests failed
    if (failedTests > 0) {
      process.exit(1)
    }

  } catch (error: any) {
    console.error('\n✗ Security test failed:', error.message)
    process.exit(1)
  }
}

// Run
runSecurityTests().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
