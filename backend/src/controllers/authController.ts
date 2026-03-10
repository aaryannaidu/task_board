import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    // get name, email, password from request body
    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    // check all fields exist
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }

    // check email not already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }

    // hash the password directly here
    const passwordHash = await bcrypt.hash(password, 10);

    // save user to database
    const user = await prisma.user.create({
      data: { name, email, passwordHash }
    });

    // return user without passwordHash
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);

  } catch (err: unknown) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}