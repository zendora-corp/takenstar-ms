import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { corsHeaders } from '@/lib/cors';

// Preflight (CORS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;

  try {
    const { searchParams } = new URL(req.url);
    const examYear = searchParams.get('examYear');
    const group = searchParams.get('group');

    if (!examYear) {
      return NextResponse.json(
        { success: false, error: 'examYear is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data: examYearRecord, error: eyErr } = await supabaseAdmin
      .from('exam_years')
      .select('id')
      .eq('year', parseInt(examYear))
      .single();

    if (eyErr) {
      console.error('Exam year lookup error:', eyErr);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!examYearRecord) {
      return NextResponse.json(
        { success: false, error: 'Exam year not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    let query = supabaseAdmin
      .from('results')
      .select(
        `
        total,
        percentage,
        rank_global,
        registrations!inner(
          full_name,
          class,
          group_type,
          schools!inner(name),
          districts!inner(name)
        )
      `
      )
      .eq('exam_year_id', examYearRecord.id)
      .order('total', { ascending: false })
      .order('mathematics', { ascending: false })
      .order('science', { ascending: false })
      .limit(3);

    if (group && (group === 'A' || group === 'B')) {
      query = query.eq('registrations.group_type', group);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Topper query error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const toppers =
      data?.map((result: any) => ({
        name: result.registrations.full_name,
        class: result.registrations.class,
        group: result.registrations.group_type,
        school: result.registrations.schools.name,
        district: result.registrations.districts.name,
        total: result.total,
        percentage: result.percentage,
        rank: result.rank_global,
      })) ?? [];

    return NextResponse.json(
      { success: true, data: toppers },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Hall of fame error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
