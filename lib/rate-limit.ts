import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(
  req: NextRequest,
  limit: number = 5,
  windowMs: number = 60000
): { success: boolean; remaining: number } {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const key = `${ip}:${req.nextUrl.pathname}`;
  const now = Date.now();

  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return { success: true, remaining: limit - 1 };
  }

  if (store[key].count >= limit) {
    return { success: false, remaining: 0 };
  }

  store[key].count++;
  return { success: true, remaining: limit - store[key].count };
}

export async function applyRateLimit(
  req: Request,
  limit: number = 10,
  windowMs: number = 60000
): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const url = new URL(req.url);
  const key = `${ip}:${url.pathname}`;
  const now = Date.now();

  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return null;
  }

  if (store[key].count >= limit) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  store[key].count++;
  return null;
}

setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000);
