import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 1: Create auth user using admin client
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'admin',
        phone: phone || null
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(authError.message || 'Failed to create authentication user');
    }

    if (!authUser || !authUser.user) {
      throw new Error('No user returned from authentication');
    }

    const userId = authUser.user.id;

    // Step 2: Insert into public.users (Admin API doesn't trigger triggers)
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        full_name,
        phone: phone || null,
        role: 'admin',
        is_active: true,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Clean up auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      throw new Error(profileError.message || 'Failed to create user profile');
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
