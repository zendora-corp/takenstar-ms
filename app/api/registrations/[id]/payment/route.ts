import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { paymentUpdateSchema } from '@/lib/validations';
import { getServerSession } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = paymentUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const updateData: any = {
      paymentStatus: validation.data.paymentStatus,
      paymentUpdatedBy: (session.user as any).id,
      paymentUpdatedAt: new Date().toISOString(),
    };

    if (validation.data.transactionId !== undefined) {
      updateData.transactionId = validation.data.transactionId;
    }
    if (validation.data.offlineReceiptNo !== undefined) {
      updateData.offlineReceiptNo = validation.data.offlineReceiptNo;
    }
    if (validation.data.paymentNotes !== undefined) {
      updateData.paymentNotes = validation.data.paymentNotes;
    }

    const { data, error } = await supabaseAdmin
      .from('registrations')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Registration not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Update payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
