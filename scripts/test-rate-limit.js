/**
 * Test Rate Limiting
 * Makes multiple login attempts to verify rate limiting is working
 */

const http = require('http')

async function makeLoginRequest(attempt) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      email: 'test@test.com',
      password: 'wrong',
    })

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }

    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        resolve({
          attempt,
          status: res.statusCode,
          rateLimitRemaining: res.headers['x-ratelimit-remaining'],
          rateLimitLimit: res.headers['x-ratelimit-limit'],
        })
      })
    })

    req.on('error', (error) => {
      resolve({ attempt, error: error.message })
    })

    req.write(data)
    req.end()
  })
}

async function testRateLimiting() {
  console.log('🔄 Testing rate limiting on auth endpoint...\n')
  console.log('Expected: First 5 attempts should return 401 (invalid credentials)')
  console.log('          6th attempt should return 429 (rate limit exceeded)\n')

  const results = []

  for (let i = 1; i <= 7; i++) {
    const result = await makeLoginRequest(i)
    results.push(result)

    const status = result.status === 401 ? '401 Unauthorized' :
                   result.status === 429 ? '429 Too Many Requests' :
                   result.status

    const remaining = result.rateLimitRemaining !== undefined ?
                      ` (${result.rateLimitRemaining} remaining)` : ''

    console.log(`Attempt ${i}: ${status}${remaining}`)

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n' + '='.repeat(60))
  const rateLimited = results.filter(r => r.status === 429).length
  const unauthorized = results.filter(r => r.status === 401).length

  if (rateLimited > 0) {
    console.log('✅ Rate limiting is WORKING')
    console.log(`   - ${unauthorized} unauthorized attempts`)
    console.log(`   - ${rateLimited} rate limited attempts`)
  } else {
    console.log('⚠️  Rate limiting may not be working')
    console.log('   - No 429 responses received')
  }
  console.log('='.repeat(60))
}

testRateLimiting()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
