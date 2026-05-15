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
    const { full_name, email, password, phone } = JSON.parse(event.body || '{}');

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
      user_metadata: { full_name, role: 'admin' },
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Wait briefly for the DB trigger to create the users record
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update the user record with full_name, phone, and admin role
    await supabase
      .from('users')
      .update({ 
        full_name, 
        phone: phone || null,
        role: 'admin' 
      })
      .eq('id', userId);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        userId,
        message: 'Admin user created successfully'
      }),
    };
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error creating admin' }),
    };
  }
};

export { handler };
