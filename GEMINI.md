# Clubapp / GigByCity

## Project Overview
GigByCity is a social event platform designed to connect hosts with attendees for exclusive underground events. It features a modern, mobile-first "Ultra UI" frontend and a Node.js/Express backend.

**Tech Stack:**
*   **Runtime:** Node.js
*   **Framework:** Express.js (v5.x)
*   **Database:** MongoDB (Native Driver)
*   **Authentication:** 
    *   **Strategies:** Google OAuth (GIS), Apple Auth (Beta) & Email/Password (Scrypt hashing).
    *   **Session:** JWT (JSON Web Tokens) stored in `localStorage` (`fida_token`).
    *   **Admin Session:** `express-session` (Cookie-based).
*   **File Storage:** Cloudinary (via Multer).
*   **Email:** Brevo (Nodemailer) with CID-embedded QR codes.
*   **Frontend:** Vanilla HTML/CSS/JS (SPA-like experience within `index.html`).

## Architecture
The application follows a simplified MVC structure where controllers are integrated directly into route definitions ("Fat Routes").

*   **Entry Point:** `src/server.js` (DB connection -> App start).
*   **App Config:** `src/app.js` (Middleware, CORS, Routes).
*   **Database:** `src/database/mongodb.js` (Singleton connection pattern).
*   **Routes:**
    *   `src/auth_path.js`: Authentication (Signup, Login, Me, Google) & Profile Management (`PUT /me`).
    *   `src/event_path.js`: Event CRUD, Joining (Razorpay), Check-in, Artist Applications & Feed.
    *   `src/admin_path.js`: Admin Dashboard API (Login, Data, Delete).

### Key Directories
*   `src/`: Backend logic.
    *   `auth/`: OAuth strategies and JWT middleware.
    *   `database/`: MongoDB and Cloudinary integrations.
    *   `utils/`: Email utilities and helper functions.
*   `dist/`: Public frontend assets.
    *   `index.html`: Main User Dashboard & Feed.
    *   `login.html`: Unified authentication page.
    *   `organizer.html` / `organizer.app.js`: Organizer Management Console.
    *   `artist-dashboard.html`: Artist-specific interface.
    *   `admin.html`: Admin Dashboard SPA.
    *   `script.js`: Core API wrapper (`FidaAPI`).
*   `tests/`: Jest integration tests (Auth, Events, Profile, Email).
*   `gemini_changes/`: Automated change logs.

## Building and Running

### Prerequisites
*   Node.js (v18+)
*   MongoDB Instance
*   `.env` file (see Configuration)

### Commands
| Command | Description |
| :--- | :--- |
| `npm start` | Starts the production server (`node src/server.js`). |
| `npm test` | Runs Jest integration tests. |

## Configuration
Requires `.env` file:
```env
PORT=3000
DATABASE_URL=mongodb://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
BREVO_USER=...
BREVO_PASS=...
RAZOR_KEY=...
RAZOR_SECRET_KEY=...
CLOUDINARY_cloud_name=...
CLOUDINARY_api_key=...
CLOUDINARY_api_secret=...
ADMIN_PASSWORD=...
SESSION_SECRET=...
```

## Features
*   **Role-Based Access:** 
    *   **User:** Join events (Free/Paid), view passes, generate QR codes, manage profile.
    *   **Organizer (Host):** Create events, scan QR codes (Check-in), manage guest lists, view sales analytics.
    *   **Artist:** Apply to perform at events, manage artist profile.
*   **Admin Dashboard:**
    *   Secure password-based login (Session auth).
    *   Tabbed view for Users and Events.
    *   User role filtering and management (Delete).
    *   Event management (Delete).
    *   **Organizer Analytics:** Revenue calculation and event history in expanded user view.
*   **Event Feed:** Optimized "Recent Releases" ranking with lazy loading (pagination) support.
*   **Event Management:** Image uploads, categorical filtering, mode (online/offline), artist application toggles.
*   **Ticket System:** 
    *   **Purchase:** Integrated Razorpay for paid events with multi-ticket support.
    *   **Delivery:** Automated email delivery with CID-embedded QR codes.
    *   **Validation:** Secure hyphenated QR format (`eventId-ticketId`) with replay protection (Check-in).
*   **UI:** Glassmorphism "Ultra UI" design, "Dock" navigation, Crimson & Platinum theme.

## Code of Conduct
1.  **Transparency:** All structural or logic changes performed by the agent MUST be logged in the `gemini_changes/` folder with a timestamped Markdown file.
2.  **Planning:** Before executing any significant mutation, the agent MUST update `prompt.md` with a detailed "Course of Action". This plan serves as the technical contract for the upcoming task.
3.  **Stability:** Every feature addition or bug fix should be accompanied by corresponding integration tests in the `tests/` directory to prevent regressions.
4.  **Consistency:** Adhere strictly to the "Platinum & Crimson" design system and the "Fat Routes" architecture established in the project.
