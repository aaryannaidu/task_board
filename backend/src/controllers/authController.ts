import { Request, Response } from 'express';
import prisma from "../utils/prisma";
import { hashPwd, checkPwd } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { RegisterBody, LoginBody } from '../types/index';

// ====
// registeration
// ====
export async function Register(req: Request, res: Response): Promise<void> {
    try {
        const { name, email, password } = req.body as RegisterBody;
        if (!name || !email || !password) {
            res.status(400).json({ message: "Name, email and password are required" });
            return;
        }
        const existingemail = await prisma.user.findUnique({ where: { email } });
        if (existingemail) {
            res.status(400).json({ message: "Email already exists , Try Different one" });
            return;
        }
        const passwordHash = await hashPwd(password);
        const user = await prisma.user.create({
            data: { name, email, passwordHash }
        });
        const { passwordHash: _, ...safeuser } = user;
        res.status(201).json(safeuser);
        console.log("user registerd succefully")
    } catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong, Please try again later" });
    }
}
// ====
// login
// ====
export async function Login(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body as LoginBody;
        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        const validpassword = await checkPwd(password, user.passwordHash);
        if (!validpassword) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        const accessToken = signAccessToken(user.id, user.globalRole);
        const refreshToken = signRefreshToken(user.id);
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userID: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 15 * 60 * 1000
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        const { passwordHash: _, ...safeuser } = user;
        res.status(200).json(safeuser);
        console.log("user logged in successfully")
    } catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong, Please try again later", error: error instanceof Error ? error.message : String(error) });
    }
}

// ====
// logout
// ====
export async function Logout(req: Request, res: Response): Promise<void> {
    try {
        const refreshToken = req.cookies.refresh_token;
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
        }
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong" });
    }
}

// ====
// refresh — issue a new access token using the refresh token cookie
// ====
export async function Refresh(req: Request, res: Response): Promise<void> {
    try {
        const refreshToken = req.cookies.refresh_token as string | undefined;
        if (!refreshToken) {
            res.status(401).json({ message: "No refresh token" });
            return;
        }

        // Verify the JWT signature and expiry
        let payload: { userID: number };
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch {
            res.status(401).json({ message: "Invalid or expired refresh token" });
            return;
        }

        // Check the token still exists in DB (not revoked on logout)
        const stored = await prisma.refreshToken.findFirst({
            where: {
                token: refreshToken,
                userID: payload.userID,
                expiresAt: { gt: new Date() },
            },
        });
        if (!stored) {
            res.status(401).json({ message: "Refresh token revoked or expired" });
            return;
        }

        // Fetch user for latest role
        const user = await prisma.user.findUnique({ where: { id: payload.userID } });
        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }

        // Issue new access token
        const newAccessToken = signAccessToken(user.id, user.globalRole);
        res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 15 * 60 * 1000,
        });

        res.status(200).json({ message: "Token refreshed" });
    } catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong" });
    }
}

// ====
// getMe — return the currently authenticated user's profile
// ====
export async function GetMe(req: Request, res: Response): Promise<void> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userID },
            select: { id: true, name: true, email: true, avatarUrl: true, globalRole: true },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json(user);
    } catch (error: unknown) {
        res.status(500).json({ message: "Something went wrong" });
    }
}