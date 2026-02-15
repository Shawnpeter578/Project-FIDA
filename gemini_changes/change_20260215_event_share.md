# Change Log - Shareable Event Page

## Summary
Implemented a public event detail page (`event.html`) and corresponding backend endpoint to allow sharing events via URL. Unauthenticated users can view details but must sign in to purchase.

## Changes

### Backend
- **`src/event_path.js`**: Added `GET /:id` public endpoint to fetch single event details.

### Frontend
- **`dist/event.html`**: Created new file.
    - Displays event details (image, title, desc, price).
    - Checks for auth token silently.
    - "Get Pass" button prompts for login if guest, or proceeds to payment if user.
    - "Share" button copies URL.
- **`dist/script.js`**: Added `getOne(id)` to `FidaAPI.events`.
- **`dist/index.html`**: 
    - Updated feed card `onclick` and button to navigate to `event.html`.
    - Added logic to handle `?view=passes` URL parameter for better redirection from `event.html`.

## Verification
- Users can navigate to `event.html?id=...` without login.
- "Get Pass" triggers `authRequiredModal` if not logged in.
- Main feed links correctly to the new page.
