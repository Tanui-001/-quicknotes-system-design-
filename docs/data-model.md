# QuickNotes Architecture

## Functional requirements

- Users can register, log in, and manage their own notes.
- Users can create, read, update, and delete notes.
- Users can tag notes and filter by tag.
- Notes are private to their owner.

## Non-functional requirements

- **Availability**: 99.9% uptime (~8.7h downtime/year).
- **Latency**: p95 read < 200 ms, p95 write < 400 ms.
- **Scalability**: support 1M registered users.
- **Durability**: no data loss for acknowledged writes.
- **Security**: HTTPS everywhere, hashed passwords, per-user authorization.

## Load estimate (1,000,000 users)

Assumptions: 10% DAU = 100,000 daily actives; each active user performs 20 reads and 2 writes per day.

- **Reads/sec**: 100,000 × 20 / 86,400 ≈ **23 reads/sec** average (peak ×5 ≈ 115 rps).
- **Writes/sec**: 100,000 × 2 / 86,400 ≈ **2.3 writes/sec** average (peak ×5 ≈ 12 rps).
- **Storage/year**: assume 100 notes/user/year × 500 bytes = 50 KB/user/year → 1,000,000 × 50 KB ≈ **50 GB/year** (plus indexes/overhead, budget ~100 GB/year).

These are modest numbers — a primary + read replica with a cache easily covers them, with room to grow.

## Architecture diagram

```text
              ┌──────────┐
              │  Client  │
              └────┬─────┘
                   │ HTTPS
              ┌────▼─────┐
              │   DNS    │
              └────┬─────┘
                   │
              ┌────▼─────┐
              │   CDN    │ (static assets)
              └────┬─────┘
                   │
            ┌──────▼────────┐
            │ Load Balancer │
            └───┬───────┬───┘
                │       │
         ┌──────▼──┐ ┌──▼──────┐
         │ App #1  │ │ App #2  │ ... App #N
         └────┬────┘ └────┬────┘
              │           │
         ┌────▼───────────▼────┐
         │    Cache (Redis)    │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐      ┌───────────────┐
         │  Primary Database   │─────▶│ Read Replica  │
         └──────────┬──────────┘      └───────────────┘
                    │
         ┌──────────▼──────────┐      ┌───────────────┐
         │        Queue        │─────▶│    Worker     │
         └─────────────────────┘      └───────────────┘
```

## Component explanations (one sentence each)

- **Client**: the browser/web app that renders notes and sends requests.
- **DNS**: resolves the domain to the nearest healthy edge/load balancer.
- **CDN**: caches static assets (HTML, CSS, JS, images) close to users to cut latency.
- **Load balancer**: distributes traffic across app servers and removes unhealthy ones.
- **App servers (≥2)**: stateless services that run business logic and talk to cache/DB.
- **Cache (Redis)**: stores hot reads (recent note lists) to offload the database.
- **Primary database**: the source of truth for writes and strong consistency.
- **Read replica**: serves read traffic and provides failover if the primary dies.
- **Queue**: buffers asynchronous work (e.g., search indexing, notifications).
- **Worker**: consumes queue jobs and performs background tasks off the request path.

## Flow: GET /notes

1. Client sends `GET /notes` over HTTPS; DNS resolves to the LB.
2. Load balancer forwards to a healthy app server.
3. App server checks the **cache** for the user's note list.
4. Cache hit → return immediately. Cache miss → query the **read replica**.
5. App server populates the cache with the result and returns JSON to the client.

## Flow: POST /notes

1. Client sends `POST /notes` with JSON body.
2. Load balancer forwards to an app server.
3. App server validates input, then writes to the **primary database** inside a transaction.
4. After commit, app server enqueues a background job (e.g., search index) on the **queue**.
5. App server returns `201 Created` with the new note; cache is invalidated for the user.
6. The **worker** later processes the queued job asynchronously.

## Trade-offs

1. **Cache vs. freshness**: caching note lists improves read latency and DB load, but entries can be slightly stale after writes — we mitigate by invalidating the user's cache key on write.
2. **Read replicas vs. consistency**: replicas scale reads but can lag behind the primary, so reads that must be fresh (e.g., right after a write) are routed to the primary; bulk list reads go to replicas.
3. **Sync writes vs. async jobs**: doing everything synchronously is simpler but slower; moving non-critical work (search indexing) to the queue improves p95 write latency at the cost of eventual consistency for those side effects.

## Single points of failure and mitigation

- **Load balancer**: deploy as a managed, multi-AZ LB (or two active-passive LBs with DNS failover).
- **App servers**: run ≥2 behind the LB; stateless design lets us add/remove instances freely.
- **Cache**: run Redis in cluster/replica mode; app tolerates cache miss by falling back to DB.
- **Primary DB**: use a standby with automatic failover (e.g., managed Postgres Multi-AZ); read replica can be promoted.
- **Queue/worker**: use a durable, replicated queue; workers are horizontally scalable and idempotent.