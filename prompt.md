# Analysis of `dist/login.html` & Integration Plan

## 1. Current State Analysis
The `dist/login.html` file has been reviewed. It features a modern "Ultra UI" split-screen design and appears to be in a **nearly complete state** regarding the user's requests, though with some critical gaps (likely the "unplugged" parts mentioned).

### Features Detected:
- **Role Selection:** A pill-shaped selector allows switching between **Fan (User)**, **Organizer (Host)**, and **Artist**. The UI logic (`setRole`) correctly updates the form context.
- **Google Sign-In:** A container `<div id="google-btn"></div>` is present inside `.social-auth`. 
    - **Placement:** It is **already positioned below** the email/password forms (`#login-form` and `#signup-form`), satisfying the requirement.
    - **Logic:** The `window.onload` script fetches config and initializes the Google button. It correctly captures the *current selected role* and sends it to the backend (`/api/auth/google`).
- **Backend Alignment:** The logic in `handleSignup` and `handleLogin` attempts to map frontend roles to backend roles (`host` -> `organizer`).

## 2. Identified Gaps ("Unplugged Stuff")
While the login page code is robust, the ecosystem around it has missing pieces:
1.  **Missing Artist Dashboard:** The code attempts to redirect artists to `/artist-dashboard.html`:
    ```javascript
    } else if (role === 'artist') {
        window.location.href = '/artist-dashboard.html'; 
    }
    ```
    **Critical Issue:** This file **does not exist** in the `dist/` directory. Login will succeed, but the user will face a 404 error.
2.  **Environment Dependency:** The Google button relies on `/api/auth/config` returning a valid `googleClientId`. If `.env` is missing or the backend fails this request, the button simply won't appear (silently fails).

## 3. Integration Plan

### A. Google Sign-In (Verification)
Since the code is already present and correct:
1.  **Verify:** Ensure `.env` contains `GOOGLE_CLIENT_ID`.
2.  **Test:** Start the server and confirm the button renders below the email forms.

### B. Artist Role (Completion)
To fully "plug in" the Artist role:
1.  **Create `dist/artist-dashboard.html`:**
    - Needs to match the "Platinum & Crimson" theme.
    - Should include placeholder features relevant to artists (e.g., "My Gigs", "Audience Stats", "QR Code for Backstage").
2.  **Backend Verification:**
    - `src/auth_path.js` already includes `artist` in `validRoles`.
    - No changes needed in backend logic, just functional testing.

## 4. Next Steps for Developer
1.  **Create** the missing `dist/artist-dashboard.html`.
2.  **Run** `npm start` to verify the full flow: `Login (Artist) -> Redirect -> Dashboard`.
