# Load Testing with k6

This directory contains load testing scripts for the ClientForge CRM API using [k6](https://k6.io/).

## Installation

Install k6:

```bash
# Windows (using Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Available Tests

### Authentication Load Test

Tests login, token refresh, and session management under load.

**File**: `auth-load-test.js`

**Stages**:
1. Ramp up to 20 users (30s)
2. Increase to 50 users (1m)
3. Peak at 100 users (30s)
4. Stay at 100 users (1m)
5. Ramp down to 0 (30s)

**Performance Thresholds**:
- 95% of requests < 500ms
- 99% of requests < 1500ms
- Request failure rate < 1%
- Login success rate > 99%
- Login duration p95 < 200ms

## Running Tests

### Basic Run

```bash
k6 run tests/load/auth-load-test.js
```

### Custom Configuration

```bash
# Run with custom VUs and duration
k6 run --vus 50 --duration 30s tests/load/auth-load-test.js

# Run with environment variables
k6 run --env BASE_URL=http://localhost:3000/api/v1 tests/load/auth-load-test.js

# Run with custom master credentials
k6 run --env MASTER_EMAIL=master@example.com --env MASTER_PASSWORD=secret tests/load/auth-load-test.js
```

### Cloud Run (k6 Cloud)

```bash
# Login to k6 Cloud
k6 login cloud

# Run test in cloud
k6 cloud tests/load/auth-load-test.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000/api/v1` | API base URL |
| `MASTER_EMAIL` | `master@clientforge.io` | Master account email |
| `MASTER_PASSWORD` | `Admin123` | Master account password |

## Understanding Results

### Metrics

**HTTP Request Duration**:
- `avg`: Average response time
- `min`: Fastest response
- `max`: Slowest response
- `p(95)`: 95th percentile (95% of requests faster than this)
- `p(99)`: 99th percentile (99% of requests faster than this)

**Request Rate**:
- `count`: Total requests made
- `rate`: Requests per second

**Custom Metrics**:
- `login_success_rate`: Percentage of successful logins
- `login_duration`: Time taken for login requests
- `rate_limit_errors`: Number of 429 Too Many Requests responses
- `auth_errors`: Number of 401/403 authentication errors

### Example Output

```
✓ login status is 200
✓ login has tokens
✓ login response time < 500ms
✓ protected endpoint accessible
✓ token refresh successful
✓ logout successful

checks.........................: 100.00% ✓ 5234      ✗ 0
data_received..................: 8.5 MB  142 kB/s
data_sent......................: 2.1 MB  35 kB/s
http_req_duration..............: avg=45.23ms  min=2.31ms  max=287.45ms p(95)=98.76ms p(99)=156.23ms
http_reqs......................: 5234    87.23/s
login_duration.................: avg=32.45ms  min=5.12ms  max=245.67ms p(95)=78.34ms p(99)=123.45ms
login_success_rate.............: 99.8%   ✓ 1745      ✗ 4
```

## Interpreting Thresholds

### ✅ Passing Criteria

All of these must be true:
- p95 response time < 500ms (95% of requests complete in under 500ms)
- p99 response time < 1500ms (99% of requests complete in under 1.5s)
- Request failure rate < 1%
- Login success rate > 99%

### ⚠️ Warning Signs

Watch for:
- **High p99 values**: Indicates some requests are very slow
- **Rate limit errors**: Too many requests from same IP
- **Auth errors**: Credentials or session issues
- **Failed checks**: Responses not meeting expectations

### 🔴 Failure Indicators

Test fails if:
- Any threshold is exceeded
- Server becomes unresponsive
- Error rate is too high
- Performance degrades over time

## Performance Goals

| Metric | Target | Stretch Goal |
|--------|--------|--------------|
| Login p95 | < 200ms | < 100ms |
| Login p99 | < 500ms | < 200ms |
| Success rate | > 99% | > 99.9% |
| Throughput | 100 req/s | 200 req/s |
| Error rate | < 1% | < 0.1% |

## Troubleshooting

### Rate Limiting Errors

If you see many `429` errors:
- Reduce VU count
- Increase ramp-up duration
- Clear Redis rate limits: `node scripts/clear-rate-limit.js`

### Connection Errors

If requests timeout or fail to connect:
- Verify server is running
- Check BASE_URL is correct
- Ensure no firewall blocking requests

### Authentication Errors

If you see `401` or `403` errors:
- Verify master credentials are correct
- Check user account is active
- Ensure database is seeded

### Poor Performance

If response times are high:
- Check database indexes are created
- Verify connection pools aren't exhausted
- Monitor server resource usage (CPU, memory)
- Check for slow queries in logs

## Best Practices

1. **Start Small**: Begin with low VU count and short duration
2. **Gradual Ramp**: Use stages to gradually increase load
3. **Monitor Resources**: Watch server CPU, memory, database connections
4. **Baseline First**: Establish baseline performance before optimizing
5. **Isolate Changes**: Test one change at a time
6. **Real Scenarios**: Model actual user behavior with think time
7. **Clean State**: Reset database and cache between test runs

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Tests

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Run load tests
        run: ./k6 run tests/load/auth-load-test.js

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-test-results.json
```

## Next Steps

1. Add more test scenarios (contacts, deals, search)
2. Create smoke tests for CI/CD
3. Set up performance monitoring dashboard
4. Establish SLAs based on test results
5. Automate regression testing

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
