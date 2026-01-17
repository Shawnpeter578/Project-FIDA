const request = require('supertest');
const { ObjectId } = require('mongodb');
import { describe, it, expect, vi, beforeAll, afterAll, test } from 'vitest';
import { app, connectToMongoDB, closeMongoDB } from './app';

// MOCKS
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockImplementation(async ({ idToken }) => {
      if (idToken === 'VALID_GOOGLE_TOKEN') {
        return {
          getPayload: () => ({
            email: 'testuser@example.com',
            name: 'Test User',
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
  createIndex: vi.fn(),
  findOne: vi.fn(async (query) => {
    const col = mockDb[collectionName];
    if (query._id) return col.find(d => d._id.toString() === query._id.toString()) || null;
    if (query.email) return col.find(d => d.email === query.email) || null;
    return null;
  }),
  find: vi.fn(() => ({
    sort: vi.fn(() => ({
      toArray: vi.fn(async () => [...mockDb[collectionName]])
    }))
  })),
  deleteOne: vi.fn(async (query) => {
    const initialLen = mockDb[collectionName].length;
    mockDb[collectionName] = mockDb[collectionName].filter(d => d._id.toString() !== query._id.toString());
    return { deletedCount: initialLen - mockDb[collectionName].length };
  }),
  findOneAndUpdate: vi.fn(async (query, update, options) => {
    let doc = mockDb[collectionName].find(d => d.email === query.email);
    if (!doc && options.upsert) {
      doc = { _id: new ObjectId(), email: query.email, ...update.$setOnInsert, ...update.$set };
      mockDb[collectionName].push(doc);
    } else if (doc) {
      Object.assign(doc, update.$set);
    }
    return { value: doc };
  }),
  insertOne: vi.fn(async (doc) => {
    const newDoc = { ...doc, _id: new ObjectId() };
    mockDb[collectionName].push(newDoc);
    return { insertedId: newDoc._id };
  }),
  updateOne: vi.fn(async (query, update) => {
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
  })
});

vi.mock('mongodb', () => {
  const actualMongo = vi.requireActual('mongodb');
  return {
    ...actualMongo,
    MongoClient: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(true),
      db: vi.fn(() => ({ collection: vi.fn((name) => mockCollection(name)) })),
      close: vi.fn()
    }))
  };
});

describe('API Integration Flow', () => {
  let authToken; // CHANGED: Using Token instead of Cookie
  let userId;
  let eventId;

  beforeAll(async () => await connectToMongoDB());
  afterAll(async () => await closeMongoDB());

  test('POST /api/auth/google (Login)', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ token: 'VALID_GOOGLE_TOKEN' });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    
    // CHANGED: Capture Token from Body
    userId = res.body.user._id;
    authToken = res.body.token; 
    
    expect(authToken).toBeDefined();
  });

  test('GET /api/auth/me (Session Check)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`); // CHANGED: Header based auth
    
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Test User');
  });

  test('POST /api/events (Create Event - Authenticated)', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`) // CHANGED
      .send({
        title: "Test Event",
        date: "2023-12-25",
        time: "10:00",
        location: "Test Loc",
        category: "Social",
        description: "Desc",
        // creatorId is now taken from token
      });

    expect(res.statusCode).toBe(201);
    eventId = res.body.eventId;
  });

  test('POST /api/events/join (Join Event)', async () => {
    const res = await request(app)
      .post('/api/events/join')
      .set('Authorization', `Bearer ${authToken}`) // CHANGED
      .send({ eventId });

    expect(res.statusCode).toBe(200);
  });

  test('POST /api/events/comment (Add Comment)', async () => {
    const res = await request(app)
      .post('/api/events/comment')
      .set('Authorization', `Bearer ${authToken}`) // CHANGED
      .send({ eventId, text: "Nice event!" });

    expect(res.statusCode).toBe(200);
  });

  test('GET /api/events (Verify Data Persistence & Creator Name)', async () => {
    const res = await request(app).get('/api/events');
    const event = res.body.find(e => e._id.toString() === eventId.toString());
    
    expect(event.attendees).toContain(userId);
    expect(event.creatorName).toBe('Test User'); // Verify creator name is stored
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
      .set('Authorization', `Bearer ${authToken}`); // CHANGED
    
    expect(res.statusCode).toBe(200);

    // Verify
    res = await request(app).get('/api/events');
    event = res.body.find(e => e._id.toString() === eventId.toString());
    expect(event.comments.length).toBe(0);
  });

  test('DELETE /api/events/:id (Delete Event)', async () => {
    const res = await request(app)
      .delete(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${authToken}`); // CHANGED

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