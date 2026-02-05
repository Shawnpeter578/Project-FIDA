# GigByCity

A social protocol for underground event discovery.

## ⚡ Quick Start (Frontend Devs)

1.  **Clone & Install:**
    ```bash
    git clone <repo-url>
    cd GigByCity
    npm install
    ```
2.  **Configure Environment:**
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    DATABASE_URL=mongodb+srv://...
    JWT_SECRET=your_secret_key
    GOOGLE_CLIENT_ID=your_google_client_id
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    ```
3.  **Run:**
    ```bash
    npm start
    ```
    *Server runs at `http://localhost:3000`. Frontend is served statically from `dist/`.*

## 📂 Architecture

*   **`src/` (Backend):** Node.js + Express. Handles API routes (`/api/auth`, `/api/events`).
*   **`dist/` (Frontend):** Vanilla JS SPA.
    *   `index.html`: Main User UI (Feed, Pass, Scanner).
    *   `organizer.html`: Host Console (Dashboard, Create Event).
    *   `script.js`: Legacy user logic.
    *   `organizer.app.js`: Modern host logic.

## 📜 Ye Olde Warnings (Heed These Well)

**Hark, ye frontend squires and pixel-pushers!**

Touch NOT the `src/` directory, for therein lies the **Server Logic**, a beast of burden and complexity. 'Tis written in the ancient tongue of Node, and meddling with its routes or middleware shall bring down the wrath of 500 Internal Server Errors upon thy head.

**Verily, I say unto thee:**
*   **Thou shalt not** modify the `auth_path.js` lest thou lock thyself out of the kingdom.
*   **Thou shalt not** alter the `mongodb.js` connection, for the database is a jealous god.
*   **Thou shalt** confine thy tinkery to `dist/`, where the CSS flows like wine and the HTML stands tall.

Violators shall be cast into the abyss of `undefined`, weeping and gnashing their teeth.