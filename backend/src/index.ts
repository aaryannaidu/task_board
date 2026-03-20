import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth').default);
app.use('/api/projects', authenticate, require('./routes/project_router').default);
app.use('/api/projects/:projectid/boards',authenticate,require('./routes/board_router').default);
app.use('/api/projects/:projectid/tasks',authenticate,require('./router/task_router').default);
app.use('/api/projects/:projectid/tasks/:taskid/comments',authenticate,require('./router/comment_router').default);
app.use('/api/notifications',authenticate,require('./routes/notification_router').default);

app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Server is running', status: 'ok' });
});
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});