import { Request, Response } from 'express';
import prisma from "../utils/prisma";

export async function createboard(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.projectid as string);
        const{name}= req.body;
        if(!name){
            res.status(400).json({error:"Board name is required"});
            return;
        }
        const project = await prisma.project.findUnique({
            where:{id:projectid}
        });
        if(!project){
            res.status(404).json({error:"Project not found"});
            return;
        }

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN'){
            res.status(403).json({error:"Only admins can create boards"});
            return;
        }
        const board = await prisma.board.create({
            data:{name,projectID:projectid}
        });
        res.status(201).json(board);
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"});
    }
}

export async function getboards(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.projectid as string);

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(!member && req.user?.globalRole !== 'ADMIN'){
            res.status(403).json({error:"Not a project member"});
            return;
        }
        
        const board = await prisma.board.findMany({
            where:{projectID:projectid},
            include:{
                columns:{
                    orderBy:{ order:"asc"}
                },
                transitions:true
            }
        });
        res.status(200).json(board);
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"});
    }
}

export async function deleteboard(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.projectid as string);
        const boardid = parseInt(req.params.boardid as string);

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN'){
            res.status(403).json({error:"Only admins can delete boards"});
            return;
        }
            await prisma.board.delete({
                where:{id :boardid}
            });
            res.status(200).json({message:"Board deleted"})
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"});
    }
}

export async function createcolumn(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.projectid as string);
        const boardid= parseInt(req.params.boardid as string);

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN'){
            res.status(403).json({error:"Only admins can create columns"});
            return;
        }

        let {name,order,wipLimit}= req.body;
        if(!name){
            res.status(400).json({error:"Column name is required"});
            return;
        }

        if (order === undefined || order === null) {
            const lastColumn = await prisma.column.findFirst({
                where: { boardID: boardid },
                orderBy: { order: 'desc' }
            });
            order = lastColumn ? lastColumn.order + 1 : 1;
        }

        const column = await prisma.column.create({
            data:{name,order,wipLimit:wipLimit?? null , boardID:boardid}
        });
        res.status(201).json(column);
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"});
    }

}

export async function updatecolumn(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.projectid as string);
        const columnid= parseInt(req.params.columnid as string);

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN'){
            res.status(403).json({error:"Only admins can update columns"});
            return;
        }

        const {name,order,WipLimit} = req.body;
        
        const column = await prisma.column.findUnique({where :{id:columnid}});
        if(!column){
            res.status(404).json({error:"Column not found"});
            return;
        }
        const update =await prisma.column.update({
            where:{id:columnid},
            data:{
                name : name ?? column?.name,
                order:order?? column?.order,
                wipLimit: WipLimit ?? column?.wipLimit
            }   
        });
        res.status(200).json(update);
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"})
    }
}

export async function deletecolumn(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.projectid as string);
        const columnid = parseInt(req.params.columnid as string);

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN'){
            res.status(403).json({error:"Only admins can delete columns"});
            return;
        }

        await prisma.column.delete({
            where:{id:columnid}
        });
        res.status(200).json({message:"Column deleted"})
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"})
    }
}

export async function reordercolumns(req: Request, res: Response): Promise<void> {
    try {
        const projectid = parseInt(req.params.projectid as string);

        const member = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: req.user!.userID,
                    projectID: projectid
                }
            }
        });
        if (req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN') {
            res.status(403).json({ error: "Only admins can reorder columns" });
            return;
        }

        const { columns } = req.body;
        if (!Array.isArray(columns)) {
            res.status(400).json({ error: "List of columns is required" });
            return;
        }

        const transactionUpdates = columns.map((col: { id: number, order: number }) => {
            return prisma.column.update({
                where: { id: col.id },
                data: { order: col.order }
            });
        });

        await prisma.$transaction(transactionUpdates);
        res.status(200).json({ message: "Columns reordered" });
    } catch (error: unknown) {
        res.status(500).json({ error: "Server error, please try again" });
    }
}

export async function addtransition(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.projectid as string);
        const boardid = parseInt(req.params.boardid as string);

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN'){
            res.status(403).json({error:"Only admins can add transitions"});
            return;
        }
        
        const{fromStatus, toStatus}= req.body;
        if(!fromStatus || !toStatus){
            res.status(400).json({error:"fromStatus and toStatus are required"})
            return;
        }
        const transition= await prisma.workTransition.create({
            data:{boardID:boardid,fromStatus,toStatus}
        });
        res.status(201).json(transition);
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"})
    }
}
export async function removetransition(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.projectid as string);
        const transitionid = parseInt(req.params.transitionid as string);

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(req.user?.globalRole !== 'ADMIN' && member?.role !== 'ADMIN'){
            res.status(403).json({error:"Only admins can remove transitions"});
            return;
        }

        await prisma.workTransition.delete({
            where:{id:transitionid}
        });
        res.status(200).json({message:"Transition removed"})
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"})
    }
}
