# QuickNotes Data Model

## Entities and columns

### users
| Column        | Type         | Key | Notes            |
|---------------|--------------|-----|------------------|
| id            | BIGINT       | PK  | Auto-increment   |
| email         | VARCHAR(255) | UQ  | Unique, not null |
| password_hash | VARCHAR(255) |     | Not null         |
| display_name  | VARCHAR(100) |     |                  |
| created_at    | TIMESTAMPTZ  |     | Default now()    |

### notes
| Column     | Type         | Key | Notes                         |
|------------|--------------|-----|-------------------------------|
| id         | BIGINT       | PK  | Auto-increment                |
| user_id    | BIGINT       | FK  | → users.id, ON DELETE CASCADE |
| title      | VARCHAR(100) |     | Not null                      |
| body       | TEXT         |     |                               |
| created_at | TIMESTAMPTZ  |     | Default now()                 |
| updated_at | TIMESTAMPTZ  |     | Default now()                 |

### tags
| Column  | Type        | Key | Notes           |
|---------|-------------|-----|-----------------|
| id      | BIGINT      | PK  | Auto-increment  |
| user_id | BIGINT      | FK  | → users.id      |
| name    | VARCHAR(50) |     | Unique per user |

### note_tags (join table)
| Column  | Type   | Key    | Notes                         |
|---------|--------|--------|-------------------------------|
| note_id | BIGINT | PK, FK | → notes.id, ON DELETE CASCADE |
| tag_id  | BIGINT | PK, FK | → tags.id,  ON DELETE CASCADE |

## Relationships

- **users → notes**: one-to-many. A user owns many notes; each note belongs to exactly one user.
- **users → tags**: one-to-many. Tags are scoped per user.
- **notes ↔ tags**: many-to-many, resolved by the `note_tags` join table.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id      BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

## Example queries

```sql
-- 1. Recent notes for a user
SELECT id, title, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;

-- 2. JOIN: notes with their tag names
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 1
ORDER BY n.created_at DESC;

-- 3. Count notes per tag for a user
SELECT t.name, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 1
GROUP BY t.name
ORDER BY note_count DESC;
```

## Index

```sql
CREATE INDEX idx_notes_user_created
  ON notes (user_id, created_at DESC);
```

**Reason:** the most common read is "list my notes, newest first." A composite index on `(user_id, created_at DESC)` lets the planner filter by user and return pre-sorted rows without an extra sort step.

## SQL vs NoSQL decision

I chose SQL (PostgreSQL). The data is highly relational (notes ↔ tags is many-to-many, notes → users is one-to-many), and relational integrity plus transactions matter for correctness. Query patterns are well known and benefit from indexes and joins. NoSQL would help if we needed massive horizontal scale or flexible schemas, but for 1M users with modest per-user data, a primary + read replica architecture with caching comfortably handles load. SQL's strong consistency also simplifies the delete/update flows.