import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DeleteData {
  company_id: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { company_id }: DeleteData = JSON.parse(event.body || '{}');

    if (!company_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: company_id' }),
      };
    }

    // Delete company from database
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${company_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to delete company:', errorData);
      throw new Error('Failed to delete company');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Company deleted successfully' }),
    };
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error deleting company' }),
    };
  }
};

export { handler };
