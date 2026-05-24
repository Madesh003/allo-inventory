# Allo Inventory

A multi-warehouse inventory and order-fulfilment platform with race-condition-safe reservation logic.

**Live demo:** [your-deployment-url.vercel.app]

---

## Running locally

### Prerequisites

- Node.js 18+
- A hosted PostgreSQL instance (Supabase, Neon, or Railway — all have free tiers)

### Setup

```bash
git clone <repo-url>
cd allo-inventory
npm install

# Copy env template and fill in your DATABASE_URL
cp .env.example .env.local
# Edit .env.local: DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate dev --name init

# Seed the database
npx prisma db seed

# Start the dev server
npm run dev
```

Open http://localhost:3000.

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List products with available stock per warehouse |
| GET | /api/warehouses | List warehouses |
| POST | /api/reservations | Reserve units (body: `{ productId, warehouseId, quantity }`) |
| GET | /api/reservations/:id | Get a single reservation |
| POST | /api/reservations/:id/confirm | Confirm reservation (payment succeeded) |
| POST | /api/reservations/:id/release | Release reservation (payment failed or cancelled) |

### Error codes

- **409** — Not enough stock, or reservation already confirmed/released
- **410** — Reservation has expired (confirm endpoint)
- **422** — Validation error

### Idempotency

`POST /api/reservations` supports an `Idempotency-Key` header. The key is stored as a UNIQUE column on the Reservation table. If the server sees the same key again, it returns the original reservation with `{ replayed: true }` — no new hold is created.

---

## Concurrency correctness

The core guarantee: **exactly one request wins when multiple shoppers race for the last unit**.

### Approach: conditional atomic UPDATE

```sql
UPDATE "Inventory"
SET "reservedUnits" = "reservedUnits" + $quantity,
    "updatedAt"     = NOW()
WHERE "productId"   = $productId
  AND "warehouseId" = $warehouseId
  AND ("totalUnits" - "reservedUnits") >= $quantity
```

PostgreSQL row-level locking means only one concurrent UPDATE can hold the lock on a given Inventory row at a time. The WHERE clause acts as an atomic check-and-set:

1. First request arrives → condition satisfied → UPDATE succeeds → affected rows = 1.
2. Second request arrives while first transaction is open → blocked waiting for the row lock.
3. First transaction commits → second request gets the lock, re-evaluates WHERE → condition is now false → affected rows = 0 → returns 409.

The whole operation runs inside a SERIALIZABLE transaction to prevent phantom reads.

**Why not advisory locks or Redis?**
Advisory locks require explicit acquire + cleanup and can leak if the process crashes. Redis distributed locks have the same problem plus an extra infrastructure dependency. The conditional UPDATE is self-contained and inherently cleaned up by transaction rollback.

---

## Expiry mechanism

### Two-layer approach

**Layer 1 — Lazy cleanup (read path):**
Before computing available stock (GET /api/products) and before attempting a new reservation, we call `expireStaleReservations()`. This bulk-releases all PENDING rows with `expiresAt < NOW()` in a single transaction. Stock counts shown to shoppers are always accurate.

**Layer 2 — Vercel Cron (background):**
`vercel.json` schedules `GET /api/cron/expire-reservations` every minute. This ensures units are returned promptly even without new traffic. The endpoint requires a `CRON_SECRET` bearer token in production.

Together: under load, lazy cleanup fires on every request. At low traffic, the cron fires every 60 seconds. Units are never locked up for more than `expiresAt + 60s`.

---

## Trade-offs and what I'd do differently

**What's here**
- Race-condition-safe reservation via conditional UPDATE in a serializable transaction
- Two-layer expiry: lazy cleanup + Vercel Cron
- Idempotency via unique Idempotency-Key column
- Full UI: product listing with warehouse selector, checkout page with live countdown, confirm/cancel, 409/410 error surfaces

**Trade-offs made**
- No Redis. The PostgreSQL conditional UPDATE is simpler, has fewer failure modes, and doesn't need a second infrastructure dependency. For very high write throughput you might add Redis to reduce DB write contention, but at typical retail scale Postgres row-level locking is sufficient.
- No authentication. Any user can reserve any product.
- Quantity is always 1 in the UI (API accepts any positive integer).
- No real payment integration — the Confirm button goes directly to the confirm endpoint.

**With more time I'd add**
- User/session model with per-user reservation limits
- Webhook-based payment confirmation (Stripe/Razorpay)
- SWR/React Query polling so product stock stays fresh without page reloads
- Test suite: concurrent requests to `reserveUnits` to verify exactly-once semantics
- Admin view: live reservation queue, manual release, stock adjustments
