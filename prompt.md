w# Proposal: Organizer Dashboard Integration

## Goal
Fully functionalize `organizer.html` by connecting it to the backend API, enforcing access control, and implementing feature-rich event management without DB schema changes.

## Architecture
- **Frontend Logic:** Move inline scripts to `dist/js/organizer.app.js` (Class-based `OrganizerConsole`).
- **State Management:** Reactive state for `events` and `currentTab`.
- **Security:** Strict role validation on load.

## Implementation Plan

### 1. Access Control
- **Logic:** On load, verify `fida_token` and `fida_user` from `localStorage`.
- **Enforcement:** If `!token` or `user.role !== 'organizer'`, redirect to `/login.html` immediately.

### 2. Backend Integration
- **Dashboard Data:**
    - Fetch all events via `GET /api/events`.
    - Client-side filter: `events.filter(e => e.creatorId === currentUser._id)`.
    - **Revenue:** Calculate `Σ (event.price * event.attendees.length)`.
    - **Sales:** Calculate `Σ event.attendees.length`.
- **Event Creation:**
    - Map form inputs to `FormData`.
    - Endpoint: `POST /api/events`.
    - Handle image upload via existing `multer` -> `Cloudinary` flow.
- **Guest Management:**
    - Use `event.attendees` array (contains `{ userId, name, status }`).
    - Display real names and statuses (Pending/Checked-in).
    - **QR Scanning:** Connect `html5-qrcode` to `POST /api/events/checkin`.

### 3. Scalability Improvements
- **Class Structure:**
    ```javascript
    class OrganizerConsole {
        constructor() { ... }
        async init() { ... } // Auth check & data fetch
        render() { ... } // UI updates
        async createEvent(formData) { ... }
    }
    ```
- **Benefit:** Easy to add new tabs (e.g., "Analytics", "Promotions") by extending the class methods.

## Constraints Check
- [x] **No DB Changes:** Uses existing `attendees` schema and derived stats.
- [x] **Scalable:** Modular JS file.
- [x] **Security:** Frontend role guards + existing Backend middleware.