// lib/cors.ts
export const ALLOWED_ORIGINS = [
  'https://takenstar-beta.vercel.app/', // your client
  'http://localhost:3000',        // local dev
];

export function corsHeaders(origin?: string) {
  const allowOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  } as Record<string, string>;
}
