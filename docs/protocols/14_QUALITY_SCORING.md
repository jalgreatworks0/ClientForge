# 📊 Quality Scoring Protocol

**P3 OPTIONAL**: Objective quality metrics (0-100 score)

---

## Quality Score Formula

```
Quality Score = (Tests × 0.3) + (Types × 0.2) + (Security × 0.2) +
                (Performance × 0.15) + (Documentation × 0.10) + (Style × 0.05)

Target: 85+ (Production Ready)
Minimum: 70 (Acceptable)
Below 70: Needs Improvement
```

---

## Scoring Criteria

### 1. Test Coverage (30 points)
```
100% coverage = 30 points
85% coverage  = 25 points
70% coverage  = 20 points
< 70% = 0-15 points
```

**Check**: `npm test -- --coverage`

---

### 2. Type Safety (20 points)
```
0 'any' types         = 20 points
1-5 'any' types       = 15 points
6-10 'any' types      = 10 points
> 10 'any' types      = 0-5 points
```

**Check**: `npm run type-check` + grep for 'any'

---

### 3. Security (20 points)
```
0 vulnerabilities     = 20 points
1-2 LOW               = 18 points
1-2 MEDIUM            = 15 points
Any HIGH/CRITICAL     = 0 points
```

**Check**: `npm audit`

---

### 4. Performance (15 points)
```
API responses < 100ms  = 15 points
API responses < 200ms  = 12 points
API responses < 500ms  = 8 points
API responses > 500ms  = 0-5 points
```

**Check**: Performance tests

---

### 5. Documentation (10 points)
```
All functions documented   = 10 points
80%+ documented            = 8 points
50%+ documented            = 5 points
< 50% documented           = 0-3 points
```

**Check**: Manual review of JSDoc comments

---

### 6. Code Style (5 points)
```
0 lint errors        = 5 points
1-5 lint errors      = 3 points
> 5 lint errors      = 0 points
```

**Check**: `npm run lint`

---

## Example Calculation

```
Project: ClientForge CRM v3.0

Tests:         92% coverage = 28 points
Type Safety:   3 'any' types = 15 points
Security:      0 vulnerabilities = 20 points
Performance:   150ms avg = 12 points
Documentation: 85% documented = 8 points
Code Style:    0 lint errors = 5 points

Total: 88 / 100 = Production Ready ✅
```

---

## Quality Gates

### Pre-Merge Requirements
- Minimum score: 70
- Test coverage: ≥ 85%
- No HIGH/CRITICAL vulnerabilities
- Type check passes

### Production Deployment Requirements
- Minimum score: 85
- Test coverage: ≥ 90%
- 0 vulnerabilities
- All lint errors fixed

---

## Automated Scoring

```bash
# Run quality check script
npm run quality-check

# Output:
# ✅ Tests: 92% (28/30 points)
# ✅ Types: 3 any (15/20 points)
# ✅ Security: 0 vulns (20/20 points)
# ✅ Performance: 150ms (12/15 points)
# ⚠️ Documentation: 75% (7/10 points)
# ✅ Style: 0 errors (5/5 points)
#
# Total Score: 87/100 ✅ Production Ready
```

---

## Continuous Improvement

Track scores weekly:
- Week 1: 72 (Acceptable)
- Week 2: 78 (Improving)
- Week 3: 85 (Production Ready)
- Week 4: 88 (Excellent)

Goal: Maintain 85+ score consistently.
