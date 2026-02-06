# Operation: Payment & Event Joining System

## 1. Flow Overview
1.  **Frontend**: User clicks "GET PASS". `joinClub(id)` checks if the event is paid.
2.  **Backend (`/create-order`)**: Validates event existence/capacity and returns a Razorpay `orderId`.
3.  **Frontend**: Razorpay Checkout UI opens; user completes payment.
4.  **Backend (`/verify-payment`)**: Validates HMAC signature. If valid, atomically registers the user.
5.  **Frontend**: UI refreshes to show "GOT PASS".

---

## 2. Key Components

### A. Order Initiation
**File:** `src/event_path.js`
```javascript
router.post('/create-order', authenticateJWT, async (req, res) => {
    // ... validation ...
    const options = {
        amount: Math.round(event.price * 100), // INR to Paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.status(200).json({ orderId: order.id, ... });
});
```

### B. Payment Verification & Registration
**File:** `src/event_path.js`
```javascript
router.post('/verify-payment', authenticateJWT, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId } = req.body;
    const expectedSignature = crypto.createHmac("sha256", razor_secret_key)
        .update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");

    if (expectedSignature !== razorpay_signature) return res.status(400);

    const eventUpdate = await eventsCollection.updateOne(
        { _id: new ObjectId(eventId), $expr: { $lt: [{ $size: "$attendees" }, "$maxAttendees"] } },
        { $push: { attendees: { userId, status: 'paid', paymentId: razorpay_payment_id } } }
    );
});
```

### C. Frontend Payment Handler
**File:** `dist/index.html`
```javascript
async function joinClub(id) {
    const orderData = await FidaAPI.events.createOrder(id);
    const options = {
        order_id: orderData.orderId,
        handler: async (response) => {
            const verifyRes = await FidaAPI.events.verifyPayment({ ...response, eventId: id });
            if (verifyRes.success) fetchAndRenderFeed();
        }
    };
    new Razorpay(options).open();
}
```

---

## 3. Maintenance Notes
- **Currency**: Hardcoded to `INR`.
- **Atomic Operations**: Registration uses `$expr` to prevent overbooking during verification.
- **Join Constraints**: Direct `POST /join` returns `402 Payment Required` if `event.price > 0`.
- **Receipt Limit**: Receipt IDs must be < 40 chars.
