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
  
  // Helper function to format values (handle objects, arrays, etc.)
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return 'N/A';
        // Format array of objects as readable list
        return value.map((item, index) => {
          if (typeof item === 'object') {
            const entries = Object.entries(item)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            return `[${index + 1}] ${entries}`;
          }
          return `• ${item}`;
        }).join('\n');
      }
      // Format object as key-value pairs
      return Object.entries(value)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    }
    return String(value);
  };
  
  const formDataHtml = Object.entries(report.form_data)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; color: #374151; width: 35%; font-size: 13px;">
          ${key}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; white-space: pre-wrap;">
          ${formatValue(value)}
        </td>
      </tr>
    `
    )
    .join('');

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
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        margin: 0 !important;
        border-radius: 0 !important;
      }
      .header {
        padding: 24px 16px !important;
      }
      .content-section {
        margin: 16px !important;
        padding: 16px !important;
      }
      .two-column-table td {
        display: block !important;
        width: 100% !important;
        padding: 0 !important;
      }
      .column-box {
        margin-bottom: 16px !important;
      }
      .button-container {
        margin: 16px !important;
      }
      .button {
        display: block !important;
        margin: 8px 0 !important;
        width: calc(100% - 32px) !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f5f5f5;">
  <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
    
    <!-- Header with Logo -->
    <div class="header" style="background: linear-gradient(135deg, #003f7f 0%, #0056a8 100%); padding: 28px 20px; text-align: center;">
      <img src="${appUrl}/logo-white.png" alt="Prime Line Coffee Service" style="height: 40px; width: auto; margin-bottom: 10px; max-width: 90%;" />
      <p style="color: #ffffff; margin: 0; font-size: 13px; font-weight: 500; opacity: 0.95;">
        Technical Service Report
      </p>
    </div>

    <!-- Report Summary Card -->
    <div class="content-section" style="margin: 24px 20px 16px 20px;">
      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 17px; font-weight: 600;">
        Report Overview
      </h2>
      
      <!-- Two Column Layout -->
      <table class="two-column-table" style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Left Column - Report Details -->
          <td style="width: 50%; vertical-align: top; padding-right: 8px;">
            <div class="column-box" style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border-left: 4px solid #003f7f;">
              <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 13px; font-weight: 600;">Report Details</h3>
              <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
                <p style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 600;">${report.company.name}</p>
              </div>
              <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Technician</p>
                <p style="margin: 0; color: #1f2937; font-size: 14px;">${report.technician.user.full_name}</p>
              </div>
              <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Form Type</p>
                <p style="margin: 0; color: #1f2937; font-size: 14px;">${report.form.name}</p>
              </div>
              <div>
                <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Submitted</p>
                <p style="margin: 0; color: #1f2937; font-size: 13px;">${report.form_data?.technicianLocalTime || new Date(report.submitted_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'long' })}</p>
                ${report.form_data?.technicianTimeZone ? `<p style="margin: 3px 0 0 0; color: #6b7280; font-size: 11px;">(${report.form_data.technicianTimeZone})</p>` : ''}
              </div>
            </div>
          </td>
          
          <!-- Right Column - Company Information -->
          <td style="width: 50%; vertical-align: top; padding-left: 8px;">
            <div class="column-box" style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border-left: 4px solid #0056a8;">
              <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 13px; font-weight: 600;">Company Information</h3>
              <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px;">
                <strong style="color: #374151; font-weight: 600;">Contact:</strong> ${report.company.contact_name || 'N/A'}
              </p>
              <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px;">
                <strong style="color: #374151; font-weight: 600;">Email:</strong> <a href="mailto:${report.company.contact_email}" style="color: #0056a8; text-decoration: none;">${report.company.contact_email || 'N/A'}</a>
              </p>
              <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px;">
                <strong style="color: #374151; font-weight: 600;">Phone:</strong> ${report.company.contact_phone || 'N/A'}
              </p>
              <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px;">
                <strong style="color: #374151; font-weight: 600;">Address:</strong> ${report.company.address || 'N/A'} ${report.company.city ? report.company.city : ''}
              </p>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Service Information -->
    <div class="content-section" style="margin: 16px 20px;">
      <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Service Details</h3>
      <table style="width: 100%; border-collapse: collapse; border-radius: 6px; overflow: hidden; border: 1px solid #e5e7eb;">
        ${formDataHtml}
      </table>
    </div>

    <!-- Call to Action Buttons -->
    <div class="button-container" style="margin: 20px; text-align: center;">
      <a href="${appUrl}/report-photos/${report.id}" 
         target="_blank" 
         rel="noopener noreferrer"
         class="button"
         style="display: inline-block; background-color: #003f7f; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(0, 63, 127, 0.2); margin: 0 4px;">
        Preview Report
      </a>
      <a href="${reportsUrl}" 
         target="_blank" 
         rel="noopener noreferrer"
         class="button"
         style="display: inline-block; background-color: #0056a8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(0, 86, 168, 0.2); margin: 0 4px;">
        Go to the App/Admin
      </a>
    </div>

    ${
      report.notes
        ? `
    <div class="content-section" style="margin: 16px 20px;">
      <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Additional Notes</h3>
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 14px; border-left: 3px solid #e5e7eb;">
        <p style="color: #4b5563; margin: 0; line-height: 1.6; font-size: 13px; white-space: pre-wrap;">
          ${report.notes}
        </p>
      </div>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; margin-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; line-height: 1.5;">
        Automated notification from Prime Line Coffee Service
      </p>
      <p style="color: #9ca3af; margin: 0; font-size: 11px;">
        © ${new Date().getFullYear()} Prime Line Coffee Service
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export { handler };
