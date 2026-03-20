import {Request,Response} from 'express';
import prisma from "../utils/prisma";

export async function createcomment(req:Request,res:Response):Promise<void>{
    try{
        const taskid= parseInt(req.params.taskid as string);
        const {content }= req.body;
        if(!content){
            res.status(400).json({error:"Content is Required"});
            return;
        }
        const task = await prisma.task.findUnique({
            where:{id:taskid}
        });
        if(!task){
            res.status(404).json({error:"Task Not Found"});
            return;
        }
        const comment= await prisma.comment.create({
            data:{
                content,
                taskID:taskid,
                authorID:req.user!.userID,
            },
            include:{
                author:{
                    select:{
                        id:true,
                        name:true,
                        avatarUrl:true
                    }
                }
            }
        });
        await prisma.auditLog.create({data:{
            taskID:taskid,
            actorId:req.user!.userID,
            eventtype:"COMMENT_ADDED",
            newValue:content
        }});
        if(task?.reporterID !== req.user!.userID){
            await prisma.notification.create({
                data: {
                    userID: task.reporterID,
                    taskID: taskid,
                    type: 'COMMENT_ADDED',
                    message: `New comment on your task: ${task?.title}`
                }
            });
        }
        if(task?.assigneeID && task.assigneeID !== req.user!.userID){
            await prisma.notification.create({
                data: {
                    userID: task.assigneeID,
                    taskID: taskid,
                    type: "COMMENT_ADDED",
                    message: `New comment on task assigned to you: ${task.title}`
                }
            });
        }
        const mentions= content.match(/@(\w+)/g) ?? [];
        for (const mention of mentions){
            const username= mention.slice(1);
            const mentionuser=await prisma.user.findFirst({
                where:{name:username}
            });
            if(mentionuser && mentionuser.id !== req.user!.userID){
                await prisma.notification.create({
                    data:{
                        userID:mentionuser.id,
                        taskID:taskid,
                        type:"MENTION",
                        message:`You are Mentioned in a comment on : ${task.title}`
                    }
                });
            }
        }
        res.status(201).json(comment);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong , Try again later"});
    }
}

export async function getcomment(req:Request,res:Response){
    try{
        const taskid= parseInt(req.params.taskid as string);
        const comments = await prisma.comment.findMany({
            where:{taskID:taskid},
            include:{
                author:{
                    select:{
                        id:true,
                        name:true,
                        avatarUrl:true
                    }
                }
            },
            orderBy:{createdAt:"asc"}
        });
        res.status(201).json({comments});
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Try again later "});
    }
}

export async function updatecomment(req:Request,res:Response):Promise<void>{
    try{
        const commentid= parseInt(req.params.commentid as string);
        const {content}= req.body;

        const comment= await prisma.comment.findUnique({
            where:{id:commentid}
        });
        if(!comment){
            res.status(404).json({error:"Comment Not Found"});
            return;
        }
        if(comment?.authorID!== req.user!.userID){
            res.status(403).json({error:"You can only edit your own comment"});
            return;
        }
        const update= await prisma.comment.update({
            where:{id:commentid},
            data:{content}
        });
        res.status(200).json(update);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong , Try again later"});
    }

}

export async function deletecomment(req:Request, res:Response):Promise<void>{
    try{
        const commentid= parseInt(req.params.commentid as string);
        const comment = await prisma.comment.findUnique({
            where:{id:commentid}
        });
        if(!comment){
            res.status(404).json({error:"Comment Not Found"});
            return;
        }
        if(comment?.authorID!==req.user!.userID){
            res.status(403).json({error:"You can only delete your own comments"});
            return;
        }
        await prisma.comment.delete({
            where:{id:commentid}
        });
        res.status(200).json({message:"Comment Deleted Successfully"});
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Try again later"});
    }
}

