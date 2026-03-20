import { Router } from 'express';
import {getnotification,markallread,markasread} from '../controllers/Notification_Controller';

const router = Router();
router.get('/',getnotification);
router.patch('/read-all',markallread);
router.patch('/:notificationid/read',markasread);

export default router;