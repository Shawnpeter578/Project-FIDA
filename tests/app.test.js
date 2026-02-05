// Set required env vars for config
process.env.JWT_SECRET = 'test_secret';
process.env.GOOGLE_CLIENT_ID = 'test_client_id';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
process.env.CLOUDINARY_API_KEY = 'test_key';
process.env.CLOUDINARY_API_SECRET = 'test_secret';

const request = require('supertest');
const { ObjectId } = require('mongodb');
const { app, connectToMongoDB, closeMongoDB } = require('../src/app');

// MOCKS
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockImplementation(async ({ idToken }) => {
      if (idToken.startsWith('VALID_GOOGLE_TOKEN')) {
        const suffix = idToken.split('_').pop(); // USER, ORGANIZER, ARTIST, or just TOKEN
        let email = 'testuser@example.com';
        if (suffix === 'ORGANIZER') email = 'organizer@example.com';
        if (suffix === 'ARTIST') email = 'artist@example.com';
        
        return {
          getPayload: () => ({
            email: email,
            name: `Test ${suffix}`,
            picture: 'http://example.com/pic.jpg'
          })
        };
      }
      return null;
    })
  }))
}));

const mockDb = { users: [], events: [] };

const mockCollection = (collectionName) => ({
  createIndex: jest.fn(),
  findOne: jest.fn(async (query) => {
    const col = mockDb[collectionName];
    if (query._id) return col.find(d => d._id.toString() === query._id.toString()) || null;
    if (query.email) return col.find(d => d.email === query.email) || null;
    return null;
  }),
  find: jest.fn(() => {
    const chain = {
      data: [...mockDb[collectionName]],
      sort: jest.fn(() => chain),
      skip: jest.fn((n) => { 
        // Simple mock implementation of skip
        return chain; 
      }),
      limit: jest.fn((n) => { 
        // Simple mock implementation of limit
        return chain; 
      }),
      toArray: jest.fn(async () => chain.data)
    };
    return chain;
  }),
  deleteOne: jest.fn(async (query) => {
    const initialLen = mockDb[collectionName].length;
    mockDb[collectionName] = mockDb[collectionName].filter(d => d._id.toString() !== query._id.toString());
    return { deletedCount: initialLen - mockDb[collectionName].length };
  }),
  findOneAndUpdate: jest.fn(async (query, update, options) => {
    let doc = mockDb[collectionName].find(d => d.email === query.email);
    if (!doc && options.upsert) {
      doc = { _id: new ObjectId(), email: query.email, ...update.$setOnInsert, ...update.$set };
      mockDb[collectionName].push(doc);
    } else if (doc) {
      Object.assign(doc, update.$set);
    }
    return { value: doc };
  }),
  insertOne: jest.fn(async (doc) => {
    const newDoc = { ...doc, _id: new ObjectId() };
    mockDb[collectionName].push(newDoc);
    return { insertedId: newDoc._id };
  }),
  updateOne: jest.fn(async (query, update) => {
    const doc = mockDb[collectionName].find(d => d._id.toString() === query._id.toString());
    let modifiedCount = 0;
    if (doc) {
      if (update.$addToSet) {
        const key = Object.keys(update.$addToSet)[0];
        const val = update.$addToSet[key];
        if (!doc[key]) doc[key] = [];
        if (!doc[key].includes(val)) doc[key].push(val);
        modifiedCount = 1;
      }
      if (update.$push) {
        const key = Object.keys(update.$push)[0];
        const val = update.$push[key];
        if (!doc[key]) doc[key] = [];
        doc[key].push(val);
        modifiedCount = 1;
      }
      if (update.$pull) {
         // Mock $pull logic for comments
         const key = Object.keys(update.$pull)[0];
         const filter = update.$pull[key]; // e.g., { _id: '...', userId: '...' }
         if (doc[key]) {
             const originalLen = doc[key].length;
             doc[key] = doc[key].filter(item => {
                 // Check if item matches the filter criteria
                 return !(item._id.toString() === filter._id.toString() && item.userId === filter.userId);
             });
             if (doc[key].length < originalLen) modifiedCount = 1;
         }
      }
    }
    return { matchedCount: doc ? 1 : 0, modifiedCount };
  }),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
});

jest.mock('mongodb', () => {
  const actualMongo = jest.requireActual('mongodb');
  return {
    ...actualMongo,
    MongoClient: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(true),
      db: jest.fn(() => ({ collection: jest.fn((name) => mockCollection(name)) })),
      close: jest.fn()
    }))
  };
});

