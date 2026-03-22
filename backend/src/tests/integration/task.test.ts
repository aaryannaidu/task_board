/// <reference types="jest" />
import request from 'supertest';
import app from '../../index';
import prisma from '../../utils/prisma';

let cookies: string[];
let projectId: number;
let boardId: number;
let columnId: number;

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

  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

  await prisma.user.updateMany({
    where: { email: 'admin@test.com' },
    data: { globalRole: 'ADMIN' }
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'password123' });

  cookies = loginRes.headers['set-cookie'] as unknown as string[];

  const projectRes = await request(app)
    .post('/api/projects')
    .set('Cookie', cookies)
    .send({ name: 'Test Project' });

  projectId = projectRes.body.id;

  // board auto-creates To Do, In Progress, Review, Done columns
  const boardRes = await request(app)
    .post(`/api/projects/${projectId}/boards`)
    .set('Cookie', cookies)
    .send({ name: 'Test Board' });

  boardId = boardRes.body.id;

  // get the auto-created To Do column
  const toDoColumn = boardRes.body.columns.find(
    (c: { name: string; id: number }) => c.name === 'To Do'
  );
  columnId = toDoColumn.id;
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

describe('POST /api/projects/:projectId/tasks', () => {

  test('creates a task successfully', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Test Task', columnId, type: 'TASK' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Task');
    expect(res.body.type).toBe('TASK');
  });

  test('returns 400 if title missing', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ columnId, type: 'TASK' });

    expect(res.status).toBe(400);
  });

  test('blocks task when WIP limit reached', async () => {
    // create a separate column with wipLimit 1
    const colRes = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set('Cookie', cookies)
      .send({ name: 'Limited', wipLimit: 1 });

    const limitedColumnId = colRes.body.id;

    // first task — should succeed
    await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Task 1', columnId: limitedColumnId, type: 'TASK' });

    // second task — should be blocked
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Task 2', columnId: limitedColumnId, type: 'TASK' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('WIP Limit reached for this column');
  });

});

describe('POST /api/projects/:projectId/tasks/:id/move', () => {

  test('blocks moving a STORY task', async () => {
    // get auto-created In Progress column
    const boardsRes = await request(app)
      .get(`/api/projects/${projectId}/boards`)
      .set('Cookie', cookies);

    const board = boardsRes.body.find(
      (b: { id: number }) => b.id === boardId
    );

    const inProgressColumn = board.columns.find(
      (c: { name: string; id: number }) => c.name === 'In Progress'
    );

    const storyRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Big Feature', columnId, type: 'STORY' });

    const storyId = storyRes.body.id;

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${storyId}/move`)
      .set('Cookie', cookies)
      .send({ columnId: inProgressColumn.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('STORY task cannot be moved between column');
  });

  test('blocks move if transition not allowed', async () => {
    // get auto-created Done column
    const boardsRes = await request(app)
      .get(`/api/projects/${projectId}/boards`)
      .set('Cookie', cookies);

    const board = boardsRes.body.find(
      (b: { id: number }) => b.id === boardId
    );

    // To Do → Done directly is not allowed
    const doneColumn = board.columns.find(
      (c: { name: string; id: number }) => c.name === 'Done'
    );

    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Regular Task', columnId, type: 'TASK' });

    const taskId = taskRes.body.id;

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/move`)
      .set('Cookie', cookies)
      .send({ columnId: doneColumn.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('This status transition is not allowed');
  });

  test('allows move when transition exists', async () => {
    // get auto-created In Progress column
    const boardsRes = await request(app)
      .get(`/api/projects/${projectId}/boards`)
      .set('Cookie', cookies);

    const board = boardsRes.body.find(
      (b: { id: number }) => b.id === boardId
    );

    // To Do → In Progress transition was auto-created
    const inProgressColumn = board.columns.find(
      (c: { name: string; id: number }) => c.name === 'In Progress'
    );

    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Movable Task', columnId, type: 'TASK' });

    const taskId = taskRes.body.id;

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/move`)
      .set('Cookie', cookies)
      .send({ columnId: inProgressColumn.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('In Progress');
  });

});