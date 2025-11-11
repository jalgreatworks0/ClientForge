/**
 * k6 Load Test Script
 * Performance baseline and budget gate tests for ClientForge CRM
 *
 * Usage:
 *   k6 run tests/performance/k6-load-test.js
 *   k6 run --vus 10 --duration 30s tests/performance/k6-load-test.js
 *   k6 run --out json=test-results.json tests/performance/k6-load-test.js
 *   k6 run --out html=report.html tests/performance/k6-load-test.js
 *
 * Thresholds (Budget Gates):
 * - p95 response time < 500ms
 * - p99 response time < 1000ms
 * - Error rate < 1%
 * - Request rate > 100 RPS
 */

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const apiResponseTime = new Trend('api_response_time')
const authResponseTime = new Trend('auth_response_time')
const searchResponseTime = new Trend('search_response_time')
const requestCounter = new Counter('requests')

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users for 1 minute
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users for 2 minutes
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],

  thresholds: {
    // Budget gates - FAIL if these are exceeded
    'http_req_duration{type:api}': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_duration{type:auth}': ['p(95)<1000', 'p(99)<2000'], // Auth can be slightly slower
    'http_req_duration{type:search}': ['p(95)<800', 'p(99)<1500'], // Search tolerance
    'errors': ['rate<0.01'], // Error rate < 1%
    'http_req_failed': ['rate<0.01'], // Failed request rate < 1%
    'http_reqs': ['rate>100'], // Minimum 100 requests per second
  },

  // HTTP configuration
  http: {
    userAgent: 'k6-load-test/1.0',
    timeout: '10s',
  },
}

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const API_BASE = `${BASE_URL}/api/v1`

// Test data
const TEST_USERS = [
  { email: 'user1@test.com', password: 'Test123!@#' },
  { email: 'user2@test.com', password: 'Test123!@#' },
  { email: 'user3@test.com', password: 'Test123!@#' },
]

/**
 * Setup function - runs once at the start
 */
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`)
  console.log('Test stages:', JSON.stringify(options.stages))

  // Verify server is up
  const healthCheck = http.get(`${BASE_URL}/health`)
  if (healthCheck.status !== 200) {
    throw new Error(`Server is not healthy: ${healthCheck.status}`)
  }

  console.log('Server health check passed')
  return { startTime: new Date().toISOString() }
}

/**
 * Main test function - runs for each virtual user
 */
export default function (data) {
  // Select a random test user
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)]
  let authToken = null

  // Group 1: Authentication Flow
  group('Authentication', () => {
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    })

    const loginRes = http.post(`${API_BASE}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'auth' },
    })

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login returns token': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.data && body.data.token
        } catch (e) {
          return false
        }
      },
    })

    if (loginSuccess) {
      const body = JSON.parse(loginRes.body)
      authToken = body.data.token
    }

    authResponseTime.add(loginRes.timings.duration)
    errorRate.add(!loginSuccess)
    requestCounter.add(1)
  })

  // Only continue if authentication succeeded
  if (!authToken) {
    errorRate.add(1)
    sleep(1)
    return
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  }

  // Group 2: Contacts API
  group('Contacts API', () => {
    // List contacts
    const listRes = http.get(`${API_BASE}/contacts?limit=20`, {
      headers,
      tags: { type: 'api', endpoint: 'contacts-list' },
    })

    check(listRes, {
      'contacts list status is 200': (r) => r.status === 200,
      'contacts list has data': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.success && Array.isArray(body.data)
        } catch (e) {
          return false
        }
      },
    })

    apiResponseTime.add(listRes.timings.duration)
    requestCounter.add(1)

    sleep(0.5)

    // Get single contact (if any exist)
    const listBody = JSON.parse(listRes.body)
    if (listBody.data && listBody.data.length > 0) {
      const contactId = listBody.data[0].id

      const getRes = http.get(`${API_BASE}/contacts/${contactId}`, {
        headers,
        tags: { type: 'api', endpoint: 'contacts-get' },
      })

      check(getRes, {
        'contact get status is 200': (r) => r.status === 200,
      })

      apiResponseTime.add(getRes.timings.duration)
      requestCounter.add(1)
    }
  })

  sleep(1)

  // Group 3: Deals API
  group('Deals API', () => {
    const listRes = http.get(`${API_BASE}/deals?limit=20`, {
      headers,
      tags: { type: 'api', endpoint: 'deals-list' },
    })

    check(listRes, {
      'deals list status is 200': (r) => r.status === 200,
    })

    apiResponseTime.add(listRes.timings.duration)
    requestCounter.add(1)
  })

  sleep(1)

  // Group 4: Search API
  group('Search API', () => {
    const searchQueries = ['test', 'john', 'acme', 'deal', 'contact']
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)]

    const searchRes = http.get(`${API_BASE}/search?q=${query}&limit=10`, {
      headers,
      tags: { type: 'search' },
    })

    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search returns results': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.success && body.data
        } catch (e) {
          return false
        }
      },
    })

    searchResponseTime.add(searchRes.timings.duration)
    requestCounter.add(1)
  })

  sleep(1)

  // Group 5: Dashboard/Analytics
  group('Analytics API', () => {
    const analyticsRes = http.get(`${API_BASE}/analytics/dashboard`, {
      headers,
      tags: { type: 'api', endpoint: 'analytics-dashboard' },
    })

    check(analyticsRes, {
      'analytics status is 200': (r) => r.status === 200,
    })

    apiResponseTime.add(analyticsRes.timings.duration)
    requestCounter.add(1)
  })

  sleep(1)

  // Group 6: Create Operations (Write load)
  group('Create Contact', () => {
    const contactPayload = JSON.stringify({
      firstName: `Test${__VU}`,
      lastName: `User${__ITER}`,
      email: `test.${__VU}.${__ITER}@example.com`,
      phone: '+1234567890',
      companyName: 'Test Company',
    })

    const createRes = http.post(`${API_BASE}/contacts`, contactPayload, {
      headers,
      tags: { type: 'api', endpoint: 'contacts-create' },
    })

    check(createRes, {
      'contact create status is 201': (r) => r.status === 201,
    })

    apiResponseTime.add(createRes.timings.duration)
    requestCounter.add(1)

    // Delete the created contact to avoid pollution
    if (createRes.status === 201) {
      const createBody = JSON.parse(createRes.body)
      if (createBody.data && createBody.data.id) {
        http.del(`${API_BASE}/contacts/${createBody.data.id}`, {
          headers,
          tags: { type: 'api', endpoint: 'contacts-delete' },
        })
      }
    }
  })

  sleep(2)
}

/**
 * Teardown function - runs once at the end
 */
export function teardown(data) {
  console.log(`Load test completed. Started at ${data.startTime}`)
}

/**
 * Handle summary - custom report generation
 */
export function handleSummary(data) {
  console.log('Preparing summary report...')

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/performance/k6-results.json': JSON.stringify(data, null, 2),
    'tests/performance/k6-summary.html': htmlReport(data),
  }
}

/**
 * Generate text summary
 */
function textSummary(data, options = {}) {
  const indent = options.indent || ''
  const enableColors = options.enableColors || false

  let summary = `\n${indent}Test Summary\n${indent}============\n\n`

  // Overall stats
  const metrics = data.metrics
  summary += `${indent}Total Requests: ${metrics.http_reqs.values.count}\n`
  summary += `${indent}Request Rate: ${metrics.http_reqs.values.rate.toFixed(2)} req/s\n`
  summary += `${indent}Failed Requests: ${metrics.http_req_failed.values.rate.toFixed(2)}%\n`
  summary += `${indent}Error Rate: ${metrics.errors.values.rate.toFixed(2)}%\n\n`

  // Response times
  summary += `${indent}Response Times:\n`
  summary += `${indent}  Average: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`
  summary += `${indent}  Median: ${metrics.http_req_duration.values.med.toFixed(2)}ms\n`
  summary += `${indent}  p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`
  summary += `${indent}  p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`
  summary += `${indent}  Max: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`

  // Thresholds
  const thresholds = data.thresholds || {}
  summary += `${indent}Thresholds:\n`
  Object.keys(thresholds).forEach((key) => {
    const threshold = thresholds[key]
    const status = threshold.ok ? '✓ PASS' : '✗ FAIL'
    summary += `${indent}  ${status} - ${key}\n`
  })

  return summary
}

/**
 * Generate HTML report
 */
function htmlReport(data) {
  const metrics = data.metrics

  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report - ClientForge CRM</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; min-width: 200px; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
    .threshold { padding: 8px; margin: 5px 0; border-radius: 4px; }
    .threshold.pass { background: #d4edda; color: #155724; }
    .threshold.fail { background: #f8d7da; color: #721c24; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #007bff; color: white; }
    tr:hover { background: #f5f5f5; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>k6 Load Test Report</h1>
    <p><strong>Project:</strong> ClientForge CRM</p>
    <p><strong>Date:</strong> ${new Date().toISOString()}</p>
    <p><strong>Duration:</strong> ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>

    <h2>Summary Metrics</h2>
    <div class="metric">
      <div class="metric-label">Total Requests</div>
      <div class="metric-value">${metrics.http_reqs.values.count}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Request Rate</div>
      <div class="metric-value">${metrics.http_reqs.values.rate.toFixed(2)} req/s</div>
    </div>
    <div class="metric">
      <div class="metric-label">Error Rate</div>
      <div class="metric-value">${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%</div>
    </div>

    <h2>Response Time Percentiles</h2>
    <table>
      <thead>
        <tr>
          <th>Percentile</th>
          <th>Response Time</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Average</td><td>${metrics.http_req_duration.values.avg.toFixed(2)}ms</td></tr>
        <tr><td>Median (p50)</td><td>${metrics.http_req_duration.values.med.toFixed(2)}ms</td></tr>
        <tr><td>p95</td><td>${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td></tr>
        <tr><td>p99</td><td>${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</td></tr>
        <tr><td>Max</td><td>${metrics.http_req_duration.values.max.toFixed(2)}ms</td></tr>
      </tbody>
    </table>

    <h2>Budget Gates (Thresholds)</h2>
    ${Object.keys(data.thresholds || {}).map((key) => {
      const threshold = data.thresholds[key]
      const status = threshold.ok ? 'pass' : 'fail'
      const icon = threshold.ok ? '✓' : '✗'
      return `<div class="threshold ${status}">${icon} ${key}</div>`
    }).join('')}

    <div class="footer">
      Generated by k6 Load Test - ClientForge CRM Performance Testing Suite
    </div>
  </div>
</body>
</html>
  `.trim()
}
