import {Router} from 'express';
import {getprojects} from '../controllers/projectController';
import {authenticate} from '../middleware/authenticate';

const router=Router();

router.get('/',authenticate,getprojects);

export default router; 