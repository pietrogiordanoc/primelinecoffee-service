import { Handler, HandlerEvent } from '@netlify/functions';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailAttachment {
  filename: string;
  content: string;
}

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

    // Prepare attachments
    const attachments: EmailAttachment[] = [];
    const photoLinks: string[] = [];

    if (report.photos && report.photos.length > 0) {
      // Check total size
      const totalSize = report.photos.reduce(
        (sum: number, photo: any) => sum + (photo.file_size || 0),
        0
      );
      const totalMB = totalSize / (1024 * 1024);

      if (totalMB <= 12) {
        // Attach files directly (under 12MB)
        for (const photo of report.photos) {
          try {
            const { data: fileData } = await supabase.storage
              .from('service-photos')
              .download(photo.file_name);

            if (fileData) {
              const buffer = await fileData.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');

              attachments.push({
                filename: photo.file_name,
                content: base64,
              });
            }
          } catch (err) {
            console.error('Error downloading photo:', err);
          }
        }
      } else {
        // Generate signed URLs (over 12MB)
        for (const photo of report.photos) {
          const { data: signedUrl } = await supabase.storage
            .from('service-photos')
            .createSignedUrl(photo.file_name, 604800); // 7 days

          if (signedUrl) {
            photoLinks.push(signedUrl.signedUrl);
          }
        }
      }
    }

    // Generate email HTML
    const emailHtml = generateEmailHtml(report, photoLinks);

    // Use configured sender email or fallback
    const fromName = settings.email_sender_name || 'Prime Line Coffee Service';
    const fromEmail = settings.email_sender_email || 'onboarding@resend.dev';
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmails,
      subject: `Nuevo Reporte de Servicio - ${report.company.name}`,
      html: emailHtml,
      attachments:
        attachments.length > 0
          ? attachments.map((att) => ({
              filename: att.filename,
              content: Buffer.from(att.content, 'base64'),
            }))
          : undefined,
    });

    if (emailError) {
      throw emailError;
    }

    // Log email
    await supabase.from('email_logs').insert([
      {
        report_id: reportId,
        recipient_email: recipientEmails.join(', '),
        subject: `New Service Report - ${report.company.name}`,
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
        <td style="padding: 8px; border: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600;">
          ${key}
        </td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">
          ${value}
        </td>
      </tr>
    `
    )
    .join('');

  const photoLinksHtml =
    photoLinks.length > 0
      ? `
    <h3 style="color: #1f2937; margin-top: 24px;">Photo Download Links</h3>
    <p style="color: #6b7280;">Photos are too large to attach to the email. Use the following links to download them (valid for 7 days):</p>
    <ul style="list-style: none; padding: 0;">
      ${photoLinks
        .map(
          (link, index) => `
        <li style="margin: 8px 0;">
          <a href="${link}" style="color: #2563eb; text-decoration: none;">
            📸 Photo ${index + 1} - Download
          </a>
        </li>
      `
        )
        .join('')}
    </ul>
  `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
        ☕ Prime Line Coffee Service
      </h1>
      <p style="color: #e0f2fe; margin: 8px 0 0 0;">
        New Technical Service Report
        <h2 style="margin: 0 0 12px 0; color: #0369a1; font-size: 18px;">
          📋 Report Summary
        </h2>
        <p style="margin: 4px 0; color: #374151;">
          <strong>Company:</strong> ${report.company.name}
        </p>
        <p style="margin: 4px 0; color: #374151;">
          <strong>Technician:</strong> ${report.technician.user.full_name}
        </p>
        <p style="margin: 4px 0; color: #374151;">
          <strong>Form:</strong> ${report.form.name}
        </p>
        <p style="margin: 4px 0; color: #374151;">
          <strong>Date:</strong> ${new Date(report.submitted_at).toLocaleString('en-US')}
        </p>
      </div>

      <!-- Company Details -->
      <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        🏢 Company Details
      </h3>
      <p style="color: #4b5563; margin: 8px 0;">
        <strong>Contact:</strong> ${report.company.contact_name || 'N/A'}
      </p>
      <p style="color: #4b5563; margin: 8px 0;">
        <strong>Email:</strong> ${report.company.contact_email || 'N/A'}
      </p>
      <p style="color: #4b5563; margin: 8px 0;">
        <strong>Phone:</strong> ${report.company.contact_phone || 'N/A'}
      </p>
      <p style="color: #4b5563; margin: 8px 0;">
        <strong>Address:</strong> ${report.company.address || 'N/A'}
      </p>

      <!-- Form Data -->
      <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px;">
        📝 Service Information
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        ${formDataHtml}
      </table>

      ${photoLinksHtml}

      ${
        report.notes
          ? `
        <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px;">
          💬 Additional Notes
        </h3>
        <p style="color: #4b5563; padding: 12px; background-color: #f9fafb; border-radius: 6px;">
          ${report.notes}
        </p>
      `
          : ''
      }
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0; font-size: 14px;">
        This is an automated email generated by the Prime Line Coffee Service management system
      </p>
      <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
        © ${new Date().getFullYear()} Prime Line Coffee Service. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export { handler };
