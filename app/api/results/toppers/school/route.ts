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
    const examYear = searchParams.get('examYear');
    const schoolId = searchParams.get('schoolId');
    const group = searchParams.get('group');
    const limit = parseInt(searchParams.get('limit') || '3');

    if (!examYear || !schoolId) {
      return NextResponse.json(
        { success: false, error: 'examYear and schoolId are required' },
        { status: 400 }
      );
    }

    const { data: examYearRecord } = await supabaseAdmin
      .from('exam_years')
      .select('id')
      .eq('year', parseInt(examYear))
      .single();

    if (!examYearRecord) {
      return NextResponse.json(
        { success: false, error: 'Exam year not found' },
        { status: 404 }
      );
    }

    let query = supabaseAdmin
      .from('results')
      .select(`
        total,
        percentage,
        rankSchool,
        mathematics,
        science,
        gk,
        registrations!inner(
          fullName,
          class,
          groupType,
          schoolId
        )
      `)
      .eq('exam_year_id', examYearRecord.id)
      .eq('registrations.school_id', schoolId);

    if (group && (group === 'A' || group === 'B')) {
      query = query.eq('registrations.group_type', group);
    }

    const { data, error } = await query
      .order('total', { ascending: false })
      .order('mathematics', { ascending: false })
      .order('science', { ascending: false })
      .order('gk', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get school toppers error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
