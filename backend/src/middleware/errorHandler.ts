import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof Error) {
        console.error(err.stack);
        res.status(500).json({ error: err.message || "Something went wrong, Please try again later" });
    } else {
        console.error(err);
        res.status(500).json({ error: "Something went wrong, Please try again later" });
    }
}