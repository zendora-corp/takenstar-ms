import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/rate-limit';
import { corsHeaders } from '@/lib/cors';

// Preflight for CORS
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || undefined;
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || undefined;

  try {
    // Apply rate limit; add CORS headers if limiter returns a response
    const rateLimitResult = await applyRateLimit(request);
    if (rateLimitResult) {
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => rateLimitResult.headers.set(k, v));
      return rateLimitResult;
    }

    const { data: activeYear, error } = await supabaseAdmin
      .from('exam_years')
      .select('*')
      .eq('status', 'active')
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Get active exam year error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!activeYear) {
      return NextResponse.json(
        { success: false, error: 'No active exam year found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: activeYear.id,
          year: activeYear.year,
          registrationOpenDate: activeYear.registrationOpenDate,
          registrationCloseDate: activeYear.registrationCloseDate,
          examDate: activeYear.examDate,
          resultDate: activeYear.resultDate,
          status: activeYear.status,
        },
      },
      { headers: corsHeaders(origin) }
    );
  } catch (err) {
    console.error('Get active exam year exception:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
