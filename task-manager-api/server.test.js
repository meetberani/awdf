const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-test-secret-key-12345';
const app = require('./server');

describe('Task Management API CI Tests', () => {
  let authToken;

  beforeAll(async () => {
    authToken = jwt.sign(
      { id: 'ci-user-123', email: 'student@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Test 1: Step 2 requirement - GET /tasks returns status 200
  test('GET /tasks returns 200', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
  });

  // Test 2: Supplementary problem - Second automated test covering different scenario
  test('GET /tasks returns 401 without authorization token', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(401);
  });

  // Test 3: 404 Not Found error handling test
  test('GET /non-existent-route returns 404', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.statusCode).toBe(404);
  });

  // Practical 13: AI Generation Endpoint Tests
  test('POST /api/ai/generate-description returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/ai/generate-description returns 200 with generated description', async () => {
    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Deploy to Kubernetes' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('description');
    expect(res.body.description.length).toBeGreaterThan(5);
  });
});

