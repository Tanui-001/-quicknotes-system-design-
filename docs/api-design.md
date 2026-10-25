# QuickNotes API Design

Base URL: `https://api.quicknotes.example.com/v1`
All request and response bodies are `application/json`.
Authentication: Bearer token in the `Authorization` header.

## Endpoints

| # | Method | Path               | Description                     | Success |
|---|--------|--------------------|---------------------------------|---------|
| 1 | GET    | `/notes`           | List notes for the current user | 200     |
| 2 | GET    | `/notes/{id}`      | Get a single note by id         | 200     |
| 3 | POST   | `/notes`           | Create a new note               | 201     |
| 4 | PUT    | `/notes/{id}`      | Replace a note                  | 200     |
| 5 | PATCH  | `/notes/{id}`      | Partially update a note         | 200     |
| 6 | DELETE | `/notes/{id}`      | Delete a note                   | 204     |
| 7 | GET    | `/notes/{id}/tags` | List tags attached to a note    | 200     |
| 8 | POST   | `/notes/{id}/tags` | Attach a tag to a note          | 201     |

## Create a note — request

```http
POST /v1/notes
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "title": "Buy groceries",
  "body": "Milk, eggs, bread",
  "tag_ids": [3, 7]
}
```

## Create a note — response (201)

```json
{
  "id": 101,
  "title": "Buy groceries",
  "body": "Milk, eggs, bread",
  "user_id": 1,
  "tags": [
    { "id": 3, "name": "shopping" },
    { "id": 7, "name": "home" }
  ],
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

## List notes — request

```http
GET /v1/notes?limit=10&offset=0
Authorization: Bearer <token>
```

## List notes — response (200)

```json
{
  "data": [
    {
      "id": 101,
      "title": "Buy groceries",
      "body": "Milk, eggs, bread",
      "user_id": 1,
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 100,
      "title": "Call dentist",
      "body": "",
      "user_id": 1,
      "created_at": "2025-01-14T09:00:00Z"
    }
  ],
  "meta": { "limit": 10, "offset": 0, "total": 42 }
}
```

## Error codes

| Status | Meaning                                      |
|--------|----------------------------------------------|
| 400    | Bad request — validation failed              |
| 401    | Unauthorized — missing or invalid token      |
| 403    | Forbidden — user does not own the resource   |
| 404    | Not found — note does not exist              |
| 500    | Internal server error                        |

Example error body (400):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be at most 100 characters.",
    "fields": { "title": "required, max 100 characters" }
  }
}
```