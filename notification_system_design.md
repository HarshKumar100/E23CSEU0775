# Campus Notification Platform Design

# Stage 1

## REST API Contracts

All endpoints assume a pre-authenticated student. During local development, the client sends `x-student-id`; if omitted, the backend uses `1042`.

### GET /api/notifications
Description: Fetch paginated notifications, optionally filtered by type.

Headers:
```http
Content-Type: application/json
x-student-id: 1042
```

Query Params:
- `page` number, default `1`
- `limit` number, default `20`
- `notification_type` enum `"Event" | "Result" | "Placement"`, optional

Response 200:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "65f...",
        "notificationId": "api-123",
        "type": "Placement",
        "message": "Drive opens tomorrow",
        "timestamp": "2026-05-11T09:30:00.000Z",
        "isRead": false
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
  }
}
```

Response 400:
```json
{ "success": false, "error": "Invalid notification type" }
```

Response 500:
```json
{ "success": false, "error": "Internal server error" }
```

### GET /api/notifications/:id
Description: Fetch one notification by Mongo `_id` or external `notificationId`.

Headers:
```http
Content-Type: application/json
x-student-id: 1042
```

Path Params:
- `id` string

Response 200:
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "65f...",
      "notificationId": "api-123",
      "type": "Result",
      "message": "Semester result published",
      "timestamp": "2026-05-11T08:00:00.000Z",
      "isRead": false
    }
  }
}
```

Response 404:
```json
{ "success": false, "error": "Notification not found" }
```

Response 500:
```json
{ "success": false, "error": "Internal server error" }
```

### PATCH /api/notifications/:id/read
Description: Mark a notification as read.

Headers:
```http
Content-Type: application/json
x-student-id: 1042
```

Path Params:
- `id` string

Response 200:
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "65f...",
      "notificationId": "api-123",
      "type": "Event",
      "message": "Hackathon registrations open",
      "timestamp": "2026-05-11T07:00:00.000Z",
      "isRead": true
    }
  }
}
```

Response 404:
```json
{ "success": false, "error": "Notification not found" }
```

Response 500:
```json
{ "success": false, "error": "Internal server error" }
```

### PATCH /api/notifications/read-all
Description: Mark all notifications for the student as read.

Headers:
```http
Content-Type: application/json
x-student-id: 1042
```

Request Body:
```json
{}
```

Response 200:
```json
{
  "success": true,
  "data": { "modifiedCount": 24 }
}
```

Response 500:
```json
{ "success": false, "error": "Internal server error" }
```

### GET /api/notifications/unread-count
Description: Fetch the unread count for the student.

Headers:
```http
Content-Type: application/json
x-student-id: 1042
```

Response 200:
```json
{
  "success": true,
  "data": { "count": 12 }
}
```

Response 500:
```json
{ "success": false, "error": "Internal server error" }
```

### GET /api/notifications/priority
Description: Fetch the top-N unread notifications by type weight and recency.

Headers:
```http
Content-Type: application/json
x-student-id: 1042
```

Query Params:
- `n` number, default `10`, allowed `1` to `50`
- `notification_type` enum `"Event" | "Result" | "Placement"`, optional

Response 200:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "65f...",
        "notificationId": "api-123",
        "type": "Placement",
        "message": "Final interview schedule updated",
        "timestamp": "2026-05-11T09:45:00.000Z",
        "isRead": false,
        "score": 400
      }
    ]
  }
}
```

Response 500:
```json
{ "success": false, "error": "Internal server error" }
```

### GET /api/notifications?notification_type=Placement
Description: Filter notifications by type. This uses the same paginated endpoint so frontend state stays simple.

Headers:
```http
Content-Type: application/json
x-student-id: 1042
```

Response 200:
```json
{
  "success": true,
  "data": {
    "notifications": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
  }
}
```

## Real-Time Delivery With Socket.io

Events:
- `notification:new`: emitted when a fresh notification is inserted.
- `notification:read`: emitted after a notification is marked read.
- `notification:readAll`: emitted after all notifications are marked read.

Connection flow:
1. Client opens a Socket.io connection.
2. Client emits `student:join` with `{ "studentId": "1042" }`.
3. Server joins that socket to room `student:1042`.
4. When new data is synced, server emits `notification:new` to that room.

# Stage 2

## Database Choice: MongoDB

MongoDB fits this system because notification payloads are naturally JSON and will probably evolve. Placement updates, event reminders, and result notices may gain different fields over time, and Mongo lets those shapes change without a costly migration for every small variation. The API contract can map directly to stored documents, keeping backend code straightforward.

At scale, sharding by `studentId` keeps each student's inbox close to the query pattern. TTL indexes let the system auto-expire old notifications after 90 days, which matters when the collection grows into millions of documents.

## Mongoose-Style Schema

