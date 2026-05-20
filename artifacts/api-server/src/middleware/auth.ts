import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const _secret = process.env["SESSION_SECRET"];
if (!_secret) throw new Error("SESSION_SECRET environment variable is required");
const SECRET: string = _secret;

export interface AuthPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  orgId?: number;
}

export const COOKIE_NAME = "token";

export function cookieOptions() {
  const isProd = process.env["NODE_ENV"] === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function getActor(req: Request): AuthPayload {
  return (req as Request & { user: AuthPayload }).user;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME];
  const header = req.headers["authorization"];
  const token = cookieToken ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!token) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  try {
    const payload = jwt.verify(token, SECRET) as AuthPayload;
    (req as Request & { user: AuthPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "جلسة منتهية، يرجى تسجيل الدخول مجدداً" });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}
