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

interface ToggleData {
  technician_id: string;
  is_active: boolean;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { technician_id, is_active }: ToggleData = JSON.parse(event.body || '{}');

    if (!technician_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: technician_id' }),
      };
    }

    // Update technician status
    const { error } = await supabase
      .from('technicians')
      .update({ is_active })
      .eq('id', technician_id);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Technician status updated successfully' }),
    };
  } catch (error: any) {
    console.error('Error toggling technician:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error toggling technician' }),
    };
  }
};

export { handler };
