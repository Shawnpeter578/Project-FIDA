# Fix QR Check-in System

## Goal
Fix critical flaws in the QR check-in system to ensure reliability and security. This involves standardizing the QR payload format, correcting the parsing logic in the Organizer App, patching the Backend to prevent ticket reuse, and ensuring immediate UI feedback for the scanner.

## 1. Standardize QR Format
**Decision:** Use a simple hyphenated string format: `${eventId}-${ticketId}`. This is compact and robust.

### 1.1 Update Email Logic (`src/utils/email.js`)
**Current:** JSON string `{"eventId":..., "ticketId":..., "userId":...}`.
**Change:** Switch to `${eventId}-${ticketId}`.

```javascript
// src/utils/email.js
const payload = `${event._id}-${t.ticketId}`; // Simplified Payload
const dataUri = await generateQRCode(payload);
```

### 1.2 Update User App Logic (`dist/index.html` / `script.js` block)
**Current:** `${eventId}-${ticketId}`.
**Action:** No change needed (Reference implementation).

## 2. Fix Organizer Scanner & UI Feedback (`dist/organizer.app.js`)
**Current:** Splits by hyphen but maps 2nd part to `userId` and sends incorrect payload key. UI feedback is generic.
**Change:** 
1.  Map 2nd part to `ticketId` and update API call.
2.  Implement distinct visual feedback for "Success" (Green) vs "Already Used" (Red/Orange) vs "Invalid" (Red).

```javascript
// dist/organizer.app.js -> onScanSuccess

const [eventId, ticketId] = decodedText.split('-');

// Call API
const res = await this.performCheckin(eventId, ticketId);

// Immediate UI Feedback based on result
if (res.success) {
    this.showScanResult(true, 'ACCESS GRANTED'); // Green
    this.showToast('Check-in Successful', 'success');
} else if (res.error === 'Ticket already used') {
    this.showScanResult(false, 'ALREADY SCANNED'); // Orange/Red
    this.showToast('Ticket used previously', 'error');
} else {
    this.showScanResult(false, 'INVALID TICKET'); // Red
    this.showToast(res.error || 'Check-in Failed', 'error');
}

// ... existing resume logic
```

## 3. Secure Backend Verification (`src/event_path.js`)
**Current:** Updates status to 'checked-in' without checking if it was already used. Allows infinite reuse.
**Change:** Modify the query to fail if status is already 'checked-in'.

```javascript
// src/event_path.js -> POST /checkin

const eventsCollection = getEventsCollection();
const { eventId, ticketId } = req.body;

// 1. Atomic Check & Set (If not already checked-in)
const result = await eventsCollection.updateOne(
    { 
        _id: new ObjectId(eventId), 
        "attendees.ticketId": ticketId,
        "attendees.status": { $ne: "checked-in" } // Critical Security Check
    },
    { $set: { "attendees.$.status": "checked-in" } }
);

if (result.matchedCount === 0) {
    // 2. Determine Error Type (Invalid vs Used)
    const existing = await eventsCollection.findOne(
        { _id: new ObjectId(eventId), "attendees.ticketId": ticketId },
        { projection: { "attendees.$": 1 } }
    );
    
    // Check if the ticket was found but already checked-in
    if (existing && existing.attendees[0].status === 'checked-in') {
        return res.status(409).json({ error: "Ticket already used" });
    } else {
        return res.status(404).json({ error: "Invalid Ticket" });
    }
}

res.status(200).json({ success: true, message: "Check-in successful" });
```

## Execution Order
1.  **Backend (`src/event_path.js`):** Implement the replay protection logic and specific error responses.
2.  **Email (`src/utils/email.js`):** Update the QR payload generation.
3.  **Organizer App (`dist/organizer.app.js`):** Fix the scanner parsing, update the API call to send `ticketId`, and implement the specific UI feedback logic.
4.  **Verification:**
    *   Generate a new ticket (via Email or App).
    *   Scan it once -> Expect Green "ACCESS GRANTED".
    *   Scan it again -> Expect Red/Orange "ALREADY SCANNED".