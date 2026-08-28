import { Handler, HandlerEvent } from '@netlify/functions';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const resend = new Resend(process.env.RESEND_API_KEY);

type EventType = 'amendment' | 'comment';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as any },
  });

  try {
    const { reportId, eventType, message } = JSON.parse(event.body || '{}') as {
      reportId?: string;
      eventType?: EventType;
      message?: string;
    };
    if (!reportId || !eventType || !['amendment', 'comment'].includes(eventType)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid report event data' }) };
    }

    const { data: settings } = await supabase.from('system_settings').select('*').single();
    if (!settings?.email_notifications_enabled) return { statusCode: 200, body: JSON.stringify({ sent: false, reason: 'disabled' }) };

    const { data: report, error } = await supabase
      .from('service_reports')
      .select('id, report_code, company:companies(name), form:dynamic_forms(name), technician:technicians(user:users(email, full_name))')
      .eq('id', reportId)
      .single();
    if (error || !report) throw new Error('Report not found');

    const prefix = eventType === 'amendment' ? 'amendment' : 'comment';
    const recipients: string[] = [];
    if (settings[`notify_${prefix}_super_admins`]) {
      const { data: admins } = await supabase.from('users').select('email').eq('role', 'super_admin').eq('is_active', true);
      recipients.push(...(admins || []).map((user) => user.email).filter(Boolean));
    }
    if (settings[`notify_${prefix}_technician`] && report.technician?.user?.email) {
      recipients.push(report.technician.user.email);
    }
    if (settings[`notify_${prefix}_additional_emails`]) {
      for (const email of settings[`${prefix}_notification_emails`] || []) {
        if (email && !recipients.includes(email)) recipients.push(email);
      }
    }
    if (recipients.length === 0) return { statusCode: 200, body: JSON.stringify({ sent: false, reason: 'no-recipients' }) };

    const appUrl = `${event.headers['x-forwarded-proto'] || 'https'}://${event.headers.host || 'primelinecoffee-service.netlify.app'}`;
    const subject = eventType === 'amendment'
      ? `Amendment submitted: ${report.report_code || report.company?.name}`
      : `Admin comment on report: ${report.report_code || report.company?.name}`;
    const title = eventType === 'amendment' ? 'Amendment Submitted' : 'Admin Comment on Report';
    const safeMessage = escapeHtml(message || 'No additional details provided.');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937"><div style="background:#003f7f;padding:24px;text-align:center"><img src="${appUrl}/logo-white.png" alt="Prime Line Coffee Service" style="height:38px"><h1 style="color:#fff;font-size:20px;margin:14px 0 0">${title}</h1></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:0"><h2 style="color:#003f7f;margin-top:0">${escapeHtml(report.company?.name || 'Customer')}</h2><p><strong>Report:</strong> ${escapeHtml(report.report_code || 'N/A')}</p><p><strong>Form:</strong> ${escapeHtml(report.form?.name || 'N/A')}</p><div style="background:#f3f4f6;padding:14px;margin-top:18px;line-height:1.5">${safeMessage}</div><p style="text-align:center;margin:24px 0 0"><a href="${appUrl}/admin/reports/${report.id}" style="background:#0056a8;color:#fff;padding:12px 18px;text-decoration:none;font-weight:bold">View Report</a></p></div></div>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${settings.email_sender_name || 'Prime Line Coffee Service'} <${settings.email_sender_email || 'onboarding@resend.dev'}>`,
      to: recipients,
      subject,
      html,
    });
    if (emailError) throw emailError;
    return { statusCode: 200, body: JSON.stringify({ sent: true, emailId: emailData?.id }) };
  } catch (error: any) {
    console.error('Error notifying report event:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Failed to notify report event' }) };
  }
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character));
}

export { handler };
