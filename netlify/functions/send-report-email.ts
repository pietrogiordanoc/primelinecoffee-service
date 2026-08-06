import { Handler, HandlerEvent } from '@netlify/functions';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const resend = new Resend(process.env.RESEND_API_KEY);

const handler: Handler = async (event: HandlerEvent) => {
  // Create Supabase client inside handler to avoid initialization issues
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      realtime: {
        transport: WebSocket as any
      }
    }
  );
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { reportId } = JSON.parse(event.body || '{}');

    if (!reportId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing reportId' }),
      };
    }

    // Fetch report details
    const { data: report, error: reportError } = await supabase
      .from('service_reports')
      .select(`
        *,
        form:dynamic_forms(*),
        technician:technicians(
          *,
          user:users(*)
        ),
        company:companies(*),
        photos:report_photos(*)
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found');
    }

    // Get system settings for email configuration
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    // Check if email notifications are enabled
    if (!settings || !settings.email_notifications_enabled) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Email notifications are disabled in settings',
          sent: false 
        }),
      };
    }

    // Build recipient list based on settings
    const recipientEmails: string[] = [];

    // Add super admins if enabled
    if (settings.notify_super_admins) {
      const { data: admins } = await supabase
        .from('users')
        .select('email')
        .eq('role', 'super_admin');
      
      const adminEmails = admins?.map(admin => admin.email) || [];
      recipientEmails.push(...adminEmails);
    }

    // Add technician if enabled
    if (settings.notify_technician) {
      const technicianEmail = report.technician.user.email;
      if (technicianEmail && !recipientEmails.includes(technicianEmail)) {
        recipientEmails.push(technicianEmail);
      }
    }

    // Add additional emails from settings
    if (settings.additional_notification_emails && settings.additional_notification_emails.length > 0) {
      settings.additional_notification_emails.forEach((email: string) => {
        if (email && !recipientEmails.includes(email)) {
          recipientEmails.push(email);
        }
      });
    }

    // If no recipients, return early
    if (recipientEmails.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No recipients configured in settings',
          sent: false 
        }),
      };
    }

    // Generate photo download links (optimized: always use signed URLs to avoid Netlify bandwidth)
    const photoLinks: string[] = [];

    if (report.photos && report.photos.length > 0) {
      // Always generate signed URLs instead of downloading photos
      // This avoids consuming Netlify bandwidth and function memory
      for (const photo of report.photos) {
        try {
          const { data: signedUrl } = await supabase.storage
            .from('service-photos')
            .createSignedUrl(photo.file_name, 604800); // 7 days

          if (signedUrl) {
            photoLinks.push(signedUrl.signedUrl);
          }
        } catch (err) {
          console.error('Error generating signed URL for photo:', err);
        }
      }
    }

    // Generate email HTML
    const emailHtml = generateEmailHtml(report, photoLinks);

    // Use configured sender email or fallback
    const fromName = settings.email_sender_name || 'Prime Line Coffee Service';
    const fromEmail = settings.email_sender_email || 'onboarding@resend.dev';
    
    // Format date as MM/DD/YYYY
    const reportDate = new Date(report.created_at);
    const formattedDate = `${String(reportDate.getMonth() + 1).padStart(2, '0')}/${String(reportDate.getDate()).padStart(2, '0')}/${reportDate.getFullYear()}`;
    
    // Build simple subject line with just code, date, company, and technician
    const technicianName = report.technician?.user?.full_name || report.technician?.user?.email || 'Unknown';
    const emailSubject = `${report.form.name} ${formattedDate} ${report.company.name} by ${technicianName}`;
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmails,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      throw emailError;
    }

    // Log email
    await supabase.from('email_logs').insert([
      {
        report_id: reportId,
        recipient_email: recipientEmails.join(', '),
        subject: emailSubject,
        status: 'sent',
        resend_id: emailData?.id,
      },
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: emailData?.id,
      }),
    };
  } catch (error: any) {
    console.error('Error sending email:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
      }),
    };
  }
};

function generateEmailHtml(report: any, photoLinks: string[]): string {
  const formDataHtml = Object.entries(report.form_data)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; color: #374151; width: 35%;">
          ${key}
        </td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
          ${value}
        </td>
      </tr>
    `
    )
    .join('');

  const photoLinksHtml =
    photoLinks.length > 0
      ? `
    <div style="margin: 32px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <span class="material-symbols-outlined" style="color: #003f7f; font-size: 24px; margin-right: 8px;">photo_library</span>
        <h3 style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 600;">Photo Download Links</h3>
      </div>
      <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.6;">Photos are too large to attach. Download links below (valid for 7 days):</p>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
        ${photoLinks
          .map(
            (link, index) => `
          <div style="margin: 12px 0;">
            <a href="${link}" style="color: #003f7f; text-decoration: none; display: inline-flex; align-items: center; font-weight: 500;">
              <span class="material-symbols-outlined" style="font-size: 20px; margin-right: 8px;">download</span>
              Photo ${index + 1}
            </a>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
  <style>
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background-color: #003f7f; padding: 48px 40px; text-align: center;">
      <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <span class="material-symbols-outlined" style="color: #ffffff; font-size: 32px; margin-right: 12px;">coffee</span>
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 0.5px;">
          Prime Line Coffee Service
        </h1>
      </div>
      <p style="color: #b3d1ff; margin: 0; font-size: 15px; font-weight: 400;">
        New Technical Service Report
      </p>
    </div>

    <!-- Report Summary Card -->
    <div style="margin: 40px 40px 32px 40px;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span class="material-symbols-outlined" style="color: #003f7f; font-size: 24px; margin-right: 8px;">assignment</span>
        <h2 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 600;">
          Report Summary
        </h2>
      </div>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border-left: 4px solid #003f7f;">
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
          <p style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">${report.company.name}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Technician</p>
          <p style="margin: 0; color: #1f2937; font-size: 16px;">${report.technician.user.full_name}</p>
        </div>
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Form Type</p>
          <p style="margin: 0; color: #1f2937; font-size: 16px;">${report.form.name}</p>
        </div>
        <div>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
          <p style="margin: 0; color: #1f2937; font-size: 16px;">${new Date(report.submitted_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</p>
        </div>
      </div>
    </div>

    <!-- Company Details -->
    <div style="margin: 32px 40px;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span class="material-symbols-outlined" style="color: #003f7f; font-size: 24px; margin-right: 8px;">business</span>
        <h3 style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 600;">Company Details</h3>
      </div>
      <div style="padding-left: 32px;">
        <p style="color: #4b5563; margin: 12px 0; line-height: 1.6;">
          <strong style="color: #374151;">Contact:</strong> ${report.company.contact_name || 'N/A'}
        </p>
        <p style="color: #4b5563; margin: 12px 0; line-height: 1.6;">
          <strong style="color: #374151;">Email:</strong> ${report.company.contact_email || 'N/A'}
        </p>
        <p style="color: #4b5563; margin: 12px 0; line-height: 1.6;">
          <strong style="color: #374151;">Phone:</strong> ${report.company.contact_phone || 'N/A'}
        </p>
        <p style="color: #4b5563; margin: 12px 0; line-height: 1.6;">
          <strong style="color: #374151;">Address:</strong> ${report.company.address || 'N/A'}
        </p>
      </div>
    </div>

    <!-- Service Information -->
    <div style="margin: 32px 40px;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span class="material-symbols-outlined" style="color: #003f7f; font-size: 24px; margin-right: 8px;">description</span>
        <h3 style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 600;">Service Information</h3>
      </div>
      <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        ${formDataHtml}
      </table>
    </div>

    ${photoLinksHtml ? `<div style="margin: 32px 40px;">${photoLinksHtml}</div>` : ''}

    ${
      report.notes
        ? `
    <div style="margin: 32px 40px;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span class="material-symbols-outlined" style="color: #003f7f; font-size: 24px; margin-right: 8px;">chat</span>
        <h3 style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 600;">Additional Notes</h3>
      </div>
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; border-left: 4px solid #e5e7eb;">
        <p style="color: #4b5563; margin: 0; line-height: 1.8; white-space: pre-wrap;">
          ${report.notes}
        </p>
      </div>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 32px 40px; text-align: center; margin-top: 40px;">
      <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; line-height: 1.6;">
        This is an automated email generated by the Prime Line Coffee Service management system
      </p>
      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} Prime Line Coffee Service. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export { handler };