```js
{
  _id: ObjectId,
  notificationId: String,
  type: {
    type: String,
    enum: ['Event', 'Result', 'Placement']
  },
  message: String,
  timestamp: Date,
  isRead: Boolean,
  studentId: String,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```js
{ studentId: 1, isRead: 1, timestamp: -1 }
{ notificationId: 1 }
{ timestamp: 1, expireAfterSeconds: 7776000 }
```

## Scale Problems And Solutions

1. Collection size at 50k students and 5M notifications: shard on `studentId`.
2. Slow unread queries: use compound indexes matching inbox filters and sort order.
3. Write spikes during "Notify All": enqueue writes through Bull MQ workers.
4. Memory pressure: project only fields needed by the screen, never fetch whole documents casually.

## Sample Queries

```js
db.notifications.find({ studentId: "1042", isRead: false })
  .sort({ timestamp: -1 }).limit(20)

db.notifications.find({
  type: "Placement",
  timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
})
```

# Stage 3

## Slow Query Analysis

Original:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

The query is not ideal for an inbox. Most notification products show unread items newest-first, not oldest-first. `SELECT *` is also wasteful because list screens do not need every field, especially if future notification payloads include large metadata blobs.

It is slow because there is no composite index on `(studentID, isRead, createdAt)`. On a 5M-row table, the database may scan many rows, filter them, then sort the remaining unread records. Fetching all columns increases I/O and memory use.

Optimized query:
```sql
SELECT id, message, notificationType, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 50;
```

Index:
```sql
CREATE INDEX idx_student_unread_date
ON notifications (studentID, isRead, createdAt DESC);
```

Before indexing, the work is roughly `O(n)` for scanning plus sort overhead. With the index, lookup becomes `O(log n + k)`, where `k` is the number of rows returned.

"Index every column" is bad advice. Indexes slow writes and consume storage. Indexing `isRead` by itself is low-value because booleans have low cardinality. Composite indexes should target actual query patterns.

Placement notifications in the last 7 days:
```sql
SELECT id, message, createdAt
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL 7 DAY
ORDER BY createdAt DESC;
```

Supporting index:
```sql
CREATE INDEX idx_type_date ON notifications (notificationType, createdAt DESC);
```

# Stage 4

## Caching Strategy

Problem: the DB is hit on every page load for every student, even when the same student refreshes repeatedly.

Option 1: Redis Cache (Recommended)
- Cache `GET /api/notifications?studentId=X` for 30 seconds.
- Invalidate on new notification, mark-read, or mark-all-read.
- Tradeoff: slight staleness window and more infrastructure.
- Best for high read traffic with lower write frequency.

Option 2: HTTP Cache Headers
- Send `Cache-Control: private, max-age=30`.
- Tradeoff: helps browser reuse, but does not reduce server load across multiple devices.
- Best for simple single-device use.

Option 3: Pagination + Infinite Scroll
- Load 20 notifications at a time instead of the full inbox.
- Tradeoff: more requests over time, but smaller and cheaper queries.
- Best for reducing initial load regardless of cache.

Option 4: WebSocket Push
- Load once, then receive new notifications via Socket.io instead of polling.
- Tradeoff: persistent connections cost memory and connection management.
- Best when combined with initial paginated fetch.

Recommended architecture: pagination with 20 items per page, Redis for repeated reads, and Socket.io for fresh updates. This removes polling and keeps the first page fast.

# Stage 5

## Reliability Redesign

Original pseudocode:
```text
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

Shortcomings:
1. Sequential loop over 50k students takes too long and blocks the process.
2. One failed email can break the whole run.
3. Email, DB, and realtime push are coupled, so a partial failure can create inconsistent state.
4. There is no retry path for failed sends.
5. Observability is weak; operators only learn after damage is done.

Redesigned with Bull MQ:
```text
function notify_all(student_ids, message):
  job_batch = []
  for student_id in student_ids:
    job_batch.push({ student_id, message, type: "notify" })

  queue.addBulk(job_batch)
  logger.info('Enqueued notify_all', { count: student_ids.length })

queue.process('notify', MAX_CONCURRENT=50, async (job) => {
  { student_id, message } = job.data

  try:
    save_to_db(student_id, message)
    push_to_app(student_id, message)
    send_email(student_id, message)
    logger.info('Notification delivered', { student_id })
  catch error:
    logger.error('Delivery failed', { student_id, error })
    throw error
})
```

DB save and email should not be treated as one indivisible action. Save to DB first because it is the source of truth. Email is a side effect and can retry independently. If email fails for 200 students, Bull MQ retries only those 200 while the other 49,800 remain delivered.

# Stage 6

## Priority Inbox

Scoring formula:
```text
score = weight(type) + recency_score(timestamp)

Placement = 300
Result    = 200
Event     = 100

last 1 hour  = +100
last 24 hours = +50
last 7 days = +20
older = +0
```

The backend implementation first scores candidate unread notifications and sorts descending for readability. That is fine for a small dataset and keeps the code easy to review. For continuous streams, a min-heap of size `N` is better: compare each incoming notification against the heap minimum, pop the minimum when the new score is higher, and push the new item. This keeps priority maintenance at `O(log N)` per incoming notification instead of sorting the full list at `O(n log n)`.

The recency bonus decays as notifications age. A fresh placement update gets the strongest score, but after 24 hours it drops, and after 7 days it relies only on type weight. That keeps the inbox focused on urgent items without permanently burying lower-weight notification types.

Screenshot placeholder:

`[Screenshot: priority_inbox_output.png]`
