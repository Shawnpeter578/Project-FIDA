# Clubapp / GigByCity

## Project Overview
GigByCity is a social event platform designed to connect hosts with attendees for exclusive underground events. It features a modern, mobile-first "Ultra UI" frontend and a Node.js/Express backend.

**Tech Stack:**
*   **Runtime:** Node.js
*   **Framework:** Express.js (v5.x)
*   **Database:** MongoDB (Native Driver)
*   **Authentication:** 
    *   **Strategies:** Google OAuth (GIS) & Email/Password (Scrypt hashing).
    *   **Session:** JWT (JSON Web Tokens) stored in `localStorage` (`fida_token`).
*   **File Storage:** Cloudinary (via Multer).
*   **Frontend:** Vanilla HTML/CSS/JS (SPA-like experience within `index.html`).

## Architecture
The application follows a simplified MVC structure where controllers are integrated directly into route definitions ("Fat Routes").

*   **Entry Point:** `src/server.js` (DB connection -> App start).
*   **App Config:** `src/app.js` (Middleware, CORS, Routes).
*   **Database:** `src/database/mongodb.js` (Singleton connection pattern).
*   **Routes:**
    *   `src/auth_path.js`: Authentication (Signup, Login, Me, Google) & Profile Management (`PUT /me`).
    *   `src/event_path.js`: Event CRUD, Joining, Check-in, & Paginated Feed (`GET /`).

### Key Directories
*   `src/`: Backend logic.
*   `dist/`: Public frontend assets (served statically).
    *   `index.html`: Main application logic (Dashboard, Feed, Scanner, Profile).
    *   `login.html`: Dedicated authentication page.
    *   `script.js`: Core API wrapper (`FidaAPI`).
    *   `style.css`: "Platinum & Crimson" theme styles.
*   `tests/`: Jest integration tests (Auth, Events, Profile).
*   `gemini_changes/`: Automated change logs.

## Building and Running

### Prerequisites
*   Node.js (v18+)
*   MongoDB Instance
*   `.env` file (see Configuration)

### Commands
| Command | Description |
| :--- | :--- |
| `npm start` | Starts the server (`node src/server.js`). |
| `npm test` | Runs Jest tests. |

## Configuration
Requires `.env` file:
```env
PORT=3000
DATABASE_URL=mongodb://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
CLOUDINARY_cloud_name=...
CLOUDINARY_api_key=...
CLOUDINARY_api_secret=...
```

## Features
*   **Role-Based Access:** 
    *   **User:** Join events, view passes, generate QR codes, manage profile.
    *   **Organizer (Host):** Create events, scan QR codes, manage guest lists, manage organization profile.
*   **Event Feed:** Optimized "Recent Releases" ranking with lazy loading (pagination) support.
*   **Event Management:** Image uploads, categorical filtering, mode (online/offline).
*   **Ticket System:** QR code generation (Frontend) and Validation (Backend).
*   **UI:** Glassmorphism design, "Dock" navigation, animated transitions.

## Code of Conduct
1.  **Transparency:** All structural or logic changes performed by the agent MUST be logged in the `gemini_changes/` folder with a timestamped Markdown file.
2.  **Planning:** Before executing any significant mutation, the agent MUST update `prompt.md` with a detailed "Course of Action". This plan serves as the technical contract for the upcoming task.
3.  **Stability:** Every feature addition or bug fix should be accompanied by corresponding integration tests in the `tests/` directory to prevent regressions.
4.  **Consistency:** Adhere strictly to the "Platinum & Crimson" design system and the "Fat Routes" architecture established in the project.
