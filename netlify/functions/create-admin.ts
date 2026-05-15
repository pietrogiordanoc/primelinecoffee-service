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

    // Create auth user with service role key using fetch
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
          role: 'admin'
        },
      }),
    });

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('Supabase auth error:', errorText);
      let errorMsg = 'Failed to create user';
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.msg || errorJson.message || errorMsg;
      } catch (e) {
        errorMsg = errorText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    const authData = await createUserResponse.json();
    const userId = authData.id;

    // Wait for the trigger to create the users record
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update user profile with phone if provided (trigger already created the record)
    if (phone) {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ phone }),
      });
    }

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
