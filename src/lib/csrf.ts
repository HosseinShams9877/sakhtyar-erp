// ─── CSRF Protection ───
// تولید و اعتبارسنجی توکن CSRF با HMAC-SHA256

import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // ۲۴ ساعت

async function getSecretKey(): Promise<string> {
  return process.env.NEXTAUTH_SECRET || 'fallback-csrf-secret-change-me';
}

export async function generateCsrfToken(userId: string): Promise<string> {
  const secret = await getSecretKey();
  const nonce = Math.random().toString(36).slice(2, 10);
  const iat = Date.now();
  const payload = JSON.stringify({ sub: userId, nonce, iat });

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  const payloadB64 = btoa(payload);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${payloadB64}.${sigB64}`;
}

export async function validateCsrfToken(token: string, userId?: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false, error: 'فرمت توکن نامعتبر' };

    const payload = JSON.parse(atob(parts[0]));
    const signature = parts[1];

    if (Date.now() - payload.iat > CSRF_TOKEN_EXPIRY) {
      return { valid: false, error: 'توکن منقضی شده' };
    }
    if (userId && payload.sub !== userId) {
      return { valid: false, error: 'توکن متعلق به این کاربر نیست' };
    }

    const secret = await getSecretKey();
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)));
    const expectedSigB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)));

    if (signature !== expectedSigB64) {
      return { valid: false, error: 'امضای توکن نامعتبر' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'توکن نامعتبر' };
  }
}

export function getCsrfTokenFromRequest(req: NextRequest): string | null {
  return req.headers.get('X-CSRF-Token');
}

export async function requireCsrf(req: NextRequest, userId?: string): Promise<{ valid: boolean; error?: NextResponse }> {
  const token = getCsrfTokenFromRequest(req);
  if (!token) {
    return { valid: false, error: NextResponse.json({ error: 'توکن CSRF یافت نشد' }, { status: 403 }) };
  }
  const result = await validateCsrfToken(token, userId);
  if (!result.valid) {
    return { valid: false, error: NextResponse.json({ error: result.error || 'توکن CSRF نامعتبر' }, { status: 403 }) };
  }
  return { valid: true };
}
