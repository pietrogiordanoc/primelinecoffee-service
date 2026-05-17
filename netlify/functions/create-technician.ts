import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

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

    // Create auth user using signUp (triggers database trigger)
    const signUpResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name,
          role: 'technician',
          phone: phone || null
        },
      }),
    });

    const signUpData = await signUpResponse.json();

    if (!signUpResponse.ok) {
      throw new Error(signUpData.msg || signUpData.message || 'Failed to create user');
    }

    const userId = signUpData.user?.id;
    if (!userId) throw new Error('No user ID returned');

    // Confirm email using service role
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ email_confirm: true }),
    });

    // Update role to technician in public.users (trigger creates it)
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        role: 'technician',
        full_name,
        phone: phone || null
      }),
    });

    // Insert into technicians table
    const techResponse = await fetch(`${SUPABASE_URL}/rest/v1/technicians`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        specialization: specialization || null,
        certifications: certifications || [],
      }),
    });

    if (!techResponse.ok) {
      const errorData = await techResponse.json();
      throw new Error(errorData.message || 'Failed to create technician record');
    }

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
