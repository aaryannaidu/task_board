import { Request, Response } from 'express';
import prisma from "../utils/prisma";
import { CreateProjectBody } from '../types/index';

export async function getprojects(req: Request, res: Response): Promise<void> {
    try {
        const projects = await prisma.project.findMany({
            where: {
                projectMembers: {
                    some: { userID: req.user!.userID }
                }
            },
            include: {
                projectMembers: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            }
        })
        res.status(200).json(projects)
    }
    catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong, Please try again later" });
    }
}

export async function createProject(req: Request, res: Response): Promise<void> {
    try {
        if (req.user!.globalRole !== 'ADMIN') {
            res.status(403).json({ message: "Only admins can create projects" });
            return;
        }
        const { name, description } = req.body as CreateProjectBody;
        if (!name) {
            res.status(400).json({ message: "Project Name is Required" });
            return;
        }
        const newproject = await prisma.project.create({
            data: { name, description },
            include: {
                projectMembers: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            }
        });
        await prisma.projectMember.create({
            data: {
                userID: req.user!.userID,
                projectID: newproject.id,
                role: 'ADMIN'
            }
        });

        const projectWithMembers = await prisma.project.findUnique({
            where: { id: newproject.id },
            include: {
                projectMembers: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            }
        });
        res.status(201).json(projectWithMembers);
    }
    catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong, Please try again later" });
    }
}

export async function updateproject(req: Request, res: Response): Promise<void> {
    try {
        const projectID = parseInt(req.params.id as string);
        const { name, description } = req.body as CreateProjectBody;

        const project = await prisma.project.findUnique({
            where: { id: projectID }
        });
        if (!project) {
            res.status(404).json({ message: "Project Not Found" });
        }
        const member = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: req.user!.userID,
                    projectID: projectID
                }
            }
        })
        if (!member || member.role !== 'ADMIN') {
            res.status(403).json({ message: "only Project Admin can update project" });
            return;
        }
        const updateproject = await prisma.project.update({
            where: { id: projectID },
            data: {
                name: name ?? project?.name,
                description: description ?? project?.description
            }
        })
        res.status(200).json(updateproject);
    }
    catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong, Please try again later" });
    }
}
export async function archiveproject(req: Request, res: Response): Promise<void> {
    try {
        const projectid = parseInt(req.params.id as string);
        const project = await prisma.project.findUnique({
            where: { id: projectid }
        });
        if (!project) {
            res.status(404).json({ message: "Project Not Found" });
            return;
        }
        const member = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: req.user!.userID,
                    projectID: projectid
                }
            }
        })
        if (!member || member.role !== 'ADMIN') {
            res.status(403).json({ message: "Only Project Admin can archive/unarchive project" });
            return;
        }

        const newArchivedState = !project.archived;
        const updatedProject = await prisma.project.update({
            where: { id: projectid },
            data: { archived: newArchivedState }
        });

        const statusMessage = newArchivedState ? "Project archived successfully" : "Project unarchived successfully";
        res.status(200).json({ message: statusMessage, project: updatedProject });
    } catch (error: unknown) {
        res.status(500).json({ error: "Something went wrong, Please try again later" });
    }
}

export async function addmember(req: Request, res: Response): Promise<void> {
    try {
        const projectid = parseInt(req.params.id as string);
        const { email, role } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectid }
        });
        if (!project) {
            res.status(404).json({ message: "Project Not Found" });
            return;
        }
        const caller = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: req.user!.userID,
                    projectID: projectid
                }
            }
        });

        if (req.user?.globalRole !== 'ADMIN' && caller?.role !== 'ADMIN') {
            res.status(403).json({ message: "Only project admins can add members" });
            return;
        }

        const userToAdd = await prisma.user.findUnique({
            where: { email: email }
        });
        if (!userToAdd) {
            res.status(404).json({ message: "User with this email not found" });
            return;
        }

        const existingMember = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: userToAdd.id,
                    projectID: projectid
                }
            }
        });
        if (existingMember) {
            res.status(400).json({ message: "User is already a member of this project" });
            return;
        }
        const addedUser = await prisma.projectMember.create({
            data: {
                userID: userToAdd.id,
                projectID: projectid,
                role: role
            }
        });
        res.status(201).json({ addedUser, message: "User added to project successfully" });

    }
    catch (error: unknown) {
        res.status(500).json({ error: "Something went wrong, Please try again later" });
    }
}

