import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface UpdateTechnicianData {
  user_id: string;
  full_name: string;
  phone?: string;
  specialization?: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data: UpdateTechnicianData = JSON.parse(event.body || '{}');

    if (!data.user_id || !data.full_name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: user_id, full_name' }),
      };
    }

    // Update user record
    const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${data.user_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        full_name: data.full_name,
        phone: data.phone || null,
      }),
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      throw new Error(errorData.message || 'Failed to update user');
    }

    // Update technician record if specialization is provided
    if (data.specialization) {
      const techResponse = await fetch(`${SUPABASE_URL}/rest/v1/technicians?user_id=eq.${data.user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ specialization: data.specialization }),
      });

      if (!techResponse.ok) {
        const errorData = await techResponse.json();
        throw new Error(errorData.message || 'Failed to update technician');
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Technician updated successfully' }),
    };
  } catch (error: any) {
    console.error('Error updating technician:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error updating technician' }),
    };
  }
};

export { handler };
