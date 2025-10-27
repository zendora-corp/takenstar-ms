import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
    const classNum = searchParams.get('class');
    const group = searchParams.get('group');
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('registrations')
      .select(`
        *,
        schools(name),
        districts(name),
        exam_years(year)
      `, { count: 'exact' });

    if (examYearId) query = query.eq('examYearId', examYearId);
    if (districtId) query = query.eq('districtId', districtId);
    if (schoolId) query = query.eq('schoolId', schoolId);
    if (classNum) query = query.eq('class', parseInt(classNum));
    if (group) query = query.eq('groupType', group);
    if (q) query = query.or(`fullName.ilike.%${q}%,schoolRollNo.ilike.%${q}%`);

    const { data, error, count } = await query
      .order('createdAt', { ascending: false })
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
    console.error('Get registrations error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Registrations must be created via the public API' },
    { status: 405 }
  );
}
