import { Router } from "express";
import {Login,Register,Logout } from '../controllers/authController';

const router= Router();

router.post('/regiter',Register);
router.post('/login',Login);
router.post('/logout',Logout);
    
export default router;