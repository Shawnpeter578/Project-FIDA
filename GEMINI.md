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
    *   `src/auth_path.js`: Authentication (Signup, Login, Me, Google).
    *   `src/event_path.js`: Event CRUD, Joining, Check-in.

### Key Directories
*   `src/`: Backend logic.
*   `dist/`: Public frontend assets (served statically).
    *   `index.html`: Main application logic (Dashboard, Feed, Scanner).
    *   `login.html`: Dedicated authentication page.
    *   `style.css`: "Platinum & Crimson" theme styles.
*   `tests/`: Jest integration tests.
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
    *   **User:** Join events, view passes, generate QR codes.
    *   **Organizer (Host):** Create events, scan QR codes, manage guest lists.
*   **Event Management:** Image uploads, categorical filtering, mode (online/offline).
*   **Ticket System:** QR code generation (Frontend) and Validation (Backend).
*   **UI:** Glassmorphism design, "Dock" navigation, animated transitions.
