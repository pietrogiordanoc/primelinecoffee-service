import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { full_name, email, password, phone } = JSON.parse(event.body || '{}');

    if (!full_name || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Use normal signUp (this triggers the trigger correctly and hashes password properly)
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
          role: 'admin',
          phone: phone || null
        },
      }),
    });

    const signUpData = await signUpResponse.json();

    if (!signUpResponse.ok) {
      console.error('SignUp error:', signUpResponse.status, signUpData);
      throw new Error(signUpData.msg || signUpData.message || signUpData.error_description || 'Failed to create user');
    }

    const userId = signUpData.user?.id;

    if (!userId) {
      throw new Error('No user ID returned');
    }

    // Confirm email using service role
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email_confirm: true
      }),
    });

    // Update role to admin in public.users (trigger should have created it as technician)
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        role: 'admin'
      }),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Admin created successfully'
      }),
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal error' }),
    };
  }
};

export { handler };
