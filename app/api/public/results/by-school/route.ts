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
      // Ensure CORS headers on rate-limit response too
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => rateLimitResult.headers.set(k, v));
      return rateLimitResult;
    }

    const { searchParams } = new URL(req.url);
    const examYear = searchParams.get('examYear')?.trim();
    const schoolId = searchParams.get('schoolId')?.trim();
    const districtName = searchParams.get('districtName')?.trim();
    const schoolName = searchParams.get('schoolName')?.trim();

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

    if (!schoolId && (!districtName || !schoolName)) {
      return NextResponse.json(
        { success: false, error: 'Either schoolId OR both districtName and schoolName are required' },
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

    let school: any;
    let district: any;

    if (schoolId) {
      const { data: schoolData, error: schoolError } = await supabaseAdmin
        .from('schools')
        .select(`
          id,
          name,
          districtId,
          medium,
          districts!inner(id, name)
        `)
        .eq('id', schoolId)
        .eq('status', 'active')
        .maybeSingle();

      if (schoolError || !schoolData) {
        return NextResponse.json(
          { success: false, error: 'School not found' },
          { status: 404, headers: corsHeaders(origin) }
        );
      }

      school = schoolData;
      district = schoolData.districts;
    } else {
      const { data: districtData, error: districtError } = await supabaseAdmin
        .from('districts')
        .select('id, name')
        .ilike('name', districtName!)
        .eq('status', 'active')
        .maybeSingle();

      if (districtError || !districtData) {
        return NextResponse.json(
          { success: false, error: 'District not found' },
          { status: 404, headers: corsHeaders(origin) }
        );
      }

      district = districtData;

      const { data: schoolData, error: schoolError } = await supabaseAdmin
        .from('schools')
        .select('id, name, districtId, medium')
        .ilike('name', schoolName!)
        .eq('districtId', district.id)
        .eq('status', 'active')
        .maybeSingle();

      if (schoolError || !schoolData) {
        return NextResponse.json(
          { success: false, error: 'School not found in specified district' },
          { status: 404, headers: corsHeaders(origin) }
        );
      }

      school = schoolData;
    }

    const { data: registrations, error: regError } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        full_name,
        class,
        school_roll_no,
        results!inner(*)
      `)
      .eq('exam_year_id', examYearRecord.id)
      .eq('school_id', school.id);

    if (regError) {
      console.error('Get registrations error:', regError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const results = (registrations || [])
      .map((reg: any) => {
        const result = reg.results;
        if (!result) return null;

        const marks: Record<string, number> = {
          gk: result.gk,
          science: result.science,
          mathematics: result.mathematics,
          logicalReasoning: result.logical_reasoning,
          currentAffairs: result.current_affairs,
        };

        const totalMarks = result.total_marks || 0;
        const percentage = result.percentage || 0;

        return {
          registrationId: reg.id,
          student: {
            fullName: reg.full_name,
            class: reg.class,
            medium: school.medium || 'Both',
            schoolRollNo: reg.school_roll_no,
          },
          marks,
          totalMarks,
          percentage: Number(percentage.toFixed(2)),
          rank: result.rank_school || undefined,
          resultStatus: totalMarks >= 250 ? 'PASS' : 'FAIL',
        };
      })
      .filter((r) => r !== null)
      .sort((a: any, b: any) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks;
        return a.student.fullName.localeCompare(b.student.fullName);
      });

    return NextResponse.json(
      {
        success: true,
        data: {
          examYear: examYearInt,
          school: {
            id: school.id,
            name: school.name,
            districtId: district.id,
            districtName: district.name,
          },
          results,
        },
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Get results by school exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
