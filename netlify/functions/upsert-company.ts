import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CompanyData {
  id?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  is_active?: boolean;
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data: CompanyData = JSON.parse(event.body || '{}');

    if (!data.name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: name' }),
      };
    }

    // If ID exists, update. Otherwise, create new
    if (data.id) {
      // Update existing company
      const { id, ...updateData } = data;
      const { error: updateError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, id, message: 'Company updated successfully' }),
      };
    } else {
      // Create new company
      const { data: companyData, error: insertError } = await supabase
        .from('companies')
        .insert([{
          name: data.name,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postal_code || null,
          contact_name: data.contact_name || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          notes: data.notes || null,
          is_active: data.is_active !== false,
        }])
        .select('id');

      if (insertError) throw insertError;

      const newId = companyData?.[0]?.id;

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, id: newId, message: 'Company created successfully' }),
      };
    }
  } catch (error: any) {
    console.error('Error upserting company:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error upserting company' }),
    };
  }
};

export { handler };
