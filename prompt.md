# Action Plan: Omni-Fix (Low Latency Scanner + Group Validation)

## Objective
Address two critical areas:
1.  **UX/Performance:** Reduce QR scanning latency to <100ms and provide immediate feedback.
2.  **Reliability:** Fix the "Ticket not found" error affecting group ticket validations (where multiple attendees share the same `userId` but have unique `ticketId`s) by robustifying the backend query logic.

## Course of Action

### Phase 1: Scanner Tuning (The Eye)
**File:** `dist/organizer.app.js`
**Goal:** Optimize camera for speed (720p, 30fps) and enforce event selection.

```javascript
    toggleScanner() {
        // 1. Safety Check: Enforce Event Selection
        if (!this.activeEventId && !this.isScanning) {
            this.showToast('Please select an event from the Events tab first!', 'error');
            if(window.switchTab) window.switchTab('events', document.querySelectorAll('.nav-item')[1]);
            return;
        }

        const overlay = document.getElementById('scanner-overlay');
        if (this.isScanning) {
            this.isScanning = false;
            overlay.classList.remove('active');
            if (this.scanner) {
                this.scanner.stop().then(() => this.scanner.clear());
            }
        } else {
            this.isScanning = true;
            overlay.classList.add('active');
            
            // 2. Optimization: High FPS, Lower Res, QR Only
            this.scanner = new Html5Qrcode("reader");
            const config = { 
                fps: 30, 
                qrbox: { width: 250, height: 250 },
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 720 },
                    height: { ideal: 720 },
                    advanced: [{ focusMode: "continuous" }]
                }
            };
            
            this.scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => this.onScanSuccess(decodedText)
            ).catch(err => {
                this.isScanning = false;
                overlay.classList.remove('active');
                this.showToast('Camera access denied: ' + err, 'error');
            });
        }
    }
```

### Phase 2: Immediate Feedback Logic (The Brain)
**File:** `dist/organizer.app.js`
**Goal:** Instant physics feedback and async verification loop.

```javascript
    async onScanSuccess(decodedText) {
        if (!this.isScanning) return;
        
        // 1. Instant Physics Feedback
        if (navigator.vibrate) navigator.vibrate(200);
        
        this.scanner.pause();
        const [eventId, ticketId] = decodedText.split('-');

        // 2. Verification UI State
        this.showScanResult(null, 'Verifying...'); 

        // 3. Async Backend Call
        const res = await this.performCheckin(eventId, ticketId);
        
        // 4. Update UI with Result
        if (res.success) {
            this.showScanResult(true, 'ACCESS GRANTED');
            this.showToast('Check-in Successful', 'success');
        } else if (res.error === 'Ticket already used') {
            this.showScanResult(false, 'ALREADY SCANNED'); 
            const title = document.getElementById('res-title');
            if(title) title.style.color = '#F59E0B'; // Orange warning
            this.showToast('Ticket used previously', 'error');
        } else {
            this.showScanResult(false, res.error || 'INVALID TICKET');
            this.showToast(res.error || 'Check-in Failed', 'error');
        }
        
        // 5. Resume
        setTimeout(() => {
            document.getElementById('scan-pop').classList.remove('show');
            if (this.isScanning) this.scanner.resume();
        }, 2000);
    }
```

### Phase 3: Robust Backend Validation (The Delta Fix)
**File:** `src/event_path.js`
**Goal:** Fix the "Ticket not found" issue for group tickets. 

**Diagnosis:** 
The issue arises when multiple attendees (group purchase) exist in the `attendees` array. Using standard dot notation queries (`"attendees.ticketId": ...`) without `$elemMatch` can lead to ambiguous matching where the query matches the *document* (because different elements satisfy different parts of the query) but the positional `$` operator fails to identify a single correct element to update. This causes `matchedCount: 0`, leading to the fallback logic which (if also brittle) reports "Not Found".

**The Fix:**
1.  **Trim Inputs:** `ticketId.trim()` to ensure exact string matching (removing hidden whitespace from QR payload).
2.  **Strict Update Query:** Use `$elemMatch` inside the `updateOne` filter. This forces MongoDB to find a *single* array element that satisfies *both* the `ticketId` and `status` criteria, ensuring the `$` operator updates the correct ticket.
3.  **Strict Fallback:** Use `$elemMatch` in the fallback diagnosis to accurately distinguish between "Already Used" (Status mismatch) and "Not Found" (ID mismatch).

```javascript
router.post('/checkin', authenticateJWT, async (req, res) => {
    try {
        const eventsCollection = getEventsCollection();
        const { eventId, ticketId } = req.body; 
        
        if (!eventId || !ticketId) {
            return res.status(400).json({ error: "Missing eventId or ticketId" });
        }
        
        // FIX: Trim inputs to avoid invisible char issues
        const cleanTicketId = ticketId.trim();

        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
        if (!event) return res.status(404).json({ error: "Event not found" });

        if (req.userRole !== 'organizer' && event.creatorId !== req.userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // 1. Atomic Check-in with STRICT Matching
        // Use $elemMatch to ensure we target the EXACT ticket element that is NOT checked-in
        const result = await eventsCollection.updateOne(
            { 
                _id: new ObjectId(eventId), 
                attendees: { 
                    $elemMatch: { 
                        ticketId: cleanTicketId, 
                        status: { $ne: "checked-in" } 
                    } 
                }
            },
            { $set: { "attendees.$.status": "checked-in" } }
        );

        // 2. Diagnostic Fallback (If Update Failed)
        if (result.matchedCount === 0) {
            // Check if ticket exists at all (ignoring status)
            const existing = await eventsCollection.findOne(
                { 
                    _id: new ObjectId(eventId), 
                    attendees: { $elemMatch: { ticketId: cleanTicketId } } 
                },
                { projection: { "attendees.$": 1 } }
            );

            if (existing && existing.attendees && existing.attendees.length > 0) {
                const ticket = existing.attendees[0];
                if (ticket.status === 'checked-in') {
                    return res.status(409).json({ error: "Ticket already used" });
                }
            }
            
            // If we are here: Ticket ID truly doesn't exist in this event
            console.log(`Ticket not found: ${cleanTicketId} in event ${eventId}`);
            return res.status(404).json({ error: "Ticket not found" });
        }

        res.status(200).json({ success: true, message: "Check-in successful" });
    } catch (e) {
        console.error("Check-in Error:", e);
        res.status(500).json({ error: "Check-in failed" });
    }
});
```