describe('API Integration Flow', () => {
  let authToken;
  let organizerToken;
  let artistToken;
  let userToken;
  
  let userId;
  let eventId;

  beforeAll(async () => await connectToMongoDB());
  afterAll(async () => await closeMongoDB());

  // Helper to get token for a role
  const loginAs = async (role) => {
    // Mock verifyIdToken behavior dynamically could be complex, 
    // so we'll just simulate different users by assuming the endpoint works 
    // and returns a token with the requested role if we send it (as per our new logic)
    
    // Note: In a real test, we'd mock the Google Verify response to return different emails
    // to create distinct users. For this mock, we rely on the implementation 
    // taking 'role' from body if it's a new user.
    
    // We need to simulate unique emails for unique users in our mock DB
    const email = `test_${role}@example.com`;
    
    // We need to patch the mock to return this email for a specific token
    // This is hard with the current static mock. 
    // Simplified: We will just manually create tokens using the signTokenJWT function 
    // exported from middleware (if available) OR rely on the endpoint returning what we want.
    
    // ACTUALLY: The easiest way with the current mock setup is to just hit the endpoint 
    // with different 'role' params, assuming the mock allows us to distinguish users.
    // But the mock `verifyIdToken` hardcodes the email.
    
    // Let's UPDATE the mock `verifyIdToken` to be dynamic based on token input
    // This requires re-mocking or more complex setup. 
    
    // ALTERNATIVE: Just test the logic assuming we have valid tokens.
    // The integration test relies on the full flow.
    // Let's modify the endpoint call to send `role`.
    
    // To support multiple users, we need to update the Google Mock in this file.
    // See the 'jest.mock' block below.
  };

  test('POST /api/auth/google (Login as Organizer)', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'VALID_GOOGLE_TOKEN_ORGANIZER', role: 'organizer' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('organizer');
    organizerToken = res.body.token;
  });

  test('POST /api/auth/google (Login as Artist)', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'VALID_GOOGLE_TOKEN_ARTIST', role: 'artist' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('artist');
    artistToken = res.body.token;
  });

  test('POST /api/auth/google (Login as User)', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'VALID_GOOGLE_TOKEN_USER', role: 'user' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('user');
    userToken = res.body.token;
    userId = res.body.user._id;
  });
  

  test('GET /api/auth/me (Session Check)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${organizerToken}`); 
    
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/events (User cannot create)', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: "Fail Event", date: "2023-12-25" });
    expect(res.statusCode).toBe(403);
  });

  test('POST /api/events (Organizer can create)', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`) // CHANGED
      .send({
        title: "Test Event",
        date: "2023-12-25",
        time: "10:00",
        location: "Test Loc",
        category: "Social",
        description: "Desc",
        allowArtistApplications: true
      });

    expect(res.statusCode).toBe(201);
    eventId = res.body.eventId;
  });

  test('POST /api/events/join (User can join)', async () => {
    const res = await request(app)
      .post('/api/events/join')
      .set('Authorization', `Bearer ${userToken}`) // CHANGED
      .send({ eventId });

    expect(res.statusCode).toBe(200);
  });
  
  test('POST /api/events/join (Artist cannot join as user - Strict Mode)', async () => {
     // NOTE: Depending on requirements. Prompt said "Users can join".
     // Our code enforces strict check req.userRole === 'user'
    const res = await request(app)
      .post('/api/events/join')
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ eventId });

    expect(res.statusCode).toBe(403);
  });

  test('POST /api/events/apply (Artist can apply)', async () => {
      const res = await request(app)
        .post('/api/events/apply')
        .set('Authorization', `Bearer ${artistToken}`)
        .send({ eventId });
      
      expect(res.statusCode).toBe(200);
  });
  
  test('POST /api/events/apply (User cannot apply)', async () => {
      const res = await request(app)
        .post('/api/events/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId });
      
      expect(res.statusCode).toBe(403);
  });

  

  test('POST /api/events/comment (Add Comment)', async () => {
    const res = await request(app)
      .post('/api/events/comment')
      .set('Authorization', `Bearer ${userToken}`) // CHANGED
      .send({ eventId, text: "Nice event!" });

    expect(res.statusCode).toBe(200);
  });

  test('GET /api/events (Verify Data Persistence & Creator Name)', async () => {
    const res = await request(app).get('/api/events');
    const event = res.body.find(e => e._id.toString() === eventId.toString());
    
    // Check if any attendee has the matching userId
    const attendee = event.attendees.find(a => a.userId === userId);
    expect(attendee).toBeDefined();
    expect(attendee.name).toBe('Test USER');

    expect(event.creatorName).toBe('Test ORGANIZER'); // Creator is now Organizer
    expect(event.comments[0].text).toBe("Nice event!");
    expect(event.comments[0]._id).toBeDefined(); // Verify comment has ID
  });

  test('DELETE /api/events/:eventId/comments/:commentId (Delete Comment)', async () => {
    // First fetch to get comment ID
    let res = await request(app).get('/api/events');
    let event = res.body.find(e => e._id.toString() === eventId.toString());
    const commentId = event.comments[0]._id;

    // Delete
    res = await request(app)
      .delete(`/api/events/${eventId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${userToken}`); // CHANGED
    
    expect(res.statusCode).toBe(200);

    // Verify
    res = await request(app).get('/api/events');
    event = res.body.find(e => e._id.toString() === eventId.toString());
    expect(event.comments.length).toBe(0);
  });

  test('DELETE /api/events/:id (Delete Event)', async () => {
    const res = await request(app)
      .delete(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${organizerToken}`); // CHANGED - Only creator can delete

    expect(res.statusCode).toBe(200);

    // Verify
    const fetchRes = await request(app).get('/api/events');
    const event = fetchRes.body.find(e => e._id.toString() === eventId.toString());
    expect(event).toBeUndefined();
  });

  test('POST /api/auth/logout (Sign Out)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.statusCode).toBe(200);
    // No cookie check needed anymore as we are stateless on server side for logout
  });
});