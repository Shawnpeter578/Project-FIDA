// Set required env vars for config
process.env.JWT_SECRET = 'test_secret';
process.env.GOOGLE_CLIENT_ID = 'test_client_id';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
process.env.CLOUDINARY_API_KEY = 'test_key';
process.env.CLOUDINARY_API_SECRET = 'test_secret';
process.env.RAZOR_KEY = 'test_razor_key';
process.env.RAZOR_SECRET_KEY = 'test_razor_secret';

const request = require('supertest');
const { ObjectId } = require('mongodb');
const { app, connectToMongoDB, closeMongoDB } = require('../src/app');

// MOCKS
const mockDb = { users: [], events: [] };

const mockCollection = (collectionName) => ({
  createIndex: jest.fn(),
  findOne: jest.fn(async (query) => {
    const col = mockDb[collectionName];
    if (query._id) return col.find(d => d._id.toString() === query._id.toString()) || null;
    if (query.email) return col.find(d => d.email === query.email) || null;
    return null;
  }),
  insertOne: jest.fn(async (doc) => {
    const newDoc = { ...doc, _id: new ObjectId(), joinedEvents: doc.joinedEvents || [] };
    mockDb[collectionName].push(newDoc);
    return { insertedId: newDoc._id };
  }),
  findOneAndUpdate: jest.fn(async (query, update, options) => {
    const col = mockDb[collectionName];
    const index = col.findIndex(d => d._id.toString() === query._id.toString());
    if (index === -1) return { value: null };
    
    if (update.$set) {
        col[index] = { ...col[index], ...update.$set };
    }
    return { value: col[index] };
  }),
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

describe('Auth API', () => {
  beforeAll(async () => await connectToMongoDB());
  afterAll(async () => await closeMongoDB());

  test('GET /api/auth/config', async () => {
    const res = await request(app).get('/api/auth/config');
    expect(res.statusCode).toBe(200);
    expect(res.body.googleClientId).toBe('test_client_id');
  });

  test('POST /api/auth/signup (Success)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBeUndefined(); // Should not return sensitive info like email/pass/salt in user object? 
    // Wait, implementation returns user object. Let's check implementation. 
    // It returns: { _id, name, picture, role, joinedEvents }
  });

  test('POST /api/auth/signup (Duplicate Email)', async () => {
    // First signup
    await request(app)
        .post('/api/auth/signup')
        .send({ name: 'U1', email: 'dup@example.com', password: '123' });

    // Duplicate
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'U2', email: 'dup@example.com', password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Email already in use");
  });

  test('POST /api/auth/login (Success)', async () => {
    // Signup first
    await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Login User', email: 'login@example.com', password: 'password123' });

    // Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login (Wrong Password)', async () => {
     await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Wrong Pass', email: 'wrong@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });
  
  test('POST /api/auth/login (User Not Found)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' });

    expect(res.statusCode).toBe(401);
  });

  test('PUT /api/auth/me (Update Profile)', async () => {
    // 1. Create User
    const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Update Test', email: 'update@example.com', password: '123' });
    
    const token = signupRes.body.token;

    // 2. Update Profile
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        phone: '1234567890',
        city: 'Cyber City'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.phone).toBe('1234567890');
    expect(res.body.user.city).toBe('Cyber City');
    // Ensure email didn't change (if we tried to send it, it should be ignored by logic, but here we check it remains)
    expect(res.body.user.email).toBe('update@example.com');
  });
});