# Backend Analysis Report

## System Features
*   **Authentication:**
    *   Dual-strategy: Google (GIS) and Email/Password.
    *   Security: Scrypt hashing (16-byte salt, 64-byte key).
    *   Session: JWT (Role-embedded).
*   **Event Management:**
    *   CRUD operations for "Organizers".
    *   Cloudinary integration for cover image uploads.
    *   Capacity handling (Finite or "Infinity").
*   **Social Protocol:**
    *   `join`: Atomic MongoDB updates ($lt check for capacity).
    *   `checkin`: QR validation logic for Organizers.
    *   `comment`: Simple append-only feed.

## Vulnerabilities & Risks
*   **Input Validation:**
    *   **Issue:** Lack of strict schema validation (e.g., Zod/Joi). relying on basic `if (!field)`.
    *   **Risk:** Malformed data or type injection could crash logic (e.g., `maxAttendees` parsing hack).
*   **Authorization:**
    *   **Issue:** Role checks are manual (`req.userRole !== 'organizer'`) inside routes.
    *   **Risk:** Easy to miss a check in future endpoints.
*   **File Uploads:**
    *   **Issue:** `multer` stores to disk (`uploads/`) before Cloudinary.
    *   **Risk:** Disk space exhaustion if cleanup (`fs.unlinkSync`) fails during error flow.
*   **Frontend Logic:**
    *   **Issue:** Core logic embedded in `index.html` `<script>`.
    *   **Risk:** Hard to test, maintain, or secure XSS surface.
*   **Testing:**
    *   **Issue:** Local test runner binary mismatch (`node-pty`).
    *   **Risk:** CI/CD reliance or skipped tests during local dev.

## Recommendations
1.  **Validation Middleware:** Implement `express-validator` or `zod` for request bodies.
2.  **Role Middleware:** Create `requireRole('organizer')` middleware to standardize checks.
3.  **Refactor Frontend:** Move `index.html` script to a modular `app.js` bundle (Webpack/Vite).