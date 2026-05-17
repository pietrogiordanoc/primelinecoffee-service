import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { full_name, email, password, phone, role, specialization, certifications } = JSON.parse(
      event.body || '{}'
    );

    if (!full_name || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: full_name, email, password' }),
      };
    }

    // Create auth user using admin endpoint (already confirmed, no email verification needed)
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
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name,
          role: role || 'technician',
          phone: phone || null
        },
      }),
    });

    const createUserData = await createUserResponse.json();

    if (!createUserResponse.ok) {
      throw new Error(createUserData.msg || createUserData.message || 'Failed to create user');
    }

    const userId = createUserData.id;
    if (!userId) throw new Error('No user ID returned');

    // Wait for trigger to create users record
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update role to technician in public.users (trigger creates it)
    const updateUserResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        role: role || 'technician',
        full_name,
        phone: phone || null
      }),
    });

    if (!updateUserResponse.ok) {
      console.error('Failed to update user:', await updateUserResponse.text());
    }

    // Insert into technicians table ONLY if role is technician
    if (role === 'technician' || !role) {
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
          certifications: certifications || null,
          is_active: true
        }),
      });

      if (!techResponse.ok) {
        const errorData = await techResponse.text();
        console.error('Failed to create technician:', errorData);
        throw new Error('Failed to create technician record');
      }
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
