# Plan: Update Integration Tests for New Features

## Goal
Update `tests/app.test.js` to cover the recently added features:
1.  **Public Event Detail Page**: `GET /api/events/:id`
2.  **Multi-Ticket Support**:
    *   `POST /api/events/create-order` (Quota limits)
    *   `POST /api/events/verify-payment` (Multiple ticket generation)
    *   `POST /api/events/join` (Free event multiple tickets)

## Proposed Changes to `tests/app.test.js`

### 1. Public Event Detail (`GET /api/events/:id`)
*   **Action**: Add a new test case after event creation.
*   **Steps**:
    *   Request `GET /api/events/${eventId}`.
    *   **Expect**: Status `200`.
    *   **Expect**: Response body matches the created event's title and price.
*   **Edge Case**: Request with invalid ID (expect `400` or `404`).

### 2. Free Event Multi-Ticket (`POST /api/events/join`)
*   **Action**: Create a new *Free* event in the test flow.
*   **Steps**:
    *   Organizer creates a free event (`price: 0`).
    *   User calls `POST /api/events/join` with `quantity: 3`.
    *   **Expect**: Status `200`.
    *   **Verify**: Fetch event and check `attendees` has 3 entries for this user.

### 3. Paid Event Quota Limit (`POST /api/events/create-order`)
*   **Action**: Add a test case attempting to exceed the limit.
*   **Steps**:
    *   User attempts to buy `quantity: 11` for the paid event.
    *   **Expect**: Status `400` (Error: Limit reached).
    *   User attempts to buy `quantity: 9` (if they already have 2).
    *   **Expect**: Status `400` (Total > 10).

### 4. Verify Payment & Ticket Generation
*   **Action**: Enhance existing `verify-payment` test.
*   **Steps**:
    *   Ensure the assertion explicitly checks that `attendees` array length increased by `quantity`.
    *   Verify that each ticket has a unique `ticketId`.

## Execution Plan
1.  **Read** `tests/app.test.js` (Done).
2.  **Modify** `tests/app.test.js`:
    *   Insert `GET /:id` test.
    *   Insert Free Event creation and join test.
    *   Add negative test for Quota Exceeded.
3.  **Run Tests**: Execute `npm test` to validate.
4.  **Fix**: Address any failures (likely due to mock state persistence or logic).