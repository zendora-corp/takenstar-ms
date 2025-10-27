import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { registrationSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';
import { deriveGroup } from '@/lib/auth';
import { corsHeaders } from '@/lib/cors';

// --- Preflight for CORS ---
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;

  const rl = rateLimit(req, 5, 60000);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: corsHeaders(origin) }
    );
  }

  try {
    const body = await req.json();
    const validation = registrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const data = validation.data;

    const { data: district, error: districtErr } = await supabaseAdmin
      .from('districts')
      .select('id, name')
      .eq('id', data.districtId)
      .eq('status', 'active')
      .single();

    if (districtErr) {
      console.error('District lookup error:', districtErr);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!district) {
      return NextResponse.json(
        { success: false, error: 'District not found or inactive' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data: school, error: schoolErr } = await supabaseAdmin
      .from('schools')
      .select('id, name')
      .eq('id', data.schoolId)
      .eq('districtId', district.id)
      .eq('status', 'active')
      .single();

    if (schoolErr) {
      console.error('School lookup error:', schoolErr);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!school) {
      return NextResponse.json(
        {
          success: false,
          error: 'School not found or inactive in the specified district',
        },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data: examYear, error: eyErr } = await supabaseAdmin
      .from('exam_years')
      .select('id')
      .eq('id', data.examYearId)
      .single();

    if (eyErr) {
      console.error('Exam year lookup error:', eyErr);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (!examYear) {
      return NextResponse.json(
        { success: false, error: 'Exam year not found' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('registrations')
      .select('id')
      .eq('examYearId', examYear.id)
      .eq('schoolId', school.id)
      .eq('districtId', district.id)
      .eq('schoolRollNo', data.schoolRollNo)
      .maybeSingle();

    if (existingErr) {
      console.error('Existing registration lookup error:', existingErr);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A student with the same Exam Year, School, District and School Roll No already exists.',
        },
        { status: 409, headers: corsHeaders(origin) }
      );
    }

    const groupType = deriveGroup(data.class);

    const { data: registration, error } = await supabaseAdmin
      .from('registrations')
      .insert({
        examYearId: examYear.id,
        fullName: data.fullName,
        gender: data.gender,
        dob: data.dob  || null,
        class: data.class,
        groupType: groupType,
        medium: data.medium,
        schoolId: school.id,
        schoolRollNo: data.schoolRollNo,
        districtId: district.id,
        areaOrDistrictName: district.name,
        address: data.address,
        studentMobile: data.studentMobile,
        guardianMobile: data.guardianMobile  || null,
        email: data.email || null,
        paymentOption: data.paymentOption,
        paymentStatus: 'Pending',
        transactionId: data.transactionId || null,
        offlineReceiptNo: data.offlineReceiptNo || null,
        createdByRole: 'public',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Registration insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { success: true, data: { registrationId: registration.id } },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Public registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
