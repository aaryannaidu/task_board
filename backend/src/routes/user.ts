import { Router } from 'express';
import { UpdateMe, ListUsers, GetUserById } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.use(authenticate);

router.patch('/me', UpdateMe);

router.get('/', requireAdmin, ListUsers);

router.get('/:id', requireAdmin, GetUserById);

export default router;