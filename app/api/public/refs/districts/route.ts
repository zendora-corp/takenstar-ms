import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/rate-limit';
import { corsHeaders } from '@/lib/cors';

// --- Preflight handler (for CORS) ---
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || undefined;
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// --- GET handler ---
export async function GET(request: Request) {
  const origin = request.headers.get('origin') || undefined;

  try {
    const rateLimitResult = await applyRateLimit(request);
    if (rateLimitResult) {
      // Attach CORS headers if the limiter produced a response
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) =>
        rateLimitResult.headers.set(k, v)
      );
      return rateLimitResult;
    }

    const { data, error } = await supabaseAdmin
      .from('districts')
      .select('id, name')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Get districts error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { success: true, data: data || [] },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Get districts exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
