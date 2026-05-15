import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { full_name, email, password, phone, specialization, certifications } = JSON.parse(
      event.body || '{}'
    );

    if (!full_name || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan campos requeridos: full_name, email, password' }),
      };
    }

    // Create auth user with service role key
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'technician' },
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Insert into users table (trigger may handle this, but we ensure it)
    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      email,
      full_name,
      phone: phone || null,
      role: 'technician',
    });

    if (userError) throw userError;

    // Insert into technicians table
    const { error: techError } = await supabase.from('technicians').insert({
      user_id: userId,
      specialization: specialization || null,
      certifications: certifications || [],
    });

    if (techError) throw techError;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, userId }),
    };
  } catch (error: any) {
    console.error('Error creating technician:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error al crear técnico' }),
    };
  }
};

export { handler };
