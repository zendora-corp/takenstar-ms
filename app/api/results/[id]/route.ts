import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resultSchema } from '@/lib/validations';
import { getServerSession } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = resultSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (validation.data.gk !== undefined) updates.gk = validation.data.gk;
    if (validation.data.science !== undefined) updates.science = validation.data.science;
    if (validation.data.mathematics !== undefined) updates.mathematics = validation.data.mathematics;
    if (validation.data.logicalReasoning !== undefined) updates.logicalReasoning = validation.data.logicalReasoning;
    if (validation.data.currentAffairs !== undefined) updates.currentAffairs = validation.data.currentAffairs;

    const { data: current } = await supabaseAdmin
      .from('results')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!current) {
      return NextResponse.json(
        { success: false, error: 'Result not found' },
        { status: 404 }
      );
    }

    const finalGk = updates.gk ?? current.gk;
    const finalScience = updates.science ?? current.science;
    const finalMath = updates.mathematics ?? current.mathematics;
    const finalLogical = updates.logicalReasoning ?? current.logicalReasoning;
    const finalCurrent = updates.currentAffairs ?? current.currentAffairs;

    const total = finalGk + finalScience + finalMath + finalLogical + finalCurrent;
    const percentage = (total / 500) * 100;

    updates.total = total;
    updates.percentage = parseFloat(percentage.toFixed(2));

    const { data, error } = await supabaseAdmin
      .from('results')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Update result error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('results')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete result error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
