import {Router} from 'express';
import { createboard,getboards,deleteboard,createcolumn,updatecolumn
    ,deletecolumn,addtransition,removetransition} from '../controllers/boardController';

const router = Router();

router.post('/',createboard)
router.get('/',getboards)
router.delete('/:boardid',deleteboard)

router.post('/:boardid/columns',createcolumn)
router.patch('/.boardid/columns/:columnid',updatecolumn)
router.delete('/:boardid/columns/:columnid',deletecolumn)

router.post('/:boardid/transitions',addtransition)
router.delete('/:boardid/transitions/:transitionid',removetransition)