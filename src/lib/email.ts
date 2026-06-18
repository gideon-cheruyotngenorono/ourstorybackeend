import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'noreply@ourstory.app';

    if (!pass || !user) {
      console.warn('[EMAIL] SMTP_USER or SMTP_PASS missing in .env. Skipping email to', to);
      return { success: false, error: 'SMTP credentials missing' };
    }

    const isImplicitTLS = port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isImplicitTLS,
      ...(!isImplicitTLS && { requireTLS: true }), // STARTTLS for port 587 (Brevo)
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
    });

    const info = await transporter.sendMail({
      from: `"Our Story App" <${from}>`,
      to,
      subject,
      html,
    });

    console.log('[EMAIL_SUCCESS]', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL_SEND_ERROR]', error.message || error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
