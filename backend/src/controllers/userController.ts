import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { UpdateMeBody } from '../types/index';

// UpdateMe — PATCH /api/users/me
// Allows the authenticated user to update their own name or avatarUrl
export async function UpdateMe(req: Request, res: Response): Promise<void> {
    try {
        const { name, avatarUrl } = req.body as UpdateMeBody;

        if (!name && !avatarUrl) {
            res.status(400).json({ message: 'Provide at least one field to update: name or avatarUrl' });
            return;
        }

        const updated = await prisma.user.update({
            where: { id: req.user!.userID },
            data: {
                ...(name !== undefined && { name }),
                ...(avatarUrl !== undefined && { avatarUrl }),
            },
            select: { id: true, name: true, email: true, avatarUrl: true, globalRole: true },
        });

        res.status(200).json(updated);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Something went wrong' });
    }
}


// ListUsers — GET /api/users
// Paginated + searchable list of all users (Admin only)
// Query params: page (default 1), limit (default 20), search (partial name/email match)
export async function ListUsers(req: Request, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const search = (req.query.search as string | undefined)?.trim();

        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [total, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                select: { id: true, name: true, email: true, avatarUrl: true, globalRole: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        res.status(200).json({
            data: users,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Something went wrong' });
    }
}

// GetUserById — GET /api/users/:id
// Returns any user's profile (Admin only)

export async function GetUserById(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id as string);
        if (isNaN(id)) {
            res.status(400).json({ message: 'Invalid user ID' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, avatarUrl: true, globalRole: true, createdAt: true },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json(user);
    } catch (error: unknown) {
        res.status(500).json({ message: 'Something went wrong' });
    }
}
