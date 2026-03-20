import { Router } from 'express';
import{createcomment,updatecomment,getcomment,deletecomment} from '../controllers/comment_Controller'

const router= Router({mergeParams:true})

router.post('/',createcomment);
router.get('/',getcomment);
router.patch('/:commentid',updatecomment);
router.delete('/:commentid',deletecomment);

export default router;

