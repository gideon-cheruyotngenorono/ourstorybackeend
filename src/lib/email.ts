import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[EMAIL] SMTP credentials missing in .env. Skipping email to', to);
      return { success: false, error: 'SMTP credentials missing' };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Adding brief timeouts to prevent hanging if the SMTP server is unresponsive
      connectionTimeout: 5000, 
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });

    await transporter.verify(); // Fail fast if config is bad

    await transporter.sendMail({
      from: `"Our Story App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL_SEND_ERROR]', error.message || error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
