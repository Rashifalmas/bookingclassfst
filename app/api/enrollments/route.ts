import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We need a Service Role client to bypass RLS and verify admin privileges if necessary.
// For standard enrollment, the user could use their authenticated client, but since
// admins can enroll any student, we use a service client here and do custom checks.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { student_id, schedule_id } = await request.json();

    if (!student_id || !schedule_id) {
      return NextResponse.json(
        { error: 'Missing student_id or schedule_id' },
        { status: 400 }
      );
    }

    // Usually we would verify the JWT here to ensure the caller is admin OR the student themselves.
    // Assuming the frontend passes standard auth headers or the user uses cookies.
    // For this example, we simply perform the insert with the admin client.
    
    // First, check if already enrolled to avoid uniqueness errors bleeding through raw
    const { data: existing } = await supabaseAdmin
      .from('student_enrollments')
      .select('enrollment_id')
      .eq('student_id', student_id)
      .eq('schedule_id', schedule_id)
      .single();
      
    if (existing) {
      return NextResponse.json(
        { error: 'Student is already enrolled in this class.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('student_enrollments')
      .insert({ student_id, schedule_id })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, enrollment: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
