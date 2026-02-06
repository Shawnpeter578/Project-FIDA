# Course of Action: Fix Google Sign-In & Restore Missing Logic

## Status
-   **Resolved:** "White Screen" hanging issue (Fixed via `helmet` headers).
-   **Verified:** Backend security (`src/auth/middleware.js`) is robust.
-   **Identified Critical Bugs:**
    1.  **Google Sign-In Lockout:** `dist/login.html` fails to map/validate roles, locking out Organizers.
    2.  **Broken Navigation & Features:** `dist/script.js` is missing core utility functions (`switchView`, `saveProfile`, `handleSearch`), rendering the app navigation and profile management non-functional.

## Plan
1.  **Modify `dist/login.html`**:
    -   **Fix Google Auth:** Implement role mapping (`host` -> `organizer`) and strict role validation to prevent the "Fan on Organizer Tab" lockout loop.

2.  **Modify `dist/script.js`**:
    -   **Restore Functions:** Implement the missing UI logic:
        -   `switchView(viewName, btnEl)`: To handle dock navigation and view toggling.
        -   `handleSearch(query)`: To filter the event feed.
        -   `saveProfile(e)`: To handle profile form submission (`PUT /api/auth/me`).
        -   `openFilterModal()`, `closeCreateModal()`: For UI interactions.
    -   **Fix Host Dashboard:** Ensure `renderHostDashboard` doesn't crash if `currentUser` is null (though `checkAuth` handles this).

## Verification
-   **Auth Test:** Sign up/in as Organizer via Google -> Verify Dashboard access.
-   **Nav Test:** Click all Dock items -> Verify view changes.
-   **Feature Test:** Update Profile -> Verify data persistence.
