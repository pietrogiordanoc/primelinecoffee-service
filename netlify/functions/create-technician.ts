import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      params: {
        eventsPerSecond: 0
      }
    },
    global: {
      headers: {}
    }
  }
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
        body: JSON.stringify({ error: 'Missing required fields: full_name, email, password' }),
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

    // Wait briefly for the DB trigger to create the users record
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update the user record created by the trigger with the full_name and phone
    await supabase.from('users').update({ full_name, phone: phone || null }).eq('id', userId);

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
      body: JSON.stringify({ error: error.message || 'Error creating technician' }),
    };
  }
};

export { handler };
