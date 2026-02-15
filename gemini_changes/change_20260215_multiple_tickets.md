# Change Log: Multiple Ticket Purchase & Quota

## Date: 2026-02-15
## Description
Implemented functionality for users to purchase multiple tickets for a single event (both Free and Paid), up to a maximum of **10 tickets per user**.

## Changes

### Backend (`src/event_path.js`)
- **`POST /create-order`**: 
    - Added check: `(userTicketCount + quantity) <= 10`.
    - Returns specific error if limit exceeded.
- **`POST /verify-payment`**: 
    - Added check: `(userTicketCount + quantity) <= 10` (Security enforcement).
    - Inserts multiple tickets into `attendees`.
- **`POST /join`**: 
    - Now accepts `quantity` (default 1).
    - Added check: `(userTicketCount + quantity) <= 10`.
    - Removed `$ne: userId` query constraint to allow re-joining (buying more).
    - Inserts multiple tickets.

### Frontend (`dist/event.html`)
- Added **Quantity Selector** UI (`+` / `-` buttons).
- Updated `renderEvent` logic:
    - Calculates `userTicketCount`.
    - Shows selector if `userTicketCount < 10` and event not sold out.
    - Updates button text: "BUY MORE", "MAX LIMIT REACHED".
    - Passes `quantity` to backend.

### Frontend (`dist/index.html`)
- Added **Quantity Selector** logic to `openDetail` modal.
- Introduced `currentMaxQty` global variable to dynamically cap the selector based on how many tickets the user already owns.
- Updated `joinClub` to handle Free events correctly (calling `FidaAPI.events.join`) and pass quantity for both Free and Paid flows.

### Frontend (`dist/script.js`)
- Updated `FidaAPI.events.join` to accept `quantity`.

## Validation
- **Quota:** Users cannot exceed 10 tickets per event.
- **Availability:** Checks against global event capacity (`maxAttendees`).
- **UX:** Button text reflects state ("Buy More" vs "Get Pass").
