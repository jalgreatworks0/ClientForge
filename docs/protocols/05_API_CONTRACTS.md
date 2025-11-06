# 🔌 API Contracts Protocol

**P2 RECOMMENDED**: Consistent API design patterns

---

## REST API Design Patterns

### Standard Response Format
```typescript
// Success Response
{
  "success": true,
  "data": { /* resource data */ },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be valid email" }
    ]
  }
}
```

### HTTP Status Codes
- `200 OK` - Success (GET, PATCH, DELETE)
- `201 Created` - Resource created (POST)
- `204 No Content` - Success with no body (DELETE)
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate resource
- `500 Internal Server Error` - Server error

### Endpoint Naming
```
GET    /api/v1/contacts           # List all
POST   /api/v1/contacts           # Create one
GET    /api/v1/contacts/:id       # Get one
PATCH  /api/v1/contacts/:id       # Update one
DELETE /api/v1/contacts/:id       # Delete one
GET    /api/v1/contacts/search    # Search
```

### Pagination
```typescript
GET /api/v1/contacts?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc

Response:
{
  "success": true,
  "data": [ /* contacts */ ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Filtering
```typescript
GET /api/v1/contacts?status=active&accountId=123&search=john
```

---

## API Validation

All requests validated with Zod:
```typescript
const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional()
})
```

---

## API Documentation

Use JSDoc + OpenAPI format:
```typescript
/**
 * @route POST /api/v1/contacts
 * @description Create a new contact
 * @access Private
 * @param {CreateContactDTO} req.body - Contact data
 * @returns {Contact} 201 - Created contact
 * @returns {ValidationError} 400 - Validation failed
 */
```
