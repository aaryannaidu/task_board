import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import{errorHandler} from './middleware/errorHandler';
import {authenticate} from './middleware/authenticate';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth').default);
app.use('api/projects',authenticate,require('./routes/projectsrouter').default);


app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Server is running', status: 'ok' });
});
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});