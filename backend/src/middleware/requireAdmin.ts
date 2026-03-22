import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (req.user?.globalRole !== 'ADMIN') {
        res.status(403).json({ error: 'Forbidden: Admins only' });
        return;
    }
    next();
}
