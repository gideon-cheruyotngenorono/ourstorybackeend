import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.SMTP_HOST || 'smtp.resend.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER || 'resend';
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'onboarding@resend.dev';

    if (!pass) {
      console.warn('[EMAIL] SMTP_PASS missing in .env. Skipping email to', to);
      return { success: false, error: 'SMTP password missing' };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, 
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000, 
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // Verification step is good but can be slow, let's keep it for debugging
    // await transporter.verify(); 

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
