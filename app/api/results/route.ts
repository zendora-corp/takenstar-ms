import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resultSchema } from '@/lib/validations';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const examYearId = searchParams.get('examYear');
    const districtId = searchParams.get('districtId');
    const schoolId = searchParams.get('schoolId');
    const group = searchParams.get('group');
    const classNum = searchParams.get('class');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sort = searchParams.get('sort') || 'createdAt:desc';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('results')
      .select(`
        *,
        registrations!inner(
          fullName,
          class,
          groupType,
          schoolId,
          districtId,
          paymentStatus,
          schools(name),
          districts(name)
        )
      `, { count: 'exact' });

    if (examYearId) query = query.eq('examYearId', examYearId);
    if (districtId) query = query.eq('registrations.districtId', districtId);
    if (schoolId) query = query.eq('registrations.schoolId', schoolId);
    if (group) query = query.eq('registrations.groupType', group);
    if (classNum) query = query.eq('registrations.class', parseInt(classNum));

    const [sortField, sortOrder] = sort.split(':');
    const ascending = sortOrder === 'asc';
    query = query.order(sortField, { ascending });

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Get results error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = resultSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { registrationId, gk, science, mathematics, logicalReasoning, currentAffairs } = validation.data;

    const { data: registration } = await supabaseAdmin
      .from('registrations')
      .select('examYearId')
      .eq('id', registrationId)
      .single();

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Registration not found' },
        { status: 404 }
      );
    }

    const { data: existingResult } = await supabaseAdmin
      .from('results')
      .select('id')
      .eq('registrationId', registrationId)
      .single();

    if (existingResult) {
      return NextResponse.json(
        { success: false, error: 'Result already exists for this registration' },
        { status: 409 }
      );
    }

    const total = gk + science + mathematics + logicalReasoning + currentAffairs;
    const percentage = (total / 500) * 100;

    const { data, error } = await supabaseAdmin
      .from('results')
      .insert({
        examYearId: registration.examYearId,
        registrationId: registrationId,
        gk,
        science,
        mathematics,
        logicalReasoning: logicalReasoning,
        currentAffairs: currentAffairs,
        total,
        percentage: parseFloat(percentage.toFixed(2)),
        createdBy: (session.user as any).id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Create result error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
