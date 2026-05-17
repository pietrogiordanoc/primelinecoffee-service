import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/technicians?id=eq.${technician_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ is_active }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update technician status');
    }

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
