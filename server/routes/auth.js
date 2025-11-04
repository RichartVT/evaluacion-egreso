// server/routes/auth.js
import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { sendTempPassword } from "../lib/mailer.js";
import nodemailer from "nodemailer";

const STUDENT_DOMAIN = process.env.STUDENT_DOMAIN || "itcelaya.edu.mx";
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET;

const router = Router();
router.use(cookieParser());

// Rate limit para solicitud de contraseña temporal (alumnos)
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// SMTP
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Helpers
function buildStudentEmailFromControl(control) {
  return `${control}@${STUDENT_DOMAIN}`;
}
function isValidControlNumber(s) {
  // 2 dígitos año + 2-3 plantel + 4 consecutivos => 8-9 dígitos
  return /^[0-9]{2}[0-9]{2,3}[0-9]{4}$/.test(String(s || ""));
}
function genTempPassword() {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const D = "23456789";
  const pick = (set, n) =>
    Array.from(
      { length: n },
      () => set[Math.floor(Math.random() * set.length)]
    ).join("");
  return pick(L, 4) + pick(D, 4) + pick(L, 2);
}
function signSession(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

// === Alumno solicita contraseña temporal ===
// Crea/actualiza usuario con rol ALUMNO y su registro en `estudiantes`.
// Envía la contraseña temporal por correo.
router.post("/alumnos/request", requestLimiter, async (req, res) => {
  const { control } = req.body ?? {};
  try {
    if (!isValidControlNumber(control)) {
      return res.status(400).json({ error: "Número de control inválido" });
    }

    const emailAlumno = buildStudentEmailFromControl(control);
    const nombreVisible = `Alumno ${control}`;

    // Rol ALUMNO
    const [[rolAlumno]] = await pool.query(
      "SELECT id_rol FROM roles WHERE clave='ALUMNO' LIMIT 1"
    );
    if (!rolAlumno)
      return res.status(500).json({ error: "Rol ALUMNO no encontrado" });

    // Password temporal y hash
    const tempPass = genTempPassword();
    const hash = await bcrypt.hash(tempPass, 12);

    // Upsert en usuarios (email único)
    await pool.query(
      `INSERT INTO usuarios (email, password_hash, nombre, rol_id)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE
         password_hash=VALUES(password_hash),
         nombre=VALUES(nombre),
         rol_id=VALUES(rol_id)`,
      [emailAlumno, hash, nombreVisible, rolAlumno.id_rol]
    );

    // Obtener id_usuario
    const [[u]] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE email=? LIMIT 1",
      [emailAlumno]
    );

    // Upsert en estudiantes
    await pool.query(
      `INSERT INTO estudiantes (id_estudiante, nombre, usuario_id)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE
         nombre=VALUES(nombre),
         usuario_id=VALUES(usuario_id)`,
      [control, nombreVisible, u.id_usuario]
    );

    // Enviar correo
    try {
      await mailer.verify(); // diagnostica SMTP (opcional)
      await mailer.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: emailAlumno,
        subject: "Tu contraseña temporal — Evaluación de Atributos de Egreso",
        text: `Hola,
Tu contraseña temporal es: ${tempPass}

Usuario: ${emailAlumno}
Ingresa en: ${APP_PUBLIC_URL}/alumno/login.html

No la compartas.`,
        html: `<p>Hola,</p>
<p>Tu <b>contraseña temporal</b> es: <code style="font-size:18px">${tempPass}</code></p>
<p>Usuario: <code>${emailAlumno}</code></p>
<p>Ingresa en: <a href="${APP_PUBLIC_URL}/alumno/login.html">${APP_PUBLIC_URL}/alumno/login.html</a></p>
<p>No la compartas.</p>`,
      });

      return res.json({ ok: true, email_enviado: true });
    } catch (smtpErr) {
      console.error(
        "SMTP error:",
        smtpErr?.code || smtpErr?.response || smtpErr
      );
      // En desarrollo, no tumbes el flujo: regresa la temporal para probar UI
      if (process.env.NODE_ENV !== "production") {
        return res.json({
          ok: true,
          email_enviado: false,
          tempPass_dev: tempPass,
        });
      }
      return res.status(502).json({ error: "Fallo al enviar correo" });
    }
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "No se pudo generar/enviar la contraseña temporal" });
  }
});

// === Login (alumno/coordinador/admin) ===
router.post("/login", async (req, res) => {
  // contraseña temporal para coordinador CoordISC2024!
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Faltan credenciales" });

    const [[user]] = await pool.query(
      `SELECT u.id_usuario, u.email, u.password_hash, r.clave AS rol
     FROM usuarios u
     JOIN roles r ON r.id_rol = u.rol_id
    WHERE u.email = ?`,
      [email]
    );
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = signSession({
      uid: user.id_usuario,
      rol: user.rol,
      email: user.email,
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ ok: true, rol: user.rol });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo iniciar sesión" });
  }
});

router.get("/me", (req, res) => {
  const { token } = req.cookies || {};
  if (!token) return res.status(401).json({ auth: false });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ auth: true, user: payload });
  } catch {
    res.status(401).json({ auth: false });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

router.post("/alumnos/request", async (req, res) => {
  const { control } = req.body ?? {};
  if (!control || !/^[0-9]{2}[0-9]{2,3}[0-9]{4}$/.test(control)) {
    return res.status(400).json({ error: "Número de control inválido" });
  }

  const email = `${control}@itcelaya.mx`;
  const nombreVisible = `Alumno ${control}`;
  const tempPass = (Math.random().toString(36).slice(-8) + "!A").replace(
    ".",
    "a"
  );
  const hash = await bcrypt.hash(tempPass, 12);

  // upsert usuario ALUMNO
  const [[rolAlumno]] = await pool.query(
    "SELECT id_rol FROM roles WHERE clave='ALUMNO' LIMIT 1"
  );
  if (!rolAlumno)
    return res.status(500).json({ error: "Rol ALUMNO no encontrado" });

  const [uIns] = await pool.query(
    `INSERT INTO usuarios (email, password_hash, nombre, rol_id)
     VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), nombre=VALUES(nombre), rol_id=VALUES(rol_id)`,
    [email, hash, nombreVisible, rolAlumno.id_rol]
  );

  // obtener id_usuario
  const [[u]] = await pool.query(
    "SELECT id_usuario FROM usuarios WHERE email=? LIMIT 1",
    [email]
  );

  // asegurar registro en estudiantes
  await pool.query(
    `INSERT INTO estudiantes (id_estudiante, nombre, usuario_id)
     VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), usuario_id=VALUES(usuario_id)`,
    [control, nombreVisible, u.id_usuario]
  );

  // enviar correo con la temporal
  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Acceso a Evaluación de Atributos de Egreso",
    text: `Hola, tu contraseña temporal es: ${tempPass}\n\nEntra en: ${
      process.env.APP_PUBLIC_URL || "http://localhost:3000"
    }/alumno/login.html`,
    html: `<p>Hola,</p><p>Tu <b>contraseña temporal</b> es: <b>${tempPass}</b></p><p>Ingresa en <a href="${
      process.env.APP_PUBLIC_URL || "http://localhost:3000"
    }/alumno/login.html">el portal</a>.</p>`,
  });

  res.json({ ok: true });
});

export default router;
