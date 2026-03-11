import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

// app.use(helmet());
// app.use(cors({
//     origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//     credentials: true,
// }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth').default);
app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Server is running', status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});