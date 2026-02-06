# Backend Security Audit: GigByCity

This document outlines the security measures implemented in the GigByCity backend to prevent common exploits and ensure data integrity.

## 1. Brute-Force & DoS Protection
**Vulnerability:** Attackers can spam auth endpoints (Login/Signup) to exhaust CPU (via scrypt) or guess passwords.
**Solution:** `express-rate-limit` middleware.

```javascript
// src/app.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests, please try again later." }
});

app.use('/api', apiLimiter);
```
*Without this:* An attacker could script thousands of login attempts per second, crashing the server or brute-forcing accounts.

## 2. Secure Credential Storage
**Vulnerability:** If the database is leaked, plain-text or weakly hashed passwords (MD5/SHA1) are easily cracked.
**Solution:** `scrypt` hashing with unique salts.

```javascript
// src/auth_path.js
const salt = (await randomBytes(16)).toString('hex');
const hash = (await scrypt(password, salt, 64)).toString('hex');

const newUser = {
    // ...
    password: hash,
    salt: salt,
};
```
*Without this:* Compromised databases would immediately expose all user passwords.

## 3. Session & Identity Integrity
**Vulnerability:** JWTs are stateless; if a user is deleted or their role is changed, their token remains valid until expiry.
**Solution:** Mandatory DB lookup in `authenticateJWT`.

```javascript
// src/auth/middleware.js
const decoded = jwt.verify(token, JWT_SECRET);
const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });

if (!user) {
    return res.status(401).json({ error: "Unauthorized: User no longer exists" });
}
```
*Without this:* A deleted user could still access the system for up to 1 hour using their cached token.

## 4. Role-Based Access Control (RBAC)
**Vulnerability:** Any authenticated user could potentially call "Organizer-only" endpoints.
**Solution:** Explicit role checks in routes.

```javascript
// src/event_path.js (POST /)
router.post('/', authenticateJWT, async (req, res) => {
    if (req.userRole !== 'organizer') {
        return res.status(403).json({ error: "Only organizers can create events" });
    }
    // ...
});
```
*Without this:* Regular users could create unauthorized events or scan guest QR codes.

## 5. Ownership Verification (IDOR Prevention)
**Vulnerability:** An authenticated user might try to delete an event they didn't create by guessing the ID.
**Solution:** Verifying `creatorId` matches `req.userId`.

```javascript
// src/event_path.js (DELETE /:id)
const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
if (event.creatorId !== req.userId) {
    return res.status(403).json({ error: "Unauthorized" });
}
```
*Without this:* Any user could delete any event in the system by sending a DELETE request to `/api/events/<any_id>`.

## 6. Payment Verification (HMAC)
**Vulnerability:** Users could "spoof" successful payments by calling the join endpoint directly or sending fake transaction IDs.
**Solution:** Server-side HMAC SHA256 signature verification.

```javascript
// src/event_path.js (POST /verify-payment)
const body = razorpay_order_id + "|" + razorpay_payment_id;
const expectedSignature = crypto
    .createHmac("sha256", razor_secret_key)
    .update(body.toString())
    .digest("hex");

if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
}
```
*Without this:* Users could join paid events for free by mimicking the successful response structure.

## 7. Atomic Capacity Management
**Vulnerability:** Race conditions where two users join a 100-person event simultaneously, resulting in 101 attendees.
**Solution:** Atomic `$expr` checks in MongoDB.

```javascript
// src/event_path.js (POST /join)
const eventUpdate = await eventsCollection.updateOne(
    { 
        _id: new ObjectId(eventId),
        $expr: { $lt: [{ $size: "$attendees" }, "$maxAttendees"] }
    },
    { $push: { attendees: { ... } } }
);
```
*Without this:* High-traffic events would frequently overbook, causing logistical issues for hosts.
