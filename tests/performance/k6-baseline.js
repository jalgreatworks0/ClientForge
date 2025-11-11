import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Counter } from 'k6/metrics'

// Custom metrics
const apiDuration = new Trend('api_duration')
const searchDuration = new Trend('search_duration')
const loginDuration = new Trend('login_duration')
const errorCount = new Counter('errors')

// Test thresholds - gates for CI/CD
export const options = {
  vus: 5, // 5 virtual users
  duration: '1m', // Run for 1 minute

  thresholds: {
    // API latency: 95th percentile should be < 200ms for GETs
    'http_req_duration{staticAsset:no, api:get}': ['p(95)<200', 'p(99)<300'],
    // Search: 95th percentile should be < 100ms
    'http_req_duration{staticAsset:no, api:search}': ['p(95)<100'],
    // POST operations: 95th percentile should be < 500ms
    'http_req_duration{staticAsset:no, api:post}': ['p(95)<500'],
    // Error rate: should be < 1%
    'http_req_failed': ['rate<0.01'],
  },
}

const BASE_URL = 'http://localhost:3000/api/v1'

// Mock auth token (in real scenario, get from login)
let authToken = ''

export default function () {
  // 1. Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'admin@clientforge.local',
    password: 'Admin!234',
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { api: 'auth' },
  })

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => r.json('data.tokens.accessToken') !== '',
  })

  if (loginRes.status === 200) {
    authToken = loginRes.json('data.tokens.accessToken')
  } else {
    errorCount.add(1)
    return
  }

  loginDuration.add(loginRes.timings.duration)
  sleep(1)

  // 2. List Contacts (GET)
  const listRes = http.get(`${BASE_URL}/contacts?page=1&limit=20`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    tags: { api: 'get', staticAsset: 'no' },
  })

  check(listRes, {
    'list contacts status ok': (r) => r.status === 200,
    'has contacts data': (r) => r.json('data.length') >= 0,
  })

  if (listRes.status !== 200) {
    errorCount.add(1)
  }

  apiDuration.add(listRes.timings.duration, { operation: 'list' })
  sleep(0.5)

  // 3. Search Contacts
  const searchRes = http.get(
    `${BASE_URL}/search?q=john&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      tags: { api: 'search', staticAsset: 'no' },
    }
  )

  check(searchRes, {
    'search status ok': (r) => r.status === 200,
    'search returns results': (r) => r.json('data.length') >= 0,
  })

  if (searchRes.status !== 200) {
    errorCount.add(1)
  }

  searchDuration.add(searchRes.timings.duration)
  sleep(0.5)

  // 4. Health Check (no auth required)
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { api: 'health', staticAsset: 'no' },
  })

  check(healthRes, {
    'health check ok': (r) => r.status === 200,
    'health status healthy': (r) => r.json('status') === 'healthy',
  })

  if (healthRes.status !== 200) {
    errorCount.add(1)
  }

  sleep(1)

  // 5. Simulate typical user actions
  if (__VU % 3 === 0) {
    // Create a new contact (only some users)
    const createRes = http.post(`${BASE_URL}/contacts`, JSON.stringify({
      firstName: `Test${__VU}`,
      lastName: `User`,
      email: `test${__VU}@example.com`,
      phone: '+1234567890',
      title: 'Director',
    }), {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      tags: { api: 'post', staticAsset: 'no' },
    })

    check(createRes, {
      'create contact successful': (r) => r.status === 201,
      'contact has id': (r) => r.json('data.id') !== '',
    })

    if (createRes.status !== 201) {
      errorCount.add(1)
    }

    apiDuration.add(createRes.timings.duration, { operation: 'create' })
  }

  sleep(1)
}
