import {Request,Response} from 'express';
import prisma from "../utils/prisma";
import { CreateTaskBody,UpdateTaskBody,MoveTaskBody} from '../types/index';

export async function createtask(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.projectid as string);
        const{ title,columnId,type,parentID,priority,dueDate,description,assigneeId}= req.body as CreateTaskBody;
        if(!title || !columnId || !type){
            res.status(400).json({error:"Title, Column and Type are Required"})
            return;
        }

        const member = await prisma.projectMember.findUnique({
            where:{
                userID_projectID:{
                    userID:req.user!.userID,
                    projectID:projectid
                }
            }
        });
        if(!member){
            res.status(403).json({error:"Not a member of project"})
            return;
        }
        if(member.role === 'VIEWER'){
            res.status(403).json({error:"Viewers cannot create tasks"})
            return;
        }
        const column= await prisma.column.findUnique({where:{id:columnId}});
        if(!column){
            res.status(404).json({error:"Column not found "})
            return ;
        }
        if(column?.wipLimit !== null){
            const taskcount= await prisma.task.count({
                where:{columnID:columnId}
            });
            if(taskcount>=column.wipLimit){
                res.status(400).json({error:"WIP Limit reached for this column"})
                return ;
            }
        }
        const task = await prisma.task.create({
            data:{
                title,
                columnID:columnId,
                type,
                priority:priority ?? "MEDIUM",
                reporterID:req.user!.userID,
                parentID:parentID ?? null,
                dueDate:dueDate ? new Date(dueDate) :null,
                description: description ?? null,
                assigneeID: assigneeId ?? null,
                status:column.name
            }
        });
        await prisma.auditLog.create({
            data:{
                taskID: task.id,
                actorId: req.user!.userID,
                eventtype: "TASK_CREATED",
                newValue: task.status,
            }
        });
        if(assigneeId){
            await prisma.auditLog.create({
                data:{
                    taskID: task.id,
                    actorId: req.user!.userID,
                    eventtype: "ASSIGNEE_CHANGE",
                    oldValue: "none",
                    newValue: assigneeId.toString()
                }
            });
            if(assigneeId !== req.user!.userID){
                await prisma.notification.create({
                    data: {
                        userID: assigneeId,
                        taskID: task.id,
                        type: "TASK_ASSIGNED",
                        message: `You have been assigned to a new task: ${task.title}`
                    }
                });
            }
        }
        res.status(201).json(task);

    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, try again later"});
    }
}

export async function gettasks(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.projectid as string)
        
        const member = await prisma.projectMember.findUnique({
            where:{
                userID_projectID:{
                    userID:req.user!.userID,
                    projectID:projectid
                }
            }
        });
        if(!member){
            res.status(403).json({error:"Not a member of project"})
            return;
        }
        const task= await prisma.task.findMany({
            where:{
                column:{
                    board:{
                        projectID:projectid
                    }
                }
            },
            include:{
                assignee:{
                    select:{
                        id:true,
                        name:true,
                        email:true,
                        avatarUrl:true
                    }
                },
                reporter:{
                    select:{
                        id:true,
                        name:true,
                        email:true
                    }
                },
                children:true,
                _count:{
                    select:{
                        comments:true
                    }
                }
            }
        });
        res.status(200).json(task);

    }
    catch(error:unknown){
        res.status(500).json({error:"Something went worng, Try again later"});
    }
}

export async function gettaskbyid(req:Request,res:Response):Promise<void>{
    try{
        const taskid= parseInt(req.params.taskid as string);
        const task= await prisma.task.findUnique({
            where:{id:taskid},
            include:{
                assignee:{
                    select:{
                        id:true,
                        name:true,
                        email:true,
                        avatarUrl:true
                    }
                },
                reporter:{
                    select:{
                        id:true,
                        name:true,
                        email:true
                    }
                },
                comments:{
                    include:{
                        author:{
                            select:{
                                id:true,
                                name:true,
                                avatarUrl:true
                            }
                        }
                    },
                    orderBy:{createdAt:'asc'}
                },
                auditLogs:{ orderBy:{createdAt:'asc'}},
                children:true,
                Parent:true
            }
        });
        if(!task){
            res.status(404).json({error:"Task Not Found"});
            return;
        }
        res.status(200).json(task);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Try again later"});
    }
}

