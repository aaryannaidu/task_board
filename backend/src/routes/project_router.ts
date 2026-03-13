import {Router} from 'express';
import {getprojects,createProject,changememberrole,updateproject,
    archiveproject,addmember,removemember} from '../controllers/projectController';


const router=Router();

router.get('/',getprojects);
router.post('/',createProject);
router.patch('/:id',updateproject);
router.patch('/:id/archive',archiveproject);
router.post('/:id/members',addmember);
router.patch('/:id/members/:userid',changememberrole);
router.delete('/:id/members/:userid',removemember);
export default router; 