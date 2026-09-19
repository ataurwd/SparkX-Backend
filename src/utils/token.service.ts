import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'sparkx_access_super_secret_jwt_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sparkx_refresh_super_secret_jwt_key_2026';

export interface TokenPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
  permissions?: string[];
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string): { token: string; tokenHash: string; expiresAt: Date } {
  // Generate random 64-byte hex token
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14); // 14 days

  return { token, tokenHash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}
