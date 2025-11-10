/**
 * K6 Load Testing Script - Authentication Endpoints
 * Tests login, token refresh, and session management under load
 *
 * Usage:
 *   k6 run tests/load/auth-load-test.js
 *   k6 run --vus 100 --duration 1m tests/load/auth-load-test.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate')
const loginDuration = new Trend('login_duration')
const rateLimitErrors = new Counter('rate_limit_errors')
const authErrors = new Counter('auth_errors')

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 50 },  // Increase to 50 users
    { duration: '30s', target: 100 }, // Peak at 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],

  thresholds: {
    // 95% of requests should be below 500ms
    http_req_duration: ['p(95)<500'],

    // 99% of requests should be below 1500ms
    'http_req_duration{expected_response:true}': ['p(99)<1500'],

    // Request failure rate should be below 1%
    http_req_failed: ['rate<0.01'],

    // Login success rate should be above 99%
    login_success_rate: ['rate>0.99'],

    // Login duration p95 should be below 200ms
    login_duration: ['p(95)<200'],
  },

  // Don't throw errors on failed HTTP requests
  noConnectionReuse: false,

  // User-defined tags
  tags: {
    test_type: 'load',
    service: 'auth',
  },
}

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1'

// Test data
const MASTER_CREDENTIALS = {
  email: __ENV.MASTER_EMAIL || 'master@clientforge.io',
  password: __ENV.MASTER_PASSWORD || 'Admin123',
}

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('🚀 Starting load test...')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`VUs: ${__VU}`)

  // Verify server is responsive
  const healthCheck = http.get(`${BASE_URL}/health`)

  if (healthCheck.status !== 200) {
    throw new Error(`Server not healthy: ${healthCheck.status}`)
  }

  console.log('✅ Server health check passed')

  return {
    startTime: new Date().toISOString(),
  }
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  // Each VU represents a different user session

  group('Authentication Flow', () => {
    // 1. Login
    const loginRes = login()

    if (!loginRes) {
      sleep(1)
      return
    }

    const { accessToken, refreshToken } = loginRes

    sleep(1) // Simulate user think time

    // 2. Verify token with protected endpoint
    group('Protected Endpoint Access', () => {
      const analyticsRes = http.get(`${BASE_URL}/analytics/summary`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      check(analyticsRes, {
        'protected endpoint accessible': (r) => r.status === 200,
        'response time acceptable': (r) => r.timings.duration < 500,
      })
    })

    sleep(2) // Simulate user activity

    // 3. Refresh token
    group('Token Refresh', () => {
      const refreshRes = http.post(
        `${BASE_URL}/auth/refresh`,
        JSON.stringify({ refreshToken }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )

      check(refreshRes, {
        'token refresh successful': (r) => r.status === 200,
        'new token returned': (r) => {
          const body = JSON.parse(r.body || '{}')
          return body.data && body.data.accessToken
        },
      })
    })

    sleep(1)

    // 4. Logout
    group('Logout', () => {
      const logoutRes = http.post(
        `${BASE_URL}/auth/logout`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      check(logoutRes, {
        'logout successful': (r) => r.status === 200,
      })
    })
  })

  // Random sleep between iterations (0.5-2 seconds)
  sleep(Math.random() * 1.5 + 0.5)
}

/**
 * Login function
 */
function login() {
  const startTime = Date.now()

  const payload = JSON.stringify(MASTER_CREDENTIALS)

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  })

  const duration = Date.now() - startTime
  loginDuration.add(duration)

  // Check response
  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has tokens': (r) => {
      try {
        const body = JSON.parse(r.body || '{}')
        return body.data && body.data.accessToken && body.data.refreshToken
      } catch {
        return false
      }
    },
    'login response time < 500ms': (r) => r.timings.duration < 500,
  })

  loginSuccessRate.add(success)

  // Track specific error types
  if (res.status === 429) {
    rateLimitErrors.add(1)
    console.warn('⚠️  Rate limit hit')
    return null
  }

  if (res.status === 401 || res.status === 403) {
    authErrors.add(1)
    console.warn(`⚠️  Auth error: ${res.status}`)
    return null
  }

  if (res.status !== 200) {
    console.error(`❌ Login failed: ${res.status} ${res.body}`)
    return null
  }

  try {
    const body = JSON.parse(res.body)
    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      user: body.data.user,
    }
  } catch (error) {
    console.error('❌ Failed to parse login response:', error)
    return null
  }
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('\n📊 Test Summary:')
  console.log(`Started: ${data.startTime}`)
  console.log(`Ended: ${new Date().toISOString()}`)
  console.log('\n✅ Load test complete!')
}

/**
 * Handle summary - custom results formatting
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  }
}

/**
 * Generate text summary
 */
function textSummary(data, options = {}) {
  const indent = options.indent || ''
  const enableColors = options.enableColors !== false

  let summary = '\n'
  summary += indent + '═══════════════════════════════════════════════\n'
  summary += indent + '            LOAD TEST RESULTS                  \n'
  summary += indent + '═══════════════════════════════════════════════\n\n'

  // Metrics
  const metrics = data.metrics

  if (metrics.http_req_duration) {
    summary += indent + '⏱️  Request Duration:\n'
    summary += indent + `  - Avg:  ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`
    summary += indent + `  - Min:  ${metrics.http_req_duration.values.min.toFixed(2)}ms\n`
    summary += indent + `  - Max:  ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`
    summary += indent + `  - p95:  ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`
    summary += indent + `  - p99:  ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`
  }

  if (metrics.http_reqs) {
    summary += indent + '📈 HTTP Requests:\n'
    summary += indent + `  - Total:  ${metrics.http_reqs.values.count}\n`
    summary += indent + `  - Rate:   ${metrics.http_reqs.values.rate.toFixed(2)}/s\n\n`
  }

  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2)
    summary += indent + '❌ Failed Requests:\n'
    summary += indent + `  - Rate: ${failRate}%\n\n`
  }

  if (metrics.login_success_rate) {
    const successRate = (metrics.login_success_rate.values.rate * 100).toFixed(2)
    summary += indent + '✅ Login Success Rate:\n'
    summary += indent + `  - Rate: ${successRate}%\n\n`
  }

  if (metrics.rate_limit_errors && metrics.rate_limit_errors.values.count > 0) {
    summary += indent + '⚠️  Rate Limit Errors:\n'
    summary += indent + `  - Count: ${metrics.rate_limit_errors.values.count}\n\n`
  }

  summary += indent + '═══════════════════════════════════════════════\n'

  return summary
}
