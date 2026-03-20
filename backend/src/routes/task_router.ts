import { Router } from 'express';
import { createtask,gettasks,gettaskbyid,updatetask,movetask,deletetask} from '../controllers/taskController';

const router = Router({mergeParams:true});

router.post('/',createtask);
router.get('/',gettasks);
router.get('/:taskid',gettaskbyid);
router.patch('/:taskid',updatetask);
router.post('/:taskid/move',movetask);
router.delete('/:taskid',deletetask)

export default router;