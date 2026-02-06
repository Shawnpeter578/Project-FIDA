# Changes Made by Gemini

## Security Enhancements

### 1. Configuration (`src/config/config.js`)
*   **Removed Hardcoded Secrets:** Default values for `JWT_SECRET`, `GOOGLE_CLIENT_ID`, and Cloudinary credentials have been removed to prevent insecure deployments.
*   **Environment Variable Enforcement:** The application now throws an error at startup if any required environment variables are missing.

### 2. Authentication (`src/auth/middleware.js`)
*   **Reduced Token Lifespan:** JWT expiration time has been reduced from `365d` (1 year) to `1h` (1 hour) to minimize the window of opportunity for stolen tokens.

### 3. Application Security (`src/app.js`)
*   **Reduced Payload Limits:** Request body size limit reduced from `50mb` to `10mb` to mitigate Denial of Service (DoS) risks.
*   **Fixed CORS:** Updated the CORS origin configuration to use a valid URL format, restricting access to trusted domains.

### 4. File Cleanup (`src/auth/apple.auth.js`)
*   **Corrupted File Handling:** Overwrote the corrupted `apple.auth.js` file with a placeholder to prevent potential import errors.

## Performance & Scalability

### 1. Pagination (`src/event_path.js`)
*   **Implemented Pagination:** The `GET /api/events` endpoint now supports `page` and `limit` query parameters.
    *   Default: Page 1, Limit 20.
    *   Prevents fetching the entire database collection in a single request.

### 2. Image Upload Optimization (`src/event_path.js`)
*   **Disk Storage:** Switched `multer` storage from memory to disk (`uploads/` directory). This prevents server memory exhaustion during file uploads.
*   **Stream Processing:** Image uploads to Cloudinary now use the file path directly instead of buffering the entire file in memory.
*   **Automatic Cleanup:** Added logic to delete temporary files from the disk after the upload process completes (success or failure).

## Frontend Improvements

### 1. API Configuration (`dist/script.js`)
*   **Dynamic BASE_URL:** Updated `BASE_URL` to dynamically switch between the production API and `http://localhost:3000/api` based on the current hostname. This ensures the frontend works correctly in both local development and deployed environments.

## Bug Fixes & Logic Improvements

### 1. "Infinity" Logic (`src/event_path.js`)
*   **Robust Parsing:** Fixed the brittle handling of "Infinity" for `maxAttendees`. It now correctly parses numbers and provides a safe fallback for invalid inputs.

### 2. Google Sign-In Fix (`src/app.js`)
*   **Resolved Popup Hang:** Updated `helmet` configuration to allow cross-origin popups by setting `crossOriginOpenerPolicy` to `same-origin-allow-popups`. This fixed the issue where Google Sign-In would hang on a white screen.

## Test Updates (`tests/app.test.js`)
*   **Environment Mocks:** Added mock environment variables to the test setup to satisfy the new strict configuration checks.
*   **Pagination Mocks:** Updated the MongoDB mock to support chained `.skip()` and `.limit()` calls used by the new pagination logic.

## Financial Integration (2026-02-06)

### 1. Razorpay Integration (`src/event_path.js`, `dist/index.html`, `dist/script.js`)
*   **Paid Event Enforcement:** Implemented real money transactions (INR) for all event registrations.
*   **Backend Order Flow:** Added `POST /api/events/create-order` and `POST /api/events/verify-payment` endpoints.
*   **Frontend Payment Flow:** Integrated Razorpay Checkout script and updated `joinClub` to handle the payment-verification lifecycle.
*   **Currency Standardization:** Transitioned UI from $ to ₹ (INR) and enforced a minimum price of 1 INR for all new events.

