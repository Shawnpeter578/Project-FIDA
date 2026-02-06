# TESTING FILE BUGS - RESOLVED (2026-02-06)

All previously reported bugs in `tests/app.test.js` have been addressed:

1.  **Environment Variables**: Added `RAZOR_KEY` and `RAZOR_SECRET_KEY` to test environment setup to satisfy `src/config/config.js` strict checks.
2.  **Missing Fields**: Added `price` to `POST /api/events` payload in tests.
3.  **Payment Flow**: Refactored join tests to use `POST /api/events/create-order` and `POST /api/events/verify-payment` with a `Razorpay` mock and `crypto` signature generation.
4.  **Mock DB Logic**: Improved `updateOne` and `insertOne` mocks to ensure arrays like `attendees` and `comments` are properly initialized and modified in the mock state, preventing `TypeError`.
5.  **Status Check**: Updated expectations to verify `status: 'paid'` for event attendees.