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
    const { error: userError } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
      })
      .eq('id', data.user_id);

    if (userError) throw userError;

    // Update technician record if specialization is provided
    if (data.specialization) {
      const { error: techError } = await supabase
        .from('technicians')
        .update({ specialization: data.specialization })
        .eq('user_id', data.user_id);

      if (techError) throw techError;
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
