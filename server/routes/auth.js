// server/routes/auth.js
import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { sendTempPassword } from "../lib/mailer.js";

const router = Router();
router.use(cookieParser());

// Rate limit para solicitud de contraseña temporal
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// Helpers
function buildStudentEmailFromControl(control) {
  return `${control}@itcelaya.edu.mx`;
}
function isValidControlNumber(s) {
  return /^\d{8,9}$/.test(s);
}
function genTempPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const pick = (set, n) =>
    Array.from(
      { length: n },
      () => set[Math.floor(Math.random() * set.length)]
    ).join("");
  return pick(letters, 4) + pick(digits, 4) + pick(letters, 2);
}
function signSession(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });
}

// === Alumno solicita contraseña temporal ===
router.post("/alumnos/request", requestLimiter, async (req, res) => {
  try {
    const { control } = req.body || {};
    if (!isValidControlNumber(String(control || ""))) {
      return res.status(400).json({ error: "Número de control inválido" });
    }
    const email = buildStudentEmailFromControl(control);
    const tempPassword = genTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const [existing] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE email=?",
      [email]
    );
    let userId;
    if (existing.length) {
      userId = existing[0].id_usuario;
      await pool.execute(
        'UPDATE usuarios SET password_hash=?, rol="ALUMNO", control=? WHERE id_usuario=?',
        [hash, control, userId]
      );
    } else {
      const [ins] = await pool.execute(
        'INSERT INTO usuarios (email, password_hash, rol, control) VALUES (?,?, "ALUMNO", ?)',
        [email, hash, control]
      );
      userId = ins.insertId;
    }

    await pool.execute(
      "INSERT INTO alumnos (id_estudiante, id_usuario) VALUES (?,?) ON DUPLICATE KEY UPDATE id_usuario=VALUES(id_usuario)",
      [control, userId]
    );

    await sendTempPassword({ to: email, password: tempPassword });
    res.json({ ok: true, email_enviado: email });
  } catch (e) {
    console.error(e);
    res
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

// antes: SELECT * FROM usuarios WHERE email=?

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

export default router;
