import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./auth/routes').default);
app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Server is running', status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
