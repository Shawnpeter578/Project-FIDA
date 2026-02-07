 ? API Integration Flow > POST /api/events/verify-payment (User can join with multiple tickets)

   thrown: "Exceeded timeout of 5000 ms for a test.
   Add a timeout value to this test to increase the timeout, if this is a long-running test. See ht
ps://jestjs.io/docs/api#testname-fn-timeout."

     282 |   });
     283 |
   > 284 |   test('POST /api/events/verify-payment (User can join with multiple tickets)', async ()
=> {
         |   ^
     285 |     const razorpay_order_id = 'test_order_id';
     286 |     const razorpay_payment_id = 'test_payment_id';
     287 |     const crypto = require('crypto');

     at test (tests/app.test.js:284:3)
     at Object.describe (tests/app.test.js:159:1)

 ? API Integration Flow > GET /api/events (Verify Data Persistence & Creator Name)

   expect(received).toBe(expected) // Object.is equality

   Expected: "checked-in"
   Received: "paid"

     392 |     // Check status of the one we checked in
     393 |     const checkedInTicket = attendees.find(a => a.ticketId === global.testTicketId);
   > 394 |     expect(checkedInTicket.status).toBe('checked-in');
         |                                    ^
     395 |
     396 |     expect(event.creatorName).toBe('Test ORGANIZER');
     397 |     expect(event.comments[0].text).toBe("Nice event!");

     at Object.toBe (tests/app.test.js:394:36)