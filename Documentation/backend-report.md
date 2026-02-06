# Backend Infrastructure Report: GigByCity

## Core Architecture
- **Runtime:** Node.js (Asynchronous Event Loop)
- **Framework:** Express.js (v5.x - "Fat Routes" Pattern)
- **Database:** MongoDB Native Driver (Singleton Connection)
- **State:** Stateless (JWT-based, 1h TTL)
- **I/O:** Disk-buffered Multer (Uploads) + Cloudinary (CDN)

## Operational Bottlenecks (Heavy RAM/CPU)

### 1. Cryptographic Hashing (CPU/RAM)
- **Location:** `src/auth_path.js` (Signup/Login)
- **Operation:** `scrypt` (16-byte salt, 64-byte hash)
- **Impact:** High CPU/Memory cost per request to prevent brute-force; concurrent auth spikes will saturate the event loop.

### 2. Multi-Part Image Processing (Disk I/O)
- **Location:** `src/event_path.js` (POST /)
- **Operation:** Multer Disk Storage -> Cloudinary Upload -> `fs.unlinkSync`
- **Impact:** Temporary disk I/O spikes. Concurrent large uploads (up to 10MB limit) can exhaust server heap memory during stream buffering.

### 3. Atomic Collection Updates (DB CPU)
- **Location:** `src/event_path.js` (POST /join, POST /verify-payment)
- **Operation:** `$expr` with `$size` in `updateOne` filter.
- **Impact:** Requires MongoDB to calculate array length during the lock phase. Inefficient for high-concurrency "hot" events; scales poorly with attendee count.

### 4. Middleware Overhead
- **Location:** `src/app.js`
- **Operation:** `express.json({ limit: '10mb' })`
- **Impact:** Large JSON payloads (descriptions/metadata) are fully buffered into RAM before reaching routes.

## Efficiency Recommendations
- **Indexing:** Ensure `creatorId` and `email` are indexed to avoid full collection scans.
- **Counter Pattern:** Replace `$size` checks with a cached `attendeeCount` field.
- **Rate Limiting:** Protect `scrypt` operations from DoS.
