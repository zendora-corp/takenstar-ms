# TTSE Public API Documentation

All public API endpoints for client integration. No authentication required. Rate limited to 10 requests per minute per IP.

## Base URL
`https://takenstar-backend.vercel.app/api/public`

## Endpoints

### 1. Get Active Exam Year
Get the currently active exam year configuration.

**Endpoint:** `GET /api/public/exam-year/active`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "year": 2025,
    "registrationOpenDate": "2025-01-01",
    "registrationCloseDate": "2025-03-31",
    "examDate": "2025-04-15",
    "resultDate": "2025-05-15",
    "status": "active"
  }
}
```

**Response 404:** No active exam year found
**Response 500:** Internal server error

---

### 2. Get All Exam Years
Get list of all exam years ordered by year descending.

**Endpoint:** `GET /api/public/exam-years`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "year": 2025,
      "registrationOpenDate": "2025-01-01",
      "registrationCloseDate": "2025-03-31",
      "examDate": "2025-04-15",
      "resultDate": "2025-05-15",
      "status": "active"
    }
  ]
}
```

---

### 3. Get Districts Reference
Get list of active districts.

**Endpoint:** `GET /api/public/refs/districts`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Kamrup"
    }
  ]
}
```

---

### 4. Get Schools Reference
Get active schools, optionally filtered by district.

**Endpoint:** `GET /api/public/refs/schools[?districtId=uuid]`

**Query Parameters:**
- `districtId` (optional): Filter schools by district ID

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "ABC High School",
      "districtId": "uuid",
      "districtName": "Kamrup"
    }
  ]
}
```

---

### 5. Result Lookup
Lookup individual student result by exam year, district, school, and roll number.

**Endpoint:** `GET /api/public/result-lookup`

**Query Parameters (all required):**
- `examYear` (integer): e.g., 2025
- `districtName` (string): Case-insensitive district name
- `schoolName` (string): Case-insensitive school name
- `schoolRollNo` (string): Student's school roll number

**Response 200:**
```json
{
  "success": true,
  "data": {
    "student": {
      "fullName": "John Doe",
      "class": 10,
      "medium": "English",
      "districtName": "Kamrup",
      "schoolName": "ABC High School",
      "schoolRollNo": "12345"
    },
    "marks": {
      "gk": 85,
      "science": 90,
      "mathematics": 88,
      "logicalReasoning": 92,
      "currentAffairs": 87
    },
    "totalMarks": 442,
    "percentage": 88.40,
    "rank": 15,
    "resultStatus": "PASS"
  }
}
```

**Response 404:**
- Exam year not found
- District not found
- School not found
- Registration not found
- Result not published yet

**Response 400:** Missing or invalid parameters

---

### 6. Get Results by School
Get all results for a specific school in a given exam year.

**Endpoint:** `GET /api/public/results/by-school`

**Query Parameters:**
- `examYear` (required, integer): e.g., 2025
- EITHER:
  - `schoolId` (uuid): Direct school ID
- OR:
  - `districtName` (string): District name
  - `schoolName` (string): School name

**Response 200:**
```json
{
  "success": true,
  "data": {
    "examYear": 2025,
    "school": {
      "id": "uuid",
      "name": "ABC High School",
      "districtId": "uuid",
      "districtName": "Kamrup"
    },
    "results": [
      {
        "registrationId": "uuid",
        "student": {
          "fullName": "John Doe",
          "class": 10,
          "medium": "English",
          "schoolRollNo": "12345"
        },
        "marks": {
          "gk": 85,
          "science": 90,
          "mathematics": 88,
          "logicalReasoning": 92,
          "currentAffairs": 87
        },
        "totalMarks": 442,
        "percentage": 88.40,
        "rank": 15,
        "resultStatus": "PASS"
      }
    ]
  }
}
```

**Sorting:** Results sorted by percentage DESC, totalMarks DESC, fullName ASC

**Response 404:** Exam year or school not found
**Response 400:** Missing or invalid parameters

---

### 7. Get Top 3 by Group
Get top 3 students from each group/class for an exam year.

**Endpoint:** `GET /api/public/results/top3-by-group`

**Query Parameters:**
- `examYear` (required, integer): e.g., 2025

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "group": "A",
      "toppers": [
        {
          "registrationId": "uuid",
          "student": {
            "fullName": "Jane Smith",
            "class": 10,
            "medium": "English",
            "districtName": "Kamrup",
            "schoolName": "ABC High School",
            "schoolRollNo": "12346"
          },
          "totalMarks": 485,
          "percentage": 97.00,
          "rank": 1
        }
      ]
    }
  ]
}
```

**Notes:**
- Groups are based on `registrations.group_type` (A or B)
- If no explicit group column, groups by class
- Ties at 3rd position are included (may return >3 students per group)
- Sorted by percentage DESC, totalMarks DESC

**Response 404:** No results found for exam year
**Response 400:** Missing or invalid parameters

---

## Existing Endpoints (Previously Implemented)

### 8. Submit Contact Form
**Endpoint:** `POST /api/public/contact`

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string (optional)",
  "subject": "string",
  "message": "string"
}
```

---

### 9. Register Student
**Endpoint:** `POST /api/public/registrations`

**Request Body:**
```json
{
  "examYearId": "uuid",
  "fullName": "string",
  "gender": "Male|Female|Other",
  "dob": "YYYY-MM-DD",
  "class": 6-12,
  "medium": "Assamese|English",
  "schoolId": "uuid",
  "schoolRollNo": "string",
  "districtId": "uuid",
  "address": "string",
  "studentMobile": "10-digit string",
  "guardianMobile": "10-digit string",
  "email": "string (optional)",
  "paymentOption": "Online|Offline",
  "transactionId": "string (optional)",
  "offlineReceiptNo": "string (optional)"
}
```

---

### 10. Hall of Fame (Legacy)
**Endpoint:** `GET /api/public/hall-of-fame`

*Note: Consider migrating clients to use `/api/public/results/top3-by-group` instead*

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Resource not found
- `429` - Too many requests (rate limit exceeded)
- `500` - Internal server error

## Rate Limiting

All public endpoints are rate limited to **10 requests per minute per IP address**.

When rate limit is exceeded, the API returns:
```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```
Status: `429 Too Many Requests`

## Data Validation

- All string inputs are trimmed
- Case-insensitive matching for district and school names
- `examYear` must be a valid integer
- UUIDs validated for format
- Active status filtering applied (only active districts/schools returned)

## Best Practices

1. **Cache Reference Data:** Districts and schools lists change infrequently - cache for 1 hour
2. **Active Exam Year:** Cache for 24 hours, invalidate when new year becomes active
3. **Result Lookups:** Results are immutable once published - safe to cache indefinitely
4. **Error Handling:** Always check `success` field before accessing `data`
5. **Rate Limiting:** Implement exponential backoff when receiving 429 responses
6. **Parameter Encoding:** URL encode all query parameters properly
7. **Case Sensitivity:** District and school name searches are case-insensitive - no need to normalize

## Migration Notes

If you have existing integrations:

1. **Result Lookup:** Response format now includes more structured data with nested objects
2. **Schools Endpoint:** Now supports fetching all schools (no `districtId` param) with district info included
3. **New Endpoints:** Three new endpoints added for comprehensive result access
4. **Rate Limiting:** Applied consistently across all endpoints

## Build Status

✅ All endpoints successfully compiled and deployed
✅ TypeScript validation passed
✅ Rate limiting implemented
✅ Error handling standardized
✅ Response formats validated
