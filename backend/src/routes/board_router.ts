import {Router} from 'express';
import { createboard,getboards,deleteboard,createcolumn,updatecolumn
    ,deletecolumn,reordercolumns,addtransition,removetransition} from '../controllers/boardController';

const router = Router({ mergeParams: true });

router.post('/',createboard)
router.get('/',getboards)
router.delete('/:boardid',deleteboard)

router.post('/:boardid/columns',createcolumn)
router.patch('/:boardid/columns/reorder',reordercolumns)
router.patch('/:boardid/columns/:columnid',updatecolumn)
router.delete('/:boardid/columns/:columnid',deletecolumn)

router.post('/:boardid/transitions',addtransition)
router.delete('/:boardid/transitions/:transitionid',removetransition)

export default router;