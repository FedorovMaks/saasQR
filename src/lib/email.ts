import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "TapMenu <noreply@tap-menu.ru>";

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://saas-qr-55st.vercel.app";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Подтвердите вашу почту — TapMenu",
    html: `
      <div style="font-family: 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 4px; background: #3c6e71; color: white; font-weight: 800; font-size: 14px; letter-spacing: 0.04em;">
            TM
          </div>
        </div>
        <h1 style="font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 16px; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.12em;">
          Подтвердите почту
        </h1>
        <p style="font-size: 14px; color: #7a7a7a; text-align: center; line-height: 1.6; margin-bottom: 32px;">
          Нажмите на кнопку ниже, чтобы подтвердить ваш email и начать пользоваться TapMenu.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 28px; background: #3c6e71; color: white; font-weight: 600; font-size: 13px; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em;">
            Подтвердить email
          </a>
        </div>
        <p style="font-size: 12px; color: #a0a0a0; text-align: center; line-height: 1.5;">
          Если вы не регистрировались в TapMenu, просто проигнорируйте это письмо.
        </p>
        <p style="font-size: 11px; color: #c4c4c4; text-align: center; margin-top: 24px;">
          Ссылка действительна 24 часа.
        </p>
      </div>
    `,
  });
}
