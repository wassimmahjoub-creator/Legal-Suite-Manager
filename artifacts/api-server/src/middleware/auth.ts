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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  const token = header.slice(7);
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

export function getActor(req: import("express").Request): AuthPayload {
  return (req as import("express").Request & { user: AuthPayload }).user;
}
