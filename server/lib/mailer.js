// server/lib/mailer.js
import nodemailer from "nodemailer";

export async function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  // Modo sandbox: Ethereal (no entrega real, da URL de previsualización)
  if (!SMTP_HOST || SMTP_HOST === "ethereal") {
    const acct = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: acct.user, pass: acct.pass },
    });
  }

  // SMTP real (Gmail/Workspace/365/SendGrid/etc.)
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

export async function sendTempPassword({ to, password }) {
  const transporter = await createTransport();
  const from = process.env.MAIL_FROM || "no-reply@example.com";
  const html = `
    <p>Hola,</p>
    <p>Tu contraseña temporal para <b>Evaluación de Atributos de Egreso</b> es:</p>
    <p style="font-size:18px"><b>${password}</b></p>
    <p>Usuario: <code>${to}</code></p>
    <p>No es posible cambiarla. No la compartas.</p>
  `;
  const info = await transporter.sendMail({
    from,
    to,
    subject: "Tu contraseña temporal",
    html,
  });

  const preview = nodemailer.getTestMessageUrl?.(info);
  if (preview) console.log("Ethereal preview:", preview);
}
