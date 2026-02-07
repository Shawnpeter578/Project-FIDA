# Organizer Dashboard Update: Descriptions & Sales Tracking

## Goal
Enable event descriptions in the Organizer Console (`organizer.html`) and implement aggregated ticket sales notifications in the dashboard.

## 1. Event Description Implementation

### 1.1 Frontend: `dist/organizer.html`
**Action:** Add a Textarea input for the event description in the Create Event modal.
**Location:** Inside `<div class="modal-body">`, after the "Event Title" group.

```html
<div class="form-group">
    <label class="form-label">Description</label>
    <textarea id="cDesc" class="inp-modern" rows="3" placeholder="Tell people about your event..." style="height:auto; padding-top:16px; font-family:inherit;"></textarea>
</div>
```

### 1.2 Logic: `dist/organizer.app.js`
**Action:** Update `handleCreate` to include the description in the API payload.

```javascript
// In setupCreateForm() -> handleCreate
formData.append('description', document.getElementById('cDesc').value);
```

## 2. Dashboard Sales Notifications

### 2.1 Logic: `dist/organizer.app.js`
**Requirement:** "Dashboard should show user_name bought x tickets everytime someone buys x tickets."
**Current State:** It currently lists individual attendees as separate activities.
**New Strategy:** Group attendees by `paymentId` (which identifies a single transaction) to detect multi-ticket purchases.

**Implementation in `renderDashboard()`:**
1.  **Collect All Transactions:**
    Iterate through all events and their attendees.
2.  **Group by Transaction:**
    Use `paymentId` as a unique key for paid tickets. For free tickets (no `paymentId`), use `ticketId` as the key.
3.  **Generate Activity Feed:**
    *   If `paymentId` exists and count > 1: "User bought X tickets".
    *   Else (Count == 1): "User bought a ticket" (or "joined" if free).
4.  **Display:** Render the sorted list.

**Code Snippet (Plan):**
```javascript
// Inside renderDashboard()

let allActivities = [];

this.events.forEach(e => {
    if (!e.attendees) return;

    // Grouping map
    const groups = {};

    e.attendees.forEach(a => {
        // Use paymentId for grouping transactions. 
        // If paymentId is missing (free event or old data), fall back to unique ticketId.
        const key = a.paymentId || a.ticketId || `single_${Math.random()}`;
        
        if (!groups[key]) {
            groups[key] = {
                name: a.name || 'Guest',
                count: 0,
                time: a.joinedAt || new Date(), // Use timestamp of the first processed ticket in the group
                isPaid: !!a.paymentId,
                eventTitle: e.title
            };
        }
        groups[key].count++;
    });

    // Convert groups to activity items
    Object.values(groups).forEach(g => {
        let text = '';
        if (g.count > 1) {
            text = `${g.name} bought <span style="color:var(--text-main); font-weight:700;">${g.count} tickets</span> for ${g.eventTitle}`;
        } else {
            text = `${g.name} ${g.isPaid ? 'bought a ticket for' : 'joined'} ${g.eventTitle}`;
        }

        allActivities.push({
            text: text,
            time: g.time
        });
    });
});

// Sort by time (Newest first)
allActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

// Render top 10
const feedContainer = document.getElementById('activity-feed');
// ... (Render HTML)
```

## 3. Execution Order
1.  **Modify `dist/organizer.html`** to add the Description field.
2.  **Modify `dist/organizer.app.js`** to:
    *   Capture `description` in `handleCreate`.
    *   Implement the Transaction Grouping logic in `renderDashboard`.
3.  **Verify** by creating a new event with a description and checking if `activity-feed` renders correctly (mock data might be needed if no real multi-ticket purchases exist yet).