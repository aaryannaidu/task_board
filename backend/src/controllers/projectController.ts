import { Request, Response } from 'express';
import prisma from "../utils/prisma";
import { CreateProjectBody } from '../types/index';

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
        res.status(200).json(projects)
    }
    catch(error:unknown){
        res.status(500).json({message:"Something went wrong, Please try again later"});
    }
}

export async function createProject(req:Request,res:Response):Promise<void>{
    try{
        if( req.user!.globalRole !== 'ADMIN'){
            res.status(403).json({message:"Only admins can create projects"});
            return ;
        }
        const{name,description}= req.body as CreateProjectBody;
        if(!name){
            res.status(400).json({message:"Project Name is Required"});
            return;
        }
        const newproject = await prisma.project.create({
            data:{name ,description}
        });
        await prisma.projectMember.create({
            data:{
                userID:req.user!.userID,
                projectID:newproject.id,
                role:'ADMIN'
            }
        });
        res.status(201).json(newproject);
    }
    catch(error:unknown){
        res.status(500).json({message:"Something went wrong, Please try again later"});
    }
}

export async function updateproject(req:Request,res:Response):Promise<void>{
    try{
        const projectID = parseInt(req.params.id as string);
        const{name,description}= req.body as CreateProjectBody;

        const project = await prisma.project.findUnique({
            where:{id:projectID}
        });
        if(!project){
            res.status(404).json({message:"Project Not Found"});
        }
        const member=await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectID
            }
            }
        })
        if(!member||member.role !=='ADMIN'){
            res.status(403).json({message:"only Project Admin can update project"});
            return;
        }
        const updateproject= await prisma.project.update({
            where:{id:projectID},
            data:{
                name:name ?? project?.name,
                description:description ?? project?.description
            }
        })
        res.status(200).json(updateproject);
    }
    catch(error:unknown){
        res.status(500).json({message:"Something went wrong, Please try again later"});
    }
}
export async function archiveproject(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.id as string);
        const project= await prisma.project.findUnique({
            where:{id:projectid}
        });
        if(!project){
            res.status(404).json({message:"Project Not Found"});
            return;
        }
        const member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        })
        if(!member|| member.role!=='ADMIN'){
            res.status(403).json({message:"Only Project Admin can archive project"});
            return ;
        }
        const archiveproject= await prisma.project.update({
            where:{id:projectid},
            data:{archived:true}
        });
        res.status(200).json({message:"Project Archived Successfully",project:archiveproject
        })
    }
    catch(error:unknown){}
}

export async function addmember(req:Request,res:Response):Promise<void>{
    try{
        const projectid = parseInt(req.params.id as string);
        const {userID,role}= req.body ;

        const project =await prisma.project.findUnique({
            where:{id:projectid}
        });
        if(!project){
            res.status(404).json({message:"Project Not Found"});
            return;
        }
        const caller = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        })
        if(req.user?.globalRole !== 'ADMIN' && caller?.role !== 'ADMIN'){
            res.status(403).json({message:"Only Project Admin can archive project"});
            return ;
        }
        const user_to_add= await prisma.user.findUnique({
            where:{id:userID}
        });
        if(!user_to_add){
            res.status(404).json({message:"User Not Found"});
            return;
        }
        const existing_member = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:userID,
                projectID:projectid
            }}
        });
        if(existing_member){
            res.status(400).json({message:"User already a member of the project"});
            return;
        }
        const add_user = await prisma.projectMember.create({
            data:{
                userID:userID,
                projectID:projectid,
                role:role
            }
        })
        res.status(201).json({add_user,message:"User added to project successfully"});

    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Please try again later"});
    }
}

export async function changememberrole(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.id as string);
        const userID = parseInt(req.params.userID as string);
        const {role}= req.body;
        const project = await prisma.project.findUnique({
            where:{id:projectid}
        })
        if(!project){
            res.status(404).json({message:"proeject Not Found"});
            return;
        }
        const caller = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        })
        if(req.user?.globalRole !== 'ADMIN' && caller?.role !== 'ADMIN'){
            res.status(403).json({message:"Not Authorized to change member role"});
            return;
        }
        const update_role = await prisma.projectMember.update({
            where:{userID_projectID:{
                userID:userID,
                projectID:projectid
            }
        },
        data:{role:role}
        });
        res.status(200).json({update_role,message:"Member Role Updated Successfully "});
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Please try again later"});
    }
}

export async function removemember(req:Request,res:Response):Promise<void>{
    try{
        const projectid= parseInt(req.params.id as string);
        const userID = parseInt(req.params.userID as string);
        const project = await prisma.project.findUnique({
            where:{id:projectid}
        })
        if(!project){
            res.status(404).json({message:"proeject Not Found"});
            return;
        }
        const caller = await prisma.projectMember.findUnique({
            where:{userID_projectID:{
                userID:req.user!.userID,
                projectID:projectid
            }}
        })
        if(req.user?.globalRole !== 'ADMIN' && caller?.role !== 'ADMIN'){
            res.status(403).json({message:"Not Authorized to change member role"});
            return;
        }
        const admin= await prisma.projectMember.findMany({
            where:{
                projectID:projectid,
                role:'ADMIN'
            }
        });
        if(admin.length===1 && admin[0].userID===userID){
            res.status(400).json({error:"Cannot remove the only admin of the project"});
            return;
        }
        await prisma.projectMember.delete({
            where:{userID_projectID:{
                userID:userID,
                projectID:projectid
            }}
        });
        res.status(200).json({message:"Member removed from project "});
    }
    catch(error:unknown){
        res.status(500).json({error:"Something went wrong, Please try again later"});
    }
}