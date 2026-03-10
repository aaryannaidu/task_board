import { Router } from "express";

import { register } from '../controllers/authController';

const authrouter = Router();

authrouter.post('/register', register);

export default authrouter;