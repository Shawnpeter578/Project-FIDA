# Current Task: Update ClubApp Mini to New Backend Regime

The "mini" application currently relies on an external, possibly outdated backend and lacks support for the recent architectural changes (Pagination, Profile Editing). The goal is to align its frontend client (`script.js`) and UI (`index.html`) with the local `GigByCity` backend.

## Course of Action

### 1. Refactor API Client (`clubapp-mini/dist/script.js`)
-   **Target Local Backend:** Change `BASE_URL` from the Koyeb deployment to `http://localhost:3000/api`.
-   **Implement Pagination:** Update `FidaAPI.events.getAll` to accept `page` and `limit` parameters, reflecting the new `GET /events` signature.
-   **Enable Profile Management:**
    -   Replace the mocked `FidaAPI.profile.loadDetails` with a real `GET /auth/me` call.
    -   Add `FidaAPI.profile.update` to interface with the new `PUT /auth/me` endpoint.

### 2. Update UI Logic (`clubapp-mini/dist/index.html`)
-   **Lazy Loading:**
    -   Modify `fetchAndRenderFeed` to support appending data (infinite scroll or "Load More" pattern).
    -   Add a "Load More" button to the event feed that triggers the next page fetch.
-   **Profile Wiring:**
    -   Update `saveProfile` to call `FidaAPI.profile.update` instead of just showing a toast.
    -   Ensure profile data loading (`loadProfileData`) correctly maps the response fields from `GET /auth/me`.
-   **Cleanup:** Remove legacy hacks (like duplicate `mode` fields in Event Create) and ensure form submissions align with the expected `multipart/form-data` structure where applicable.

## Verification Plan
-   **Manual Test:** Serve the mini app (using its simple server) and verify:
    -   Login works against the local DB.
    -   Feed loads the first 20 events.
    -   "Load More" fetches the next batch.
    -   Profile updates persist to the local MongoDB.