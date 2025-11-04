// test-smtp.js
import "dotenv/config";
import nodemailer from "nodemailer";

async function main() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

  let transporter;
  if (!SMTP_HOST || SMTP_HOST === "ethereal") {
    const acct = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: acct.user, pass: acct.pass },
    });
    console.log("Usando cuenta Ethereal:", acct.user);
  } else {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log(`Conectando a ${SMTP_HOST}:${SMTP_PORT}`);
  }

  const ok = await transporter.verify();
  console.log("SMTP OK?", ok);

  const info = await transporter.sendMail({
    from: MAIL_FROM || "no-reply@example.com",
    to: process.env.TEST_TO || "21030523@itcelaya.edu.mx",
    subject: "Prueba SMTP",
    html: "<p>Hola</p>",
  });

  console.log("MessageId:", info.messageId);
  const url = nodemailer.getTestMessageUrl(info);
  if (url) console.log("Preview URL:", url);
}

main().catch((err) => {
  console.error("Fallo SMTP:", err);
  process.exit(1);
});
