import { Request, Response } from 'express';
import prisma from "../utils/prisma";

export async function createboard(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.projectid as string);
        const{name}= req.body;
        if(!name){
            res.status(400).json({error:"Board Name is Required"});
        }
        const project = await prisma.project.findUnique({
            where:{id:projectid}
        });
        if(!project){
            res.status(404).json({error:"Project Not Found"});
        }

        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        });
        if(!member){
            res.status(403).json({error:"Not a member of this project"});
        }
        const board = await prisma.board.create({
            data:{name,projectID:projectid}
        });
        res.status(201).json(board);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Try again later"});
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
        if(!member){
            res.status(403).json({error:"Not a member of this project"});
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
        res.status(500).json({error:"Something went wrong, Try again later"});
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
            if(!member || member.role !== "ADMIN"){
                res.status(403).json({error:"Only Project Admin can delete boards"});
            }
            await prisma.board.delete({
                where:{id :boardid}
            });
            res.status(200).json({message:"Board delete Successfully"})
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Try again later"});
    }
}

export async function createcolumn(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.projectid as string);
        const boardid= parseInt(req.params.boardid as string);

        const {name,order,wipLimit}= req.body;
        if(!name || !order){
            res.status(400).json({error:"Name and Order are Required "});
        }

        const column = await prisma.column.create({
            data:{name,order,wipLimit:wipLimit?? null , boardID:boardid}
        });
        res.status(201).json(column);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Try again later"});
    }

}

export async function updatecolumn(req:Request,res:Response):Promise<void>{
    try{
        const columnid= parseInt(req.params.columnid as string);
        const {name,order,WipLimit} = req.body;
        
        const column = await prisma.column.findUnique({where :{id:columnid}});
        if(!column){
            res.status(404).json({error:"Column Not Found"});
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
        res.status(500).json({error:"Something went wrong ,Try again later"})
    }
}

export async function deletecolumn(req:Request,res:Response):Promise<void>{
    try{
        const columnid = parseInt(req.params.columnid as string);
        await prisma.column.delete({
            where:{id:columnid}
        });
        res.status(200).json({message:"Column Delete Successfully"})
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong ,Try again later"})
    }
}

export async function addtransition(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.projectid as string);
        const boardid = parseInt(req.params.boardid as string);
        
        const{fromStatus, toStatus}= req.body;
        if(!fromStatus || !toStatus){
            res.status(400).json({error:"fromStatus and toStatus are Required"})
        }
        const transition= await prisma.workTransition.create({
            data:{boardID:boardid,fromStatus,toStatus}
        });
        res.status(201).json(transition);
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong ,Try again later"})
    }
}
export async function removetransition(req:Request,res:Response):Promise<void>{
    try{
        const transitionid = parseInt(req.params.transitionid as string);
        await prisma.workTransition.delete({
            where:{id:transitionid}
        });
        res.status(200).json({message:"Transition remove Successfully"})
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong ,Try again later"})
    }
}
