import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

export function signAccessToken(userID: number, globalRole: string): string {
    return jwt.sign({ userID, globalRole }, ACCESS_SECRET, { expiresIn: '15m' });
}
export function signRefreshToken(userID: number): string {
    return jwt.sign({ userID }, REFRESH_SECRET, { expiresIn: '7d' });
}
export function verifyAccessToken(token: string): {
    userID: number,
    globalRole: string
} {
    return jwt.verify(token, ACCESS_SECRET) as {
        userID: number,
        globalRole: string
    };
}