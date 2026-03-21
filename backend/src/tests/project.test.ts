import request from 'supertest';
import app from '../index';
import prisma from '../utils/prisma';

let adminCookies: string[];
let memberCookies: string[];
let projectId: number;

beforeAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.workTransition.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // create admin user
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

  await prisma.user.updateMany({
    where: { email: 'admin@test.com' },
    data: { globalRole: 'ADMIN' }
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'password123' });

  adminCookies = adminLogin.headers['set-cookie'] as unknown as string[];

  // create member user
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Member', email: 'member@test.com', password: 'password123' });

  const memberLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'member@test.com', password: 'password123' });

  memberCookies = memberLogin.headers['set-cookie'] as unknown as string[];

  // create project
  const projectRes = await request(app)
    .post('/api/projects')
    .set('Cookie', adminCookies)
    .send({ name: 'Test Project' });

  projectId = projectRes.body.id;
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.workTransition.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('POST /api/projects', () => {

  test('admin can create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookies)
      .send({ name: 'New Project' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Project');
  });

  test('member cannot create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', memberCookies)
      .send({ name: 'Should Fail' });

    expect(res.status).toBe(403);
  });

  test('returns 400 if name missing', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookies)
      .send({});

    expect(res.status).toBe(400);
  });

});

describe('GET /api/projects', () => {

  test('returns projects for logged in user', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns 401 if not logged in', async () => {
    const res = await request(app)
      .get('/api/projects');

    expect(res.status).toBe(401);
  });

});

describe('GET /api/projects/:id', () => {

  test('admin can view project details', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectId);
  });

});

describe('POST /api/projects/:id/members', () => {

  test('admin can add a member by email', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookies)
      .send({ email: 'member@test.com', role: 'MEMBER' });

    expect(res.status).toBe(201);
  });

  test('cannot add same member twice', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookies)
      .send({ email: 'member@test.com', role: 'MEMBER' });

    expect(res.status).toBe(400);
  });

  test('member cannot add members', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', memberCookies)
      .send({ email: 'member@test.com', role: 'MEMBER' });

    expect(res.status).toBe(403);
  });

  test('returns 404 for non existent email', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookies)
      .send({ email: 'nobody@test.com', role: 'MEMBER' });

    expect(res.status).toBe(404);
  });

});

describe('GET /api/projects/:id/members', () => {

  test('admin can view project members', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

});

describe('PATCH /api/projects/:id', () => {

  test('admin can update project name', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .set('Cookie', adminCookies)
      .send({ name: 'Updated Project' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Project');
  });

  test('member cannot update project', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .set('Cookie', memberCookies)
      .send({ name: 'Should Fail' });

    expect(res.status).toBe(403);
  });

});

describe('PATCH /api/projects/:id/archive', () => {

  test('admin can archive project', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.project.archived).toBe(true);
  });

  test('admin can unarchive project', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.project.archived).toBe(false);
  });

});

describe('DELETE /api/projects/:id/members/:userid', () => {

  test('cannot remove the last admin', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@test.com' }
    });

    const res = await request(app)
      .delete(`/api/projects/${projectId}/members/${admin!.id}`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(400);
  });

  test('admin can remove a member', async () => {
    const member = await prisma.user.findUnique({
      where: { email: 'member@test.com' }
    });

    const res = await request(app)
      .delete(`/api/projects/${projectId}/members/${member!.id}`)
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
  });

});