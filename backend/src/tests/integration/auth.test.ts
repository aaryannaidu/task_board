import request from 'supertest';
import app from '../../index';
import prisma from '../../utils/prisma';

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {

  test('creates a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@test.com');
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('returns 400 if email already taken', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User',
        email: 'test@test.com',
        password: 'pass123'
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User2',
        email: 'test@test.com',
        password: 'pass456'
      });

    expect(res.status).toBe(400);
  });

  test('returns 400 if fields missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
  });

});

describe('POST /api/auth/login', () => {

  test('logs in with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User',
        email: 'test@test.com',
        password: 'password123'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@test.com');
  });

  test('returns 401 with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User',
        email: 'test@test.com',
        password: 'password123'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
  });

  test('returns 401 with wrong email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(401);
  });

});