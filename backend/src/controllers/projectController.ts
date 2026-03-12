import { Request, Response } from 'express';
import prisma from "../utils/prisma";

export async function getprojects(req:Request,res:Response):Promise<void>{
    try{
        const projects = await prisma.project.findMany({
            where:{
                projectMembers:{
                    some:{userID:req.user!.userID }
                }
            },
            include:{
                projectMembers:{
                    include:{
                        user:{
                            select:{
                                id:true,
                                name:true,
                                email:true,
                                avatarUrl:true
                            }
                        }
                    }
                }
            }
        })
        res.status(200).json({projects})
    }
    catch(error:unknown){
        res.status(500).json({message:"Something went wrong, Please try again later"});
    }
}