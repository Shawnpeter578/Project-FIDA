 # TESTING FILE BUGS

 FAIL  tests/app.test.js (6.215 s)
  API Integration Flow
    √ POST /api/auth/google (Login as Organizer) (129 ms)
    √ POST /api/auth/google (Login as Artist) (24 ms)
    √ POST /api/auth/google (Login as User) (17 ms)
    √ GET /api/auth/me (Session Check) (24 ms)
    √ POST /api/events (User cannot create) (20 ms)
    x POST /api/events (Organizer can create) (25 ms)
    x POST /api/events/join (User can join) (43 ms)
    √ POST /api/events/join (Artist cannot join as user - Strict Mode) (15 ms)
    x POST /api/events/apply (Artist can apply) (18 ms)
    √ POST /api/events/apply (User cannot apply) (18 ms)
    x POST /api/events/comment (Add Comment) (18 ms)
    x GET /api/events (Verify Data Persistence & Creator Name) (13 ms)
    x DELETE /api/events/:eventId/comments/:commentId (Delete Comment) (11 ms)
    x DELETE /api/events/:id (Delete Event) (16 ms)
    √ POST /api/auth/logout (Sign Out) (11 ms)

  ? API Integration Flow > POST /api/events (Organizer can create)

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 400

      236 |       });
      237 |
    > 238 |     expect(res.statusCode).toBe(201);
          |                            ^
      239 |     eventId = res.body.eventId;
      240 |   });
      241 |

      at Object.toBe (tests/app.test.js:238:28)

  ? API Integration Flow > POST /api/events/join (User can join)

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 400

      246 |       .send({ eventId });
      247 |
    > 248 |     expect(res.statusCode).toBe(200);
          |                            ^
      249 |   });
      250 |
      251 |   test('POST /api/events/join (Artist cannot join as user - Strict Mode)', async () => {


      at Object.toBe (tests/app.test.js:248:28)

  ? API Integration Flow > POST /api/events/apply (Artist can apply)

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 400

      266 |         .send({ eventId });
      267 |
    > 268 |       expect(res.statusCode).toBe(200);
          |                              ^
      269 |   });
      270 |
      271 |   test('POST /api/events/apply (User cannot apply)', async () => {

      at Object.toBe (tests/app.test.js:268:30)

  ? API Integration Flow > POST /api/events/comment (Add Comment)

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 400

      286 |       .send({ eventId, text: "Nice event!" });
      287 |
    > 288 |     expect(res.statusCode).toBe(200);
          |                            ^
      289 |   });
      290 |
      291 |   test('GET /api/events (Verify Data Persistence & Creator Name)', async () => {

      at Object.toBe (tests/app.test.js:288:28)

  ? API Integration Flow > GET /api/events (Verify Data Persistence & Creator Name)

    TypeError: Cannot read properties of undefined (reading 'attendees')

      294 |
      295 |     // Check if any attendee has the matching userId
    > 296 |     const attendee = event.attendees.find(a => a.userId === userId);
          |                            ^
      297 |     expect(attendee).toBeDefined();
      298 |     expect(attendee.name).toBe('Test USER');
      299 |

      at Object.attendees (tests/app.test.js:296:28)

  ? API Integration Flow > DELETE /api/events/:eventId/comments/:commentId (Delete Comment)

    TypeError: Cannot read properties of undefined (reading 'comments')

      307 |     let res = await request(app).get('/api/events');
      308 |     let event = res.body.find(e => e._id.toString() === eventId.toString());
    > 309 |     const commentId = event.comments[0]._id;
          |                             ^
      310 |
      311 |     // Delete
      312 |     res = await request(app)

      at Object.comments (tests/app.test.js:309:29)

  ? API Integration Flow > DELETE /api/events/:id (Delete Event)

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      327 |       .set('Authorization', `Bearer ${organizerToken}`); // CHANGED - Only creator can d
elete
      328 |
    > 329 |     expect(res.statusCode).toBe(200);
          |                            ^
      330 |
      331 |     // Verify
      332 |     const fetchRes = await request(app).get('/api/events');

      at Object.toBe (tests/app.test.js:329:28)

  console.log
    [dotenv@17.2.4] injecting env (4) from .env -- tip: ?? add secrets lifecycle management: https:/
/dotenvx.com/ops

      at _log (node_modules/.pnpm/dotenv@17.2.4/node_modules/dotenv/lib/main.js:142:11)

  console.log
    Connected to MongoDB successfully!

      at log (src/database/mongodb.js:23:17)