export async function changememberrole(req: Request, res: Response): Promise<void> {
    try {
        const projectid = parseInt(req.params.id as string);
        const userID = parseInt(req.params.userid as string);
        const { role } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectid }
        });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }
        const caller = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: req.user!.userID,
                    projectID: projectid
                }
            }
        })
        if (req.user?.globalRole !== 'ADMIN' && caller?.role !== 'ADMIN') {
            res.status(403).json({ message: "Not Authorized to change member role" });
            return;
        }
        const updatedRole = await prisma.projectMember.update({
            where: {
                userID_projectID: {
                    userID: userID,
                    projectID: projectid
                }
            },
            data: { role: role }
        });
        res.status(200).json({ updatedRole, message: "Member role updated successfully" });
    }
    catch (error: unknown) {
        res.status(500).json({ error: "Something went wrong, Please try again later" });
    }
}

export async function removemember(req: Request, res: Response): Promise<void> {
    try {
        const projectid = parseInt(req.params.id as string);
        const userID = parseInt(req.params.userid as string);

        const project = await prisma.project.findUnique({
            where: { id: projectid }
        });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }
        const caller = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: req.user!.userID,
                    projectID: projectid
                }
            }
        })
        if (req.user?.globalRole !== 'ADMIN' && caller?.role !== 'ADMIN') {
            res.status(403).json({ message: "Not authorized to remove members" });
            return;
        }
        const admin = await prisma.projectMember.findMany({
            where: {
                projectID: projectid,
                role: 'ADMIN'
            }
        });
        if (admin.length === 1 && admin[0].userID === userID) {
            res.status(400).json({ error: "Cannot remove the only admin of the project" });
            return;
        }
        await prisma.projectMember.delete({
            where: {
                userID_projectID: {
                    userID: userID,
                    projectID: projectid
                }
            }
        });
        res.status(200).json({ message: "Member removed from project" });
    }
    catch (error: unknown) {
        res.status(500).json({ error: "Something went wrong, Please try again later" });
    }
}

export async function getprojectdetails(req: Request, res: Response): Promise<void> {
    try {
        const projectid = parseInt(req.params.id as string);
        const project = await prisma.project.findUnique({
            where: { id: projectid },
            include: {
                boards: true,
                projectMembers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatarUrl: true }
                        }
                    }
                }
            }
        });

        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }

        const isMember = project.projectMembers.some(pm => pm.userID === req.user!.userID);
        if (!isMember && req.user!.globalRole !== 'ADMIN') {
            res.status(403).json({ message: "Not authorized to view this project" });
            return;
        }

        res.status(200).json(project);
    } catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong, Please try again later" });
    }
}

export async function getprojectmembers(req: Request, res: Response): Promise<void> {
    try {
        const projectid = parseInt(req.params.id as string);

        const project = await prisma.project.findUnique({
            where: { id: projectid }
        });
        if (!project) {
            res.status(404).json({ message: "Project not found" });
            return;
        }

        const caller = await prisma.projectMember.findUnique({
            where: {
                userID_projectID: {
                    userID: req.user!.userID,
                    projectID: projectid
                }
            }
        });

        if (!caller && req.user!.globalRole !== 'ADMIN') {
            res.status(403).json({ message: "Not authorized to view project members" });
            return;
        }

        const members = await prisma.projectMember.findMany({
            where: { projectID: projectid },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                }
            }
        });

        res.status(200).json(members);
    } catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong, Please try again later" });
    }
}
