import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/rate-limit';
import { corsHeaders } from '@/lib/cors';

// --- Preflight handler for CORS ---
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || undefined;
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// --- GET handler ---
export async function GET(request: Request) {
  const origin = request.headers.get('origin') || undefined;

  try {
    // Apply rate limit and ensure headers if limited
    const rateLimitResult = await applyRateLimit(request);
    if (rateLimitResult) {
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([key, value]) =>
        rateLimitResult.headers.set(key, value)
      );
      return rateLimitResult;
    }

    const { data: examYears, error } = await supabaseAdmin
      .from('exam_years')
      .select('*')
      .order('year', { ascending: false });

    if (error) {
      console.error('Get exam years error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const formattedData = (examYears || []).map((year) => ({
      id: year.id,
      year: year.year,
      registrationOpenDate: year.registrationOpenDate,
      registrationCloseDate: year.registrationCloseDate,
      examDate: year.examDate,
      resultDate: year.resultDate,
      status: year.status,
    }));

    return NextResponse.json(
      { success: true, data: formattedData },
      { headers: corsHeaders(origin) }
    );
  } catch (err) {
    console.error('Get exam years exception:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
