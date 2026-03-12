import {Request, Response, NextFunction} from 'express';

export function errorHandler(err:unknown,req:Request,res:Response,next:NextFunction):void{
    console.error(err.stack);
    res.status(500).json({error:err.message || "Something went wrong, Please try again later"});
}