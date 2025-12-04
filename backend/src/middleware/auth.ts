import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET || 'demo-secret-key-change-in-production';

// Simplified user type for JWT payload
export interface JwtUserPayload {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string | null;
  language: 'ja' | 'en';
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export type AuthRequest = Request;

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as JwtUserPayload;
    req.user = decoded;
  } catch {
    // Token is invalid, but that's okay for optional auth
  }

  next();
}

// Admin middleware - checks if user is admin
export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // First verify the token
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as JwtUserPayload;
    req.user = decoded;

    // Check if user is admin by looking up in database
    const { db, users } = await import('../db/index.js');
    const { eq } = await import('drizzle-orm');

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.id),
    });

    if (!user || user.isAdmin !== 1) {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
