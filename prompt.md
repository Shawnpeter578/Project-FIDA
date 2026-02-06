# Course of Action: Fix Google Sign-In Role Mapping & Validation

## Status
-   **Resolved:** "White Screen" hanging issue (Fixed via `helmet` config in `src/app.js`).
-   **Verified:** Backend security headers, rate limiting, and JWT checks (`src/auth/middleware.js`) are correctly implemented.
-   **Verified:** Frontend token handling in `dist/script.js` and `dist/organizer.app.js` is secure.
-   **Critical Bug:** Google Sign-In logic in `dist/login.html` has two major flaws.

## Problem Analysis
1.  **Role Mismatch (Creation Bug):**
    -   **Context:** The frontend uses `host` to denote Organizers, while the backend expects `organizer`.
    -   **Defect:** `handleGoogleCredentialResponse` sends the raw frontend role (`'host'`) to the backend. The backend rejects this as an invalid role and defaults the new user to `'user'` (Fan).
    -   **Impact:** New Organizers are created with the wrong privileges and cannot access the dashboard.

2.  **Missing Validation (Login Bug):**
    -   **Defect:** Unlike `handleLogin`, `handleGoogleCredentialResponse` does not verify if the logged-in user's role matches the currently selected tab.
    -   **Impact:** If an existing Fan tries to sign in on the Organizer tab, they are successfully logged in and redirected to the Organizer Dashboard. The Dashboard's security check (`user.role !== 'organizer'`) then rejects them, redirecting them back to login. This creates a confusing loop or bad UX.

## Plan
1.  **Modify `dist/login.html`**:
    -   **Update `handleGoogleCredentialResponse`**:
        -   **Fix Creation:** Map `currentRole` to the backend expectation (`host` -> `organizer`) before sending the API request.
        -   **Fix Validation:** After receiving the user profile, normalize the backend role (`organizer` -> `host`) and compare it with the selected `currentRole`.
        -   **Outcome:** If roles mismatch, display the error: *"This email belongs to a [Role] account..."* and abort the login.

## Verification
-   **Manual Test 1 (Creation):** Select "Organizer" tab. Sign up with a *new* Google account. Verify the user lands on `organizer.html` and stays there.
-   **Manual Test 2 (Validation):** Select "Organizer" tab. Sign in with an *existing Fan* Google account. Verify an error message is shown instead of a redirect.