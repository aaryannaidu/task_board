import {Request,Response} from 'express';
import prisma from "../utils/prisma";

export async function getnotification (req:Request,res:Response):Promise<void>{
    try{
        const notifications= await prisma.notification.findMany({
            where:{userID:req.user!.userID}
            ,include:{
                task:{
                    select:{
                        id:true,
                        title:true,
                        status:true
                    }
                }
            },
            orderBy:{createdAt:"asc"}
        });
        res.status(200).json(notifications)
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong , Try again later"})
    }
}

export async function markasread(req:Request,res:Response):Promise<void>{
    try{
        const notificationid= parseInt(req.params.notificationid as string);
        const notification=await prisma.notification.findUnique({
            where:{id:notificationid}
        });
        if(!notification){
            res.status(404).json({error:"Notification Not Found"});
        }
        if(notification?.userID!==req.user!.userID){
            res.status(403).json({error:"Not Authorized"});
        }
        const update= await prisma.notification.update({
            where:{id:notificationid},
            data:{read:true}
        });
        res.status(200).json(update)
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong , Try again later"})
    }   
}

export async function markallread(req:Request,res:Response):Promise<void>{
    try{
        await prisma.notification.updateMany({
            where:{
                userID:req.user!.userID,
                read:false
            },
            data:{
                read:true
            }
        });
        res.status(200).json({message:"All Notification marked as read"});
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Try again later"});
    }
}