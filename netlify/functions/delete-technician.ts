import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DeleteData {
  user_id: string;
  technician_id: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { user_id, technician_id }: DeleteData = JSON.parse(event.body || '{}');

    if (!user_id || !technician_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: user_id, technician_id' }),
      };
    }

    // Delete from technicians table
    const techResponse = await fetch(`${SUPABASE_URL}/rest/v1/technicians?id=eq.${technician_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
    });

    if (!techResponse.ok) {
      const errorData = await techResponse.text();
      console.error('Failed to delete technician:', errorData);
      throw new Error('Failed to delete technician record');
    }

    // Delete from users table
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error('Failed to delete user:', errorData);
    }

    // Delete from auth.users using admin API
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.text();
      console.error('Failed to delete auth user:', errorData);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Technician deleted successfully' }),
    };
  } catch (error: any) {
    console.error('Error deleting technician:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error deleting technician' }),
    };
  }
};

export { handler };
