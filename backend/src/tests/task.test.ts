import request from 'supertest';
import app from '../index';
import prisma from '../utils/prisma';

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

  const boardRes = await request(app)
    .post(`/api/projects/${projectId}/boards`)
    .set('Cookie', cookies)
    .send({ name: 'Test Board' });

  boardId = boardRes.body.id;

  const columnRes = await request(app)
    .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
    .set('Cookie', cookies)
    .send({ name: 'To Do' });

  columnId = columnRes.body.id;
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
    const colRes = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set('Cookie', cookies)
      .send({ name: 'Limited', wipLimit: 1 });

    const limitedColumnId = colRes.body.id;

    await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Task 1', columnId: limitedColumnId, type: 'TASK' });

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
    const storyRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Big Feature', columnId, type: 'STORY' });

    const storyId = storyRes.body.id;

    const col2Res = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set('Cookie', cookies)
      .send({ name: 'In Progress' });

    const col2Id = col2Res.body.id;

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${storyId}/move`)
      .set('Cookie', cookies)
      .send({ columnId: col2Id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('STORY task cannot be moved between column');
  });

  test('blocks move if transition not allowed', async () => {
    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Regular Task', columnId, type: 'TASK' });

    const taskId = taskRes.body.id;

    const doneColRes = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set('Cookie', cookies)
      .send({ name: 'Done' });

    const doneColId = doneColRes.body.id;

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/move`)
      .set('Cookie', cookies)
      .send({ columnId: doneColId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('This status transition is not allowed');
  });

  test('allows move when transition exists', async () => {
    const col2Res = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set('Cookie', cookies)
      .send({ name: 'Review' });

    const col2Id = col2Res.body.id;

    await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/transitions`)
      .set('Cookie', cookies)
      .send({ fromStatus: 'To Do', toStatus: 'Review' });

    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Cookie', cookies)
      .send({ title: 'Movable Task', columnId, type: 'TASK' });

    const taskId = taskRes.body.id;

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/move`)
      .set('Cookie', cookies)
      .send({ columnId: col2Id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Review');
  });

});