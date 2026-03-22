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

        // Create board + default columns + default transitions in one atomic transaction
        const defaultColumns = [
            { name: 'To Do',      order: 1 },
            { name: 'In Progress', order: 2 },
            { name: 'Review',     order: 3 },
            { name: 'Done',       order: 4 },
        ];

        const board = await prisma.$transaction(async (tx) => {
            const newBoard = await tx.board.create({
                data: { name, projectID: projectid }
            });

            // Create the 4 default columns
            const createdCols = await Promise.all(
                defaultColumns.map(col =>
                    tx.column.create({
                        data: { name: col.name, order: col.order, boardID: newBoard.id }
                    })
                )
            );

            // Seed sequential transitions between every adjacent pair of columns
            const transitions: { fromStatus: string; toStatus: string }[] = [];
            for (let i = 0; i < createdCols.length - 1; i++) {
                transitions.push({
                    fromStatus: createdCols[i].name,
                    toStatus:   createdCols[i + 1].name,
                });
            }

            await tx.workTransition.createMany({
                data: transitions.map(t => ({ ...t, boardID: newBoard.id }))
            });

            return newBoard;
        });

        // Return the full board with columns and transitions
        const fullBoard = await prisma.board.findUnique({
            where: { id: board.id },
            include: { columns: { orderBy: { order: 'asc' } }, transitions: true }
        });
        res.status(201).json(fullBoard);
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

        const {name, wipLimit} = req.body;
        if(!name){
            res.status(400).json({error:"Column name is required"});
            return;
        }

        // Fetch all existing columns ordered by position
        const existingColumns = await prisma.column.findMany({
            where: { boardID: boardid },
            orderBy: { order: 'asc' }
        });

        // Find the "Done" column — it should always stay last
        const doneIndex = existingColumns.findIndex(c => c.name === 'Done');
        const doneColumn = doneIndex !== -1 ? existingColumns[doneIndex] : null;

        // New column sits just before Done (or at end if Done doesn't exist)
        const insertOrder = doneColumn ? doneColumn.order : (existingColumns.length > 0 ? existingColumns[existingColumns.length - 1].order + 1 : 1);

        const column = await prisma.$transaction(async (tx) => {
            // If there's a Done column, push it one step further
            if (doneColumn) {
                await tx.column.update({
                    where: { id: doneColumn.id },
                    data: { order: doneColumn.order + 1 }
                });
            }

            const newCol = await tx.column.create({
                data: { name, order: insertOrder, wipLimit: wipLimit ?? null, boardID: boardid }
            });

            // Rebuild all sequential forward transitions for the board
            const allColumns = await tx.column.findMany({
                where: { boardID: boardid },
                orderBy: { order: 'asc' }
            });

            // Delete existing transitions and recreate
            await tx.workTransition.deleteMany({ where: { boardID: boardid } });
            const newTransitions: { fromStatus: string; toStatus: string; boardID: number }[] = [];
            for (let i = 0; i < allColumns.length - 1; i++) {
                newTransitions.push({
                    fromStatus: allColumns[i].name,
                    toStatus: allColumns[i + 1].name,
                    boardID: boardid
                });
            }
            if (newTransitions.length > 0) {
                await tx.workTransition.createMany({ data: newTransitions });
            }

            return newCol;
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
        const boardid = parseInt(req.params.boardid as string);

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

        const { columns } = req.body as { columns: { id: number; order: number }[] };
        if (!Array.isArray(columns)) {
            res.status(400).json({ error: "List of columns is required" });
            return;
        }

        // Enforce Done stays last: find the Done column, force its order to max
        const allColData = await prisma.column.findMany({
            where: { boardID: boardid },
            select: { id: true, name: true }
        });
        const doneCol = allColData.find(c => c.name === 'Done');
        let orderedPayload = [...columns];
        if (doneCol) {
            const maxOrder = Math.max(...orderedPayload.map(c => c.order));
            orderedPayload = orderedPayload.map(c =>
                c.id === doneCol.id ? { ...c, order: maxOrder } : c
            );
        }

        await prisma.$transaction(async (tx) => {
            // Apply the new orders
            await Promise.all(orderedPayload.map(col =>
                tx.column.update({ where: { id: col.id }, data: { order: col.order } })
            ));

            // Rebuild sequential transitions based on the new order
            const reorderedColumns = await tx.column.findMany({
                where: { boardID: boardid },
                orderBy: { order: 'asc' }
            });
            await tx.workTransition.deleteMany({ where: { boardID: boardid } });
            const newTransitions: { fromStatus: string; toStatus: string; boardID: number }[] = [];
            for (let i = 0; i < reorderedColumns.length - 1; i++) {
                newTransitions.push({
                    fromStatus: reorderedColumns[i].name,
                    toStatus: reorderedColumns[i + 1].name,
                    boardID: boardid
                });
            }
            if (newTransitions.length > 0) {
                await tx.workTransition.createMany({ data: newTransitions });
            }
        });

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

export async function updateboard(req:Request,res:Response):Promise<void>{
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
            res.status(403).json({error:"Only admins can update boards"});
            return;
        }

        const { name } = req.body;
        if (!name) {
            res.status(400).json({ error: "Board name is required" });
            return;
        }

        const board = await prisma.board.update({
            where: { id: boardid },
            data: { name }
        });
        res.status(200).json(board);
    }
    catch(error:unknown){
        res.status(500).json({error:"Server error, please try again"});
    }
}
