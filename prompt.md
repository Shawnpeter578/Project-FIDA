# Task: Razorpay Integration for Paid Event Registrations

Integrate Razorpay into the GigByCity platform to handle payments for event registrations. Every event registration now requires a transaction in INR.

## Phase 1: Preparation & Environment
1.  **Dependency:** Install `razorpay` npm package.
2.  **Configuration:** Update `.env` with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3.  **Config Module:** Update `src/config/config.js` to include Razorpay credentials.

## Phase 2: Backend Implementation
1.  **Refactor Join Logic:** Extract the attendee registration logic from `POST /api/events/join` into a reusable internal function.
2.  **Payment Initiation Route:** Create `POST /api/events/create-order`
    *   Verify event existence and capacity.
    *   Enforce a minimum price (since "every event now needs real money").
    *   Initialize a Razorpay Order via the SDK.
    *   Return order details (ID, amount, currency) to the frontend.
3.  **Payment Verification Route:** Create `POST /api/events/verify-payment`
    *   Cryptographically verify the Razorpay signature.
    *   On success, register the user for the event using the refactored logic.
    *   Update the attendee record with payment metadata (optional).
4.  **Enforcement:** Update `POST /api/events/` (event creation) to ensure `price` is mandatory and greater than zero.

## Phase 3: Frontend Implementation
1.  **Checkout Integration:** Add the Razorpay Checkout script to `dist/index.html`.
2.  **API Wrapper Updates:** Add `createOrder` and `verifyPayment` methods to the `FidaAPI` in `dist/script.js`.
3.  **Payment Flow Logic:**
    *   Update `joinClub(id)` in `dist/index.html` to first call `createOrder`.
    *   Launch the Razorpay UI using the order details.
    *   On successful payment, call `verifyPayment` and refresh the user's passes.
    *   Add error handling for payment failures or cancellations.

## Phase 4: Verification & Testing
1.  **Integration Test:** Write tests in `tests/payment.test.js` to verify the payment verification logic (mocking Razorpay SDK).
2.  **Manual Verification:** Test the complete flow in a local environment using Razorpay's Test Mode credentials.
