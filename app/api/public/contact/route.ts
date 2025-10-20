import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { contactSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';
import { corsHeaders } from '@/lib/cors';

// 1) Preflight handler
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || undefined;

  const { success } = rateLimit(req, 5, 60000);
  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: corsHeaders(origin) }   // 2) add headers
    );
  }

  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400, headers: corsHeaders(origin) } // 2) add headers
      );
    }

    const { name, email, subject, message } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .insert({ name, email, subject, message, status: 'new' })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: { id: data.id } },
      { headers: corsHeaders(origin) }                // 2) add headers
    );
  } catch (err) {
    console.error('Contact submission error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }   // 2) add headers
    );
  }
}
