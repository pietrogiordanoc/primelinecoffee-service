import { Handler, HandlerEvent } from '@netlify/functions';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const resend = new Resend(process.env.RESEND_API_KEY);

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: WebSocket as any },
    }
  );

  try {
    const { companyId, creatorEmail } = JSON.parse(event.body || '{}');
    if (!companyId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing companyId' }) };
    }

    const [{ data: settings }, { data: company, error: companyError }] = await Promise.all([
      supabase.from('system_settings').select('*').single(),
      supabase.from('companies').select('*').eq('id', companyId).single(),
    ]);

    if (companyError || !company) throw new Error('Customer not found');
    if (!settings?.email_notifications_enabled) {
      return { statusCode: 200, body: JSON.stringify({ sent: false, reason: 'disabled' }) };
    }

    const recipientEmails: string[] = [];
    if (settings.notify_customer_creation_super_admins !== false) {
      const { data: admins } = await supabase
        .from('users')
        .select('email')
        .eq('role', 'super_admin')
        .eq('is_active', true);
      recipientEmails.push(...(admins || []).map((admin) => admin.email).filter(Boolean));
    }

    if (settings.notify_customer_creation_technician !== false && creatorEmail) {
      recipientEmails.push(creatorEmail);
    }

    if (settings.notify_customer_creation_additional_emails !== false) {
      for (const email of settings.customer_creation_notification_emails || []) {
        if (email && !recipientEmails.includes(email)) recipientEmails.push(email);
      }
    }

    if (recipientEmails.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ sent: false, reason: 'no-recipients' }) };
    }

    const appUrl = `${event.headers['x-forwarded-proto'] || 'https'}://${event.headers.host || 'primelinecoffee-service.netlify.app'}`;
    const senderName = settings.email_sender_name || 'Prime Line Coffee Service';
    const senderEmail = settings.email_sender_email || 'onboarding@resend.dev';
    const subject = `New customer created: ${company.name}`;
    const address = [company.address, company.city, company.state, company.postal_code].filter(Boolean).join(', ');
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <div style="background: #003f7f; padding: 24px; text-align: center;">
          <img src="${appUrl}/logo-white.png" alt="Prime Line Coffee Service" style="height: 38px; max-width: 90%;" />
          <h1 style="color: #fff; font-size: 20px; margin: 14px 0 0;">New Customer Created</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: 0;">
          <h2 style="margin: 0 0 18px; color: #003f7f;">${escapeHtml(company.name)}</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="border-collapse: collapse;">
            <tr><td style="color: #6b7280; font-weight: bold;">Customer code</td><td>${escapeHtml(company.customer_code || 'N/A')}</td></tr>
            <tr><td style="color: #6b7280; font-weight: bold;">Address</td><td>${escapeHtml(address || 'Not provided')}</td></tr>
            <tr><td style="color: #6b7280; font-weight: bold;">Contact</td><td>${escapeHtml(company.contact_name || 'Not provided')}</td></tr>
            <tr><td style="color: #6b7280; font-weight: bold;">Phone</td><td>${escapeHtml(company.contact_phone || 'Not provided')}</td></tr>
            <tr><td style="color: #6b7280; font-weight: bold;">Email</td><td>${escapeHtml(company.contact_email || 'Not provided')}</td></tr>
          </table>
          <p style="margin: 24px 0 0; text-align: center;"><a href="${appUrl}/admin/companies" style="display: inline-block; background: #0056a8; color: #fff; padding: 12px 18px; text-decoration: none; font-weight: bold;">View Customers</a></p>
        </div>
      </div>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: recipientEmails,
      subject,
      html: emailHtml,
    });
    if (emailError) throw emailError;

    return { statusCode: 200, body: JSON.stringify({ sent: true, emailId: emailData?.id }) };
  } catch (error: any) {
    console.error('Error notifying admins about customer:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Failed to notify admins' }) };
  }
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] || character));
}

export { handler };