export async function updatetask(req:Request,res:Response):Promise<void>{
    try {
        const taskid= parseInt(req.params.taskid as string);
        const{title,description,prioroity,assigneeId,dueDate,closedAt}= req.body as UpdateTaskBody;

        const task=await prisma.task.findUnique({ where:{ id:taskid }});
        if(!task){
            res.status(404).json({error:"Task Not Found"});
            return;
        }

        // Check VIEWER restriction via column → board → project
        const taskColumn = await prisma.column.findUnique({
            where: { id: task.columnID },
            include: { board: true }
        });
        if (taskColumn) {
            const member = await prisma.projectMember.findUnique({
                where: {
                    userID_projectID: {
                        userID: req.user!.userID,
                        projectID: taskColumn.board.projectID
                    }
                }
            });
            if (member?.role === 'VIEWER') {
                res.status(403).json({error: "Viewers cannot update tasks"});
                return;
            }
        }

        if(assigneeId !== undefined && assigneeId !== task?.assigneeID){
            await prisma.auditLog.create({
                data:{
                    taskID:taskid,
                    actorId:req.user!.userID,
                    eventtype:"ASSIGNEE_CHANGE",
                    oldValue:task?.assigneeID?.toString() ?? 'none',
                    newValue:assigneeId?.toString() ?? 'none'
                }
            });
            if(assigneeId && assigneeId !== req.user!.userID){
                await prisma.notification.create({
                    data: {
                        userID: assigneeId,
                        taskID: taskid,
                        type: "TASK_ASSIGNED",
                        message: `You have been assigned to task: ${task?.title}`
                    }
                });
            }
        }
        const updated= await prisma.task.update({
            where:{id:taskid},
            data:{
                title:title?? task?.title,
                description:description ?? task?.description,
                priority:prioroity ?? task?.priority,
                assigneeID:assigneeId ?? task?.assigneeID,
                dueDate:dueDate ?? task?.dueDate,
                closedAt: closedAt !== undefined ? (closedAt ? new Date(closedAt) : null) : task?.closedAt
            }
        });

        // Log close event if closedAt was just set
        if (closedAt && !task?.closedAt) {
            await prisma.auditLog.create({
                data: {
                    taskID: taskid,
                    actorId: req.user!.userID,
                    eventtype: "STATUS_CHANGE",
                    oldValue: task?.status ?? "",
                    newValue: "CLOSED"
                }
            });
        }

        res.status(200).json(updated);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong , Try again later"});
    }
}

export async function movetask(req:Request,res:Response):Promise<void>{
    try{
        const taskid= parseInt(req.params.taskid as string);
        const{columnId}=req.body as MoveTaskBody;
        const task= await prisma.task.findUnique({
            where:{id:taskid}
        });
        if(!task){
            res.status(404).json({error:"Task Not Found"});
            return;
        }

        // Check VIEWER restriction via task's column → board → project
        const currentColumn = await prisma.column.findUnique({
            where: { id: task.columnID },
            include: { board: true }
        });
        if (currentColumn) {
            const member = await prisma.projectMember.findUnique({
                where: {
                    userID_projectID: {
                        userID: req.user!.userID,
                        projectID: currentColumn.board.projectID
                    }
                }
            });
            if (member?.role === 'VIEWER') {
                res.status(403).json({error: "Viewers cannot move tasks"});
                return;
            }
        }

        if(task.type=="STORY"){
            res.status(400).json({error:"STORY task cannot be moved between column"});
            return ;
        }
        const targetcolumn = await prisma.column.findUnique({
            where:{id:columnId}
        });
        if(!targetcolumn){
            res.status(404).json({error:"Target Column Not Found"});
            return ;
        }
        const transition = await prisma.workTransition.findFirst({
            where: {
                boardID: targetcolumn.boardID,
                fromStatus: task.status,
                toStatus: targetcolumn.name
            }
            });

        if (!transition) {
            res.status(400).json({ error: 'This status transition is not allowed' });
            return;
        }
        if(targetcolumn.wipLimit !== null){
            const taskcount = await prisma.task.count({
                where:{columnID:columnId}
            });
            if(taskcount>=targetcolumn.wipLimit){
                res.status(400).json({error:"WIP Limit reached for this column"});
                return ;
            }
        }
        if (!currentColumn) {
            res.status(404).json({error:"Current Column Not Found"});
            return;
        }
        await prisma.auditLog.create({
            data:{
                taskID:taskid,
                actorId:req.user!.userID,
                eventtype:"STATUS_CHANGE",
                oldValue:task.status,
                newValue:targetcolumn.name
            }
        });
        
        const notifyUsers = new Set<number>();
        if (task.assigneeID && task.assigneeID !== req.user!.userID) notifyUsers.add(task.assigneeID);
        if (task.reporterID && task.reporterID !== req.user!.userID) notifyUsers.add(task.reporterID);
        
        for (const uid of notifyUsers) {
            await prisma.notification.create({
                data: {
                    userID: uid,
                    taskID: taskid,
                    type: "STATUS_CHANGE",
                    message: `Status changed to ${targetcolumn.name} for task: ${task.title}`
                }
            });
        }

        const updated= await prisma.task.update({
            where:{id:taskid},
            data:{
                columnID:columnId,
                status:targetcolumn.name,
                resolveAt:targetcolumn.name==='Done' ? new Date():task.resolveAt,
                closedAt:targetcolumn.name==='Close' ? new Date():task.closedAt
            }
        });
        res.status(200).json(updated);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong , Try again later "});
    }
}

export async function deletetask(req:Request,res:Response):Promise<void>{
    try{
        const taskid= parseInt(req.params.taskid as string);
        const task = await prisma.task.findUnique({
            where:{id:taskid}
        });
        if(!task){
            res.status(404).json({error:"Task Not Found"});
            return;
        }
        // Check VIEWER restriction via column → board → project
        const delCol = await prisma.column.findUnique({
            where: { id: task.columnID },
            include: { board: true }
        });
        if (delCol) {
            const member = await prisma.projectMember.findUnique({
                where: {
                    userID_projectID: {
                        userID: req.user!.userID,
                        projectID: delCol.board.projectID
                    }
                }
            });
            if (member?.role === 'VIEWER') {
                res.status(403).json({error: "Viewers cannot delete tasks"});
                return;
            }
        }
        await prisma.task.delete({
            where:{id:taskid}
        });
        res.status(200).json({message:"Task Deleted Successfully"});
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong , Try again later "});
    }
}