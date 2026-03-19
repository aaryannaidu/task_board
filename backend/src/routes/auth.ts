import { Router } from "express";
import { Login, Register, Logout, Refresh, GetMe } from '../controllers/authController';
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post('/register', Register);
router.post('/login', Login);
router.post('/logout', Logout);
router.post('/refresh', Refresh);
router.get('/me', authenticate, GetMe);

export default router;