import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "QR Menu <onboarding@resend.dev>";

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://saas-qr-55st.vercel.app";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Подтвердите вашу почту — QR Menu",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 16px; background: #2563eb; color: white; font-weight: 900; font-size: 18px;">
            QR
          </div>
        </div>
        <h1 style="font-size: 24px; font-weight: 900; text-align: center; margin-bottom: 16px; color: #111;">
          Подтвердите вашу почту
        </h1>
        <p style="font-size: 16px; color: #666; text-align: center; line-height: 1.6; margin-bottom: 32px;">
          Нажмите на кнопку ниже, чтобы подтвердить ваш email и начать пользоваться QR Menu.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: #2563eb; color: white; font-weight: 700; font-size: 16px; text-decoration: none; border-radius: 12px;">
            Подтвердить email
          </a>
        </div>
        <p style="font-size: 13px; color: #999; text-align: center; line-height: 1.5;">
          Если вы не регистрировались в QR Menu, просто проигнорируйте это письмо.
        </p>
        <p style="font-size: 12px; color: #ccc; text-align: center; margin-top: 24px;">
          Ссылка действительна 24 часа.
        </p>
      </div>
    `,
  });
}
