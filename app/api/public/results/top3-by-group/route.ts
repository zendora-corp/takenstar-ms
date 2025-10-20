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
      // ensure CORS headers on rate-limit response
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => rateLimitResult.headers.set(k, v));
      return rateLimitResult;
    }

    const { searchParams } = new URL(req.url);
    const examYear = searchParams.get('examYear')?.trim();

    if (!examYear) {
      return NextResponse.json(
        { success: false, error: 'examYear parameter is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const examYearInt = parseInt(examYear);
    if (isNaN(examYearInt)) {
      return NextResponse.json(
        { success: false, error: 'examYear must be a valid integer' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data: examYearRecord, error: examYearError } = await supabaseAdmin
      .from('exam_years')
      .select('id')
      .eq('year', examYearInt)
      .maybeSingle();

    if (examYearError || !examYearRecord) {
      return NextResponse.json(
        { success: false, error: 'Exam year not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const { data: allResults, error: resultsError } = await supabaseAdmin
      .from('results')
      .select(`
        *,
        registrations!inner(
          id,
          full_name,
          class,
          group_type,
          school_roll_no,
          schools!inner(name, districts!inner(name)),
          exam_year_id
        )
      `)
      .eq('registrations.exam_year_id', examYearRecord.id)
      .order('percentage', { ascending: false })
      .order('total_marks', { ascending: false });

    if (resultsError) {
      console.error('Get results error:', resultsError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!allResults || allResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No results found for this exam year' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const groupedResults: Record<string, any[]> = {};
    allResults.forEach((result: any) => {
      const group = result.registrations.group_type || result.registrations.class;
      if (!groupedResults[group]) groupedResults[group] = [];
      groupedResults[group].push(result);
    });

    const data = Object.keys(groupedResults).map((group) => {
      const groupResults = groupedResults[group];

      groupResults.sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return b.total_marks - a.total_marks;
      });

      let toppers: any[] = [];
      if (groupResults.length > 0) {
        toppers.push(groupResults[0]);
        if (groupResults.length > 1) toppers.push(groupResults[1]);
        if (groupResults.length > 2) {
          const thirdRankPercentage = groupResults[2].percentage;
          const thirdRankTotal = groupResults[2].total_marks;
          for (let i = 2; i < groupResults.length; i++) {
            const current = groupResults[i];
            if (
              current.percentage === thirdRankPercentage &&
              current.total_marks === thirdRankTotal
            ) {
              toppers.push(current);
            } else {
              break;
            }
          }
        }
      }

      const formattedToppers = toppers.map((result: any) => {
        const reg = result.registrations;
        return {
          registrationId: reg.id,
          student: {
            fullName: reg.full_name,
            class: reg.class,
            // NOTE: medium isn't selected in the join; leaving 'Both' fallback as in your code
            medium: reg.schools?.medium || 'Both',
            districtName: reg.schools?.districts?.name || '',
            schoolName: reg.schools?.name || '',
            schoolRollNo: reg.school_roll_no,
          },
          totalMarks: result.total_marks,
          percentage: Number((result.percentage || 0).toFixed(2)),
          rank: result.rank_global || undefined,
        };
      });

      return { group, toppers: formattedToppers };
    });

    data.sort((a, b) => {
      const aVal = typeof a.group === 'number' ? a.group : a.group.charCodeAt(0);
      const bVal = typeof b.group === 'number' ? b.group : b.group.charCodeAt(0);
      return aVal - bVal;
    });

    return NextResponse.json(
      { success: true, data },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Get top 3 by group exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
