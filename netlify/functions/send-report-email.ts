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
  
  // Get app URL from request headers (works with any domain)
  const protocol = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers['host'] || event.headers['x-forwarded-host'] || 'primelinecoffee-service.netlify.app';
  const appUrl = `${protocol}://${host}`;
  
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

    // Generate email HTML with dynamic app URL
    const emailHtml = generateEmailHtml(report, photoLinks, appUrl);

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

function generateEmailHtml(report: any, photoLinks: string[], appUrl: string): string {
  // Build reports URL from provided app URL
  const reportsUrl = `${appUrl}/admin/reports`;
  
  const formDataHtml = Object.entries(report.form_data)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; color: #374151; width: 35%; font-size: 13px;">
          ${key}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">
          ${value}
        </td>
      </tr>
    `
    )
    .join('');

  const photoLinksHtml =
    photoLinks.length > 0
      ? `
    <div>
      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Photo Downloads</h3>
      <p style="color: #6b7280; margin: 0 0 12px 0; line-height: 1.5; font-size: 13px;">
        Photos are available for download (links valid for 7 days):
      </p>
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; border: 1px solid #e5e7eb;">
        ${photoLinks
          .map(
            (link, index) => `
          <div style="margin: 10px 0;">
            <a href="${link}" target="_blank" rel="noopener noreferrer" style="color: #003f7f; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block;">
              📸 Photo ${index + 1} - Download
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 24px 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
    
    <!-- Header with Logo -->
    <div style="background: linear-gradient(135deg, #003f7f 0%, #0056a8 100%); padding: 32px 40px; text-align: center;">
      <img src="${appUrl}/logo.png" alt="Prime Line Coffee Service" style="height: 45px; width: auto; margin-bottom: 12px;" />
      <p style="color: #ffffff; margin: 0; font-size: 14px; font-weight: 500; opacity: 0.95;">
        Technical Service Report
      </p>
    </div>

    <!-- Report Summary Card -->
    <div style="margin: 32px 40px 24px 40px;">
      <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
        Report Details
      </h2>
      
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; border-left: 4px solid #003f7f;">
        <div style="margin-bottom: 14px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
          <p style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 600;">${report.company.name}</p>
        </div>
        <div style="margin-bottom: 14px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Technician</p>
          <p style="margin: 0; color: #1f2937; font-size: 15px;">${report.technician.user.full_name}</p>
        </div>
        <div style="margin-bottom: 14px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Form Type</p>
          <p style="margin: 0; color: #1f2937; font-size: 15px;">${report.form.name}</p>
        </div>
        <div>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Submitted</p>
          <p style="margin: 0; color: #1f2937; font-size: 15px;">${report.form_data?.technicianLocalTime || new Date(report.submitted_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'long' })}</p>
          ${report.form_data?.technicianTimeZone ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">(${report.form_data.technicianTimeZone})</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Call to Action Button -->
    <div style="margin: 24px 40px; text-align: center;">
      <a href="${reportsUrl}" 
         target="_blank" 
         rel="noopener noreferrer"
         style="display: inline-block; background-color: #003f7f; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(0, 63, 127, 0.2);">
        View Full Report →
      </a>
      <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
        Access complete report details in the management system
      </p>
    </div>

    <!-- Company Details -->
    <div style="margin: 24px 40px;">
      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Company Information</h3>
      <div style="padding: 16px; background-color: #f9fafb; border-radius: 6px;">
        <p style="color: #4b5563; margin: 8px 0; line-height: 1.5; font-size: 14px;">
          <strong style="color: #374151; font-weight: 600;">Contact:</strong> ${report.company.contact_name || 'N/A'}
        </p>
        <p style="color: #4b5563; margin: 8px 0; line-height: 1.5; font-size: 14px;">
          <strong style="color: #374151; font-weight: 600;">Email:</strong> ${report.company.contact_email || 'N/A'}
        </p>
        <p style="color: #4b5563; margin: 8px 0; line-height: 1.5; font-size: 14px;">
          <strong style="color: #374151; font-weight: 600;">Phone:</strong> ${report.company.contact_phone || 'N/A'}
        </p>
        <p style="color: #4b5563; margin: 8px 0; line-height: 1.5; font-size: 14px;">
          <strong style="color: #374151; font-weight: 600;">Address:</strong> ${report.company.address || 'N/A'}
        </p>
      </div>
    </div>

    <!-- Service Information -->
    <div style="margin: 24px 40px;">
      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Service Details</h3>
      <table style="width: 100%; border-collapse: collapse; border-radius: 6px; overflow: hidden; border: 1px solid #e5e7eb;">
        ${formDataHtml}
      </table>
    </div>

    ${photoLinksHtml ? `<div style="margin: 24px 40px;">${photoLinksHtml}</div>` : ''}

    ${
      report.notes
        ? `
    <div style="margin: 24px 40px;">
      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Additional Notes</h3>
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; border-left: 3px solid #e5e7eb;">
        <p style="color: #4b5563; margin: 0; line-height: 1.6; font-size: 14px; white-space: pre-wrap;">
          ${report.notes}
        </p>
      </div>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px 40px; text-align: center; margin-top: 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0 0 6px 0; font-size: 13px; line-height: 1.5;">
        Automated notification from Prime Line Coffee Service
      </p>
      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} Prime Line Coffee Service
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export { handler };
