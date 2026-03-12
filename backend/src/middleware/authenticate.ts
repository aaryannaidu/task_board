import {Request,Response,NextFunction} from 'express';
import { verifyAccessToken }from '../utils/jwt';

export async function authenticate(req:Request,res:Response,next:NextFunction):Promise<void>{
    
    const token=req.cookies.accessToken;
    if(!token){
        res.status(401).json({error:"Not Authorized"});
        return;
    }
    try{
        const payload=verifyAccessToken(token);
        req.user=payload;
        next();
    }    
    catch(error:unknown){
        res.status(401).json({error:"Invalid or expired Token"})
    }
}