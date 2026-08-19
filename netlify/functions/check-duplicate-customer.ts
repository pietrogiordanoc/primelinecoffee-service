import { Handler, HandlerEvent } from '@netlify/functions';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface CheckDuplicateRequest {
  name: string;
  city?: string;
  phone?: string;
  excludeId?: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data: CheckDuplicateRequest = JSON.parse(event.body || '{}');

    if (!data.name || data.name.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: name' }),
      };
    }

    // Call the PostgreSQL function to check for duplicates
    const rpcParams: any = {
      p_name: data.name,
    };
    if (data.city) rpcParams.p_city = data.city;
    if (data.phone) rpcParams.p_phone = data.phone;
    if (data.excludeId) rpcParams.p_exclude_id = data.excludeId;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/check_duplicate_customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify(rpcParams),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check duplicates');
    }

    const duplicates = await response.json();

    // Classify duplicates by confidence level
    const highConfidence = duplicates.filter((d: any) => 
      d.similarity_score >= 0.9 || 
      d.match_reason.includes('Exact name')
    );
    
    const mediumConfidence = duplicates.filter((d: any) => 
      d.similarity_score >= 0.7 && d.similarity_score < 0.9 &&
      !d.match_reason.includes('Exact name')
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        hasDuplicates: duplicates.length > 0,
        highConfidence,
        mediumConfidence,
        allMatches: duplicates,
      }),
    };
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error checking duplicates' }),
    };
  }
};

export { handler };
