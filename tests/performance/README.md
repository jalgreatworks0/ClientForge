# Performance Testing with k6

This directory contains k6 load tests for ClientForge CRM performance validation.

## Prerequisites

Install k6:

**Windows (via Chocolatey):**
```powershell
choco install k6
```

**Windows (via Scoop):**
```powershell
scoop install k6
```

**Linux:**
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### Basic Test Run
```bash
k6 run tests/performance/k6-load-test.js
```

### Custom Configuration
```bash
# Test against different environment
BASE_URL=https://staging.clientforge.com k6 run tests/performance/k6-load-test.js

# Custom duration and users
k6 run --vus 50 --duration 5m tests/performance/k6-load-test.js

# Generate JSON output
k6 run --out json=results.json tests/performance/k6-load-test.js

# Generate HTML report
k6 run --out html=report.html tests/performance/k6-load-test.js
```

### Smoke Test (Quick validation)
```bash
k6 run --vus 1 --duration 30s tests/performance/k6-load-test.js
```

### Stress Test (Find breaking point)
```bash
k6 run --vus 200 --duration 10m tests/performance/k6-load-test.js
```

## Budget Gates (Performance Thresholds)

The test enforces these performance requirements:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| API p95 | < 500ms | 95% of API requests under 500ms |
| API p99 | < 1000ms | 99% of API requests under 1s |
| Auth p95 | < 1000ms | 95% of auth requests under 1s |
| Search p95 | < 800ms | 95% of search requests under 800ms |
| Error Rate | < 1% | Less than 1% errors |
| Request Rate | > 100 RPS | Minimum 100 requests per second |

**Test will FAIL if any threshold is exceeded.**

## Test Scenarios

The load test simulates these user flows:

1. **Authentication** - User login
2. **Contacts API** - List and view contacts
3. **Deals API** - List deals
4. **Search API** - Full-text search queries
5. **Analytics API** - Dashboard data
6. **Create Operations** - Write load testing

## Load Profile

Default test runs through these stages:

```
10 VUs  →  50 VUs  →  100 VUs  →  0 VUs
  30s      30s        30s        30s
   |        |          |          |
Ramp up   Sustain    Spike     Ramp down
```

Total duration: ~5.5 minutes

## Interpreting Results

### Terminal Output

```
     ✓ login status is 200
     ✓ contacts list status is 200
     ✓ search returns results

     checks.........................: 98.50% ✓ 9850  ✗ 150
     data_received..................: 45 MB  150 kB/s
     data_sent......................: 12 MB  40 kB/s
     http_req_duration..............: avg=245ms min=89ms med=198ms max=2.1s p(95)=456ms p(99)=876ms
     http_reqs......................: 12450  41.5/s
```

**Key Metrics:**
- `checks`: Percentage of successful assertions
- `http_req_duration`: Response time distribution
- `http_reqs`: Total requests and rate

### HTML Report

Generated at `tests/performance/k6-summary.html`

Open in browser for:
- Visual charts
- Detailed percentile breakdown
- Threshold pass/fail status
- Historical comparison

## CI Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Run performance tests
        run: k6 run tests/performance/k6-load-test.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: |
            tests/performance/k6-results.json
            tests/performance/k6-summary.html
```

### GitLab CI Example

```yaml
performance_tests:
  stage: test
  image: grafana/k6:latest
  script:
    - k6 run tests/performance/k6-load-test.js
  artifacts:
    paths:
      - tests/performance/k6-results.json
      - tests/performance/k6-summary.html
    expire_in: 30 days
  only:
    - main
    - develop
```

## Baseline Establishment

To establish a performance baseline:

1. **Run test 5 times** on stable environment
2. **Calculate average** p95/p99 values
3. **Set thresholds** at 110% of baseline (10% buffer)
4. **Document baseline** in this README
5. **Re-baseline quarterly** or after major changes

### Current Baseline (Example)

| Metric | Baseline | Threshold | Date Established |
|--------|----------|-----------|------------------|
| API p95 | 380ms | 500ms | 2025-01-15 |
| API p99 | 820ms | 1000ms | 2025-01-15 |
| RPS | 150 | 100 | 2025-01-15 |

## Troubleshooting

### High Error Rates

```bash
# Check specific errors
k6 run --http-debug tests/performance/k6-load-test.js
```

### Timeout Issues

```bash
# Increase timeout
k6 run --http-timeout=30s tests/performance/k6-load-test.js
```

### Rate Limiting

```bash
# Reduce concurrent users
k6 run --vus 5 --duration 2m tests/performance/k6-load-test.js
```

## Best Practices

1. **Run tests against staging** before production
2. **Warm up services** before baseline tests
3. **Test during off-peak** hours
4. **Monitor infrastructure** during tests
5. **Version test scripts** with application
6. **Document changes** to thresholds
7. **Alert on failures** in CI/CD

## Advanced Usage

### Custom Metrics

Add to test script:
```javascript
import { Counter } from 'k6/metrics'
const customCounter = new Counter('custom_operations')

// In test
customCounter.add(1)
```

### Scenarios

Test different user behaviors:
```javascript
export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      exec: 'readOnlyFlow',
    },
    write_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
      ],
      exec: 'writeFlow',
    },
  },
}
```

### Distributed Testing

Run across multiple machines:
```bash
# Master
k6 run --execution-mode=distributed tests/performance/k6-load-test.js

# Agents (on other machines)
k6 agent --server-url=http://master:6565
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Cloud](https://k6.io/cloud/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/)
