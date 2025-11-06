# ⚡ Performance Protocol

**P2 RECOMMENDED**: Performance budgets and optimization

---

## Performance Budgets

### API Response Times
| Endpoint Type | Target | Maximum |
|---------------|--------|---------|
| Simple GET    | < 50ms | 100ms   |
| Complex GET   | < 100ms| 200ms   |
| POST/PATCH    | < 150ms| 300ms   |
| Search/Filter | < 200ms| 500ms   |

### Database Queries
- Simple query: < 10ms
- JOIN query: < 50ms
- Aggregation: < 100ms

### Frontend
- First Contentful Paint (FCP): < 1.5s
- Time to Interactive (TTI): < 3.5s
- Bundle size: < 500KB gzipped

---

## Optimization Checklist

### Database
- [ ] Indexes on foreign keys
- [ ] Indexes on frequently queried fields
- [ ] Connection pooling configured
- [ ] Query result caching (Redis)
- [ ] No N+1 query problems

### API
- [ ] Response compression (gzip)
- [ ] Pagination for large datasets (max 100 per page)
- [ ] Rate limiting (100 req/min per user)
- [ ] API response caching
- [ ] Lazy loading for expensive data

### Frontend
- [ ] Code splitting
- [ ] Image optimization (WebP, lazy loading)
- [ ] Bundle size analysis
- [ ] Memoization for expensive computations
- [ ] Virtual scrolling for long lists

---

## Common Performance Issues

### N+1 Query Problem
```typescript
// ❌ BAD: 1 + N queries
const contacts = await db.query('SELECT * FROM contacts LIMIT 100')
for (const contact of contacts.rows) {
  const account = await db.query('SELECT * FROM accounts WHERE id = $1', [contact.account_id])
  contact.account = account.rows[0]
}

// ✅ GOOD: 1 query with JOIN
const contacts = await db.query(`
  SELECT c.*, a.name as account_name, a.industry
  FROM contacts c
  LEFT JOIN accounts a ON c.account_id = a.id
  LIMIT 100
`)
```

### Missing Indexes
```sql
-- ✅ Add index on frequently queried fields
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
```

### Large Payloads
```typescript
// ❌ BAD: Return all fields
SELECT * FROM contacts

// ✅ GOOD: Return only needed fields
SELECT id, first_name, last_name, email FROM contacts
```

---

## Performance Testing

```typescript
describe('Performance', () => {
  it('should return contacts in < 100ms', async () => {
    const start = Date.now()
    await request(app).get('/api/v1/contacts')
    const duration = Date.now() - start
    expect(duration).toBeLessThan(100)
  })
})
```

---

## Monitoring

Track these metrics in production:
- API response times (p50, p95, p99)
- Database query times
- Memory usage
- CPU usage
- Error rates

Tools: Datadog, New Relic, Prometheus + Grafana
