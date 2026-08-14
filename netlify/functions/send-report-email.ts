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
    .filter(([key]) => key !== 'customerSignature' && key !== 'customerPrintName') // Exclude signature data from table
    .map(
      ([key, value]) => {
        // Replace newlines with <br> for better Outlook compatibility
        const formattedValue = formatValue(value).replace(/\n/g, '<br>');
        return `
      <tr>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: bold; color: #374151; width: 35%; font-size: 13px; font-family: Arial, sans-serif; vertical-align: top;">
          ${key}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif; vertical-align: top;">
          ${formattedValue}
        </td>
      </tr>
    `;
      }
    )
    .join('');

  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Service Report</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <!-- Main Container -->
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; margin: 0 auto;">
          
          <!-- Header with Logo -->
          <tr>
            <td class="header" style="background-color: #003f7f; padding: 28px 20px; text-align: center;">
              <img src="${appUrl}/logo-white.png" alt="Prime Line Coffee Service" style="height: 40px; width: auto; margin-bottom: 10px; max-width: 90%; display: block; margin-left: auto; margin-right: auto;" />
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 13px; font-weight: bold;">
                Technical Service Report
              </p>
            </td>
          </tr>

          <!-- Report Summary Section -->
          <tr>
            <td style="padding: 24px 20px 16px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 17px; font-weight: bold; font-family: Arial, sans-serif;">
                      Report Overview
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td>
                    <!-- Two Column Layout -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Left Column - Report Details -->
                        <td width="50%" valign="top" style="padding-right: 8px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="16" border="0" style="background-color: #f9fafb; border-left: 4px solid #003f7f;">
                            <tr>
                              <td>
                                <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 13px; font-weight: bold; font-family: Arial, sans-serif;">Report Details</h3>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: bold; font-family: Arial, sans-serif;">COMPANY</p>
                                      <p style="margin: 0; color: #1f2937; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;">${report.company.name}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: bold; font-family: Arial, sans-serif;">TECHNICIAN</p>
                                      <p style="margin: 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">${report.technician.user.full_name}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: bold; font-family: Arial, sans-serif;">FORM TYPE</p>
                                      <p style="margin: 0; color: #1f2937; font-size: 14px; font-family: Arial, sans-serif;">${report.form.name}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 11px; font-weight: bold; font-family: Arial, sans-serif;">SUBMITTED</p>
                                      <p style="margin: 0; color: #1f2937; font-size: 13px; font-family: Arial, sans-serif;">${report.form_data?.technicianLocalTime || new Date(report.submitted_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'long' })}</p>
                                      ${report.form_data?.technicianTimeZone ? `<p style="margin: 3px 0 0 0; color: #6b7280; font-size: 11px; font-family: Arial, sans-serif;">(${report.form_data.technicianTimeZone})</p>` : ''}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                        
                        <!-- Right Column - Company Information -->
                        <td width="50%" valign="top" style="padding-left: 8px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="16" border="0" style="background-color: #f9fafb; border-left: 4px solid #0056a8;">
                            <tr>
                              <td>
                                <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 13px; font-weight: bold; font-family: Arial, sans-serif;">Company Information</h3>
                                <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px; font-family: Arial, sans-serif;">
                                  <strong style="color: #374151; font-weight: bold;">Contact:</strong> ${report.company.contact_name || 'N/A'}
                                </p>
                                <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px; font-family: Arial, sans-serif;">
                                  <strong style="color: #374151; font-weight: bold;">Email:</strong> <a href="mailto:${report.company.contact_email}" style="color: #0056a8; text-decoration: none;">${report.company.contact_email || 'N/A'}</a>
                                </p>
                                <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px; font-family: Arial, sans-serif;">
                                  <strong style="color: #374151; font-weight: bold;">Phone:</strong> ${report.company.contact_phone || 'N/A'}
                                </p>
                                <p style="color: #4b5563; margin: 6px 0; line-height: 1.5; font-size: 13px; font-family: Arial, sans-serif;">
                                  <strong style="color: #374151; font-weight: bold;">Address:</strong> ${report.company.address || 'N/A'} ${report.company.city ? report.company.city : ''}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Service Information -->
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">Service Details</h3>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e5e7eb;">
                      ${formDataHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${report.signature_url ? `
          <!-- Customer Signature -->
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">Customer Signature</h3>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 16px; border: 1px solid #e5e7eb;" align="center">
                    <img src="${report.signature_url}" alt="Customer Signature" style="max-width: 400px; width: 100%; height: auto; border: 1px solid #d1d5db; background-color: white;" />
                    ${report.form_data?.customerPrintName ? `
                    <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 13px; font-family: Arial, sans-serif;">
                      Signed by: <strong style="color: #1f2937;">${report.form_data.customerPrintName}</strong>
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Call to Action Buttons -->
          <tr>
            <td style="padding: 20px;" align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="padding: 0 4px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #003f7f;">
                          <a href="${appUrl}/report-photos/${report.id}" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             style="display: block; background-color: #003f7f; color: #ffffff; text-decoration: none; padding: 12px 20px; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif; border: none;">
                            Preview Report
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding: 0 4px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #0056a8;">
                          <a href="${reportsUrl}" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             style="display: block; background-color: #0056a8; color: #ffffff; text-decoration: none; padding: 12px 20px; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif; border: none;">
                            Go to the App/Admin
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
      report.notes
        ? `
          <!-- Additional Notes -->
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif;">Additional Notes</h3>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 14px; border-left: 3px solid #e5e7eb;">
                    <p style="color: #4b5563; margin: 0; line-height: 1.6; font-size: 13px; font-family: Arial, sans-serif;">
                      ${report.notes}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
        : ''
    }

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;" align="center">
              <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; line-height: 1.5; font-family: Arial, sans-serif;">
                Automated notification from Prime Line Coffee Service
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 11px; font-family: Arial, sans-serif;">
                © ${new Date().getFullYear()} Prime Line Coffee Service
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export { handler };
