import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { applyRateLimit } from '@/lib/rate-limit';
import { corsHeaders } from '@/lib/cors';

// --- Preflight (CORS) ---
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;

  try {
    const rateLimitResult = await applyRateLimit(req);
    if (rateLimitResult) {
      // Ensure CORS headers on the ratelimit response as well
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => rateLimitResult.headers.set(k, v));
      return rateLimitResult;
    }

    const { searchParams } = new URL(req.url);
    const districtId = searchParams.get('districtId');

    if (districtId) {
      const { data, error } = await supabaseAdmin
        .from('schools')
        .select(`
          id,
          name,
          districtId,
          districts!inner(name)
        `)
        .eq('districtId', districtId)
        .eq('status', 'active')
        .eq('districts.status', 'active')
        .order('name');

      if (error) {
        console.error('Get schools by district error:', error);
        return NextResponse.json(
          { success: false, error: 'Database error' },
          { status: 500, headers: corsHeaders(origin) }
        );
      }

      const formattedData = (data || []).map((school: any) => ({
        id: school.id,
        name: school.name,
        districtId: school.districtId,
        districtName: school.districts?.name || '',
      }));

      return NextResponse.json(
        { success: true, data: formattedData },
        { headers: corsHeaders(origin) }
      );
    } else {
      const { data, error } = await supabaseAdmin
        .from('schools')
        .select(`
          id,
          name,
          districtId,
          districts!inner(name)
        `)
        .eq('status', 'active')
        .eq('districts.status', 'active')
        .order('districts(name)', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Get all schools error:', error);
        return NextResponse.json(
          { success: false, error: 'Database error' },
          { status: 500, headers: corsHeaders(origin) }
        );
      }

      const formattedData = (data || []).map((school: any) => ({
        id: school.id,
        name: school.name,
        districtId: school.districtId,
        districtName: school.districts?.name || '',
      }));

      return NextResponse.json(
        { success: true, data: formattedData },
        { headers: corsHeaders(origin) }
      );
    }
  } catch (error) {
    console.error('Get schools exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
