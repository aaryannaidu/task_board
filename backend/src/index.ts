import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' })); // base64 avatar images can be large
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth').default);
app.use('/api/users', require('./routes/user').default);
app.use('/api/projects', authenticate, require('./routes/project_router').default);
app.use('/api/projects/:projectid/boards',authenticate,require('./routes/board_router').default);
app.use('/api/projects/:projectid/tasks',authenticate,require('./routes/task_router').default);
app.use('/api/projects/:projectid/tasks/:taskid/comments',authenticate,require('./routes/comment_router').default);
app.use('/api/notifications',authenticate,require('./routes/notification_router').default);

app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Server is running', status: 'ok' });
});
app.use(errorHandler);

export default app;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}