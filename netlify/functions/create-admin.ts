import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    // Step 1: Create user with Admin API (handles password hashing correctly)
    const createUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: 'admin',
          phone: phone || null
        },
      }),
    });

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('Auth API error:', createUserResponse.status, errorText);
      let errorDetail = 'Failed to create authentication user';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.msg || errorJson.message || errorJson.error_description || errorText;
      } catch (e) {
        errorDetail = errorText || errorDetail;
      }
      throw new Error(errorDetail);
    }

    const authUser = await createUserResponse.json();
    const userId = authUser.id;

    // Step 2: Manually insert into public.users (Admin API doesn't trigger PostgreSQL triggers)
    const insertProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        id: userId,
        email,
        full_name,
        phone: phone || null,
        role: 'admin',
        is_active: true,
      }),
    });

    if (!insertProfileResponse.ok) {
      const errorText = await insertProfileResponse.text();
      console.error('Profile creation error:', errorText);
      
      // If profile creation fails, try to clean up auth user
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
      });
      
      throw new Error('Failed to create user profile');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
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
