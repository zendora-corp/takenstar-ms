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
    // Rate limit (ensure headers if limiter returns a response)
    const rateLimitResult = await applyRateLimit(req);
    if (rateLimitResult) {
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => rateLimitResult.headers.set(k, v));
      return rateLimitResult;
    }

    const { searchParams } = new URL(req.url);
    const examYear = searchParams.get('examYear')?.trim();
    const districtName = searchParams.get('districtName')?.trim();
    const schoolName = searchParams.get('schoolName')?.trim();
    const schoolRollNo = searchParams.get('schoolRollNo')?.trim();

    if (!examYear || !districtName || !schoolName || !schoolRollNo) {
      return NextResponse.json(
        { success: false, error: 'All parameters required: examYear, districtName, schoolName, schoolRollNo' },
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

    const { data: district, error: districtError } = await supabaseAdmin
      .from('districts')
      .select('id, name')
      .ilike('name', districtName)
      .eq('status', 'active')
      .maybeSingle();

    if (districtError || !district) {
      return NextResponse.json(
        { success: false, error: 'District not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id, name, medium')
      .ilike('name', schoolName)
      .eq('district_id', district.id)
      .eq('status', 'active')
      .maybeSingle();

    if (schoolError || !school) {
      return NextResponse.json(
        { success: false, error: 'School not found in specified district' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const { data: registration, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('id, full_name, class, school_roll_no')
      .eq('exam_year_id', examYearRecord.id)
      .eq('school_id', school.id)
      .ilike('school_roll_no', schoolRollNo)
      .maybeSingle();

    if (regError || !registration) {
      return NextResponse.json(
        { success: false, error: 'Registration not found for given roll number' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const { data: result, error: resultError } = await supabaseAdmin
      .from('results')
      .select('*')
      .eq('registration_id', registration.id)
      .maybeSingle();

    if (resultError || !result) {
      return NextResponse.json(
        { success: false, error: 'Result not published yet' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const marks: Record<string, number> = {
      gk: result.gk,
      science: result.science,
      mathematics: result.mathematics,
      logicalReasoning: result.logical_reasoning,
      currentAffairs: result.current_affairs,
    };

    const totalMarks = result.total_marks || 0;
    const percentage = result.percentage || 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          student: {
            fullName: registration.full_name,
            class: registration.class,
            medium: school.medium || 'Both',
            districtName: district.name,
            schoolName: school.name,
            schoolRollNo: registration.school_roll_no,
          },
          marks,
          totalMarks,
          percentage: Number(percentage.toFixed(2)),
          rank: result.rank_global || undefined,
          resultStatus: totalMarks >= 250 ? 'PASS' : 'FAIL',
        },
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Result lookup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
