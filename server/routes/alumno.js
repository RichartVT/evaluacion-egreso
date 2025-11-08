import { Router } from "express";
import { pool } from "../db.js";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:3000";

/* ---------- util ---------- */
function periodoActual() {
  if (process.env.PERIODO_ACTUAL) return process.env.PERIODO_ACTUAL;
  const d = new Date();
  const y = d.getFullYear();
  const mm = d.getMonth() + 1;
  return `${y}/${mm <= 6 ? "06" : "12"}`;
}

/* ---------- ensure tabla alumno_materia (una sola vez) ---------- */
let alumnoMateriaEnsured = false;
async function ensureAlumnoMateriaTable() {
  if (alumnoMateriaEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alumno_materia (
      id_estudiante VARCHAR(20) NOT NULL,
      id_materia    VARCHAR(12) NOT NULL,
      periodo       CHAR(7)     NOT NULL,
      creado_en     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_estudiante, id_materia, periodo),
      CONSTRAINT fk_am_est FOREIGN KEY (id_estudiante)
        REFERENCES estudiantes(id_estudiante)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CONSTRAINT fk_am_mat FOREIGN KEY (id_materia)
        REFERENCES materias(id_materia)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    ) ENGINE=InnoDB;
  `);
  alumnoMateriaEnsured = true;
}

/* ---------- guard ALUMNO: crea fila en estudiantes si falta ---------- */
const requireAlumno = async (req, res, next) => {
  try {
    const { token } = req.cookies || {};
    if (!token) return res.status(401).json({ error: "No auth" });

    const p = jwt.verify(token, JWT_SECRET);
    if (p.rol !== "ALUMNO")
      return res.status(403).json({ error: "Solo alumnos" });

    // ¿existe en estudiantes?
    let [[est]] = await pool.query(
      "SELECT id_estudiante FROM estudiantes WHERE usuario_id=? LIMIT 1",
      [p.uid]
    );

    // si no existe, intenta inferirlo del email 21030846@itcelaya.edu.mx -> 21030846
    if (!est) {
      const m = String(p.email || "").match(/^(\d{8,9})@/);
      if (!m) return res.status(403).json({ error: "Alumno no encontrado" });

      const control = m[1];
      await pool.query(
        `INSERT IGNORE INTO estudiantes (id_estudiante, nombre, usuario_id)
         VALUES (?,?,?)`,
        [control, `Alumno ${control}`, p.uid]
      );
      [[est]] = await pool.query(
        "SELECT id_estudiante FROM estudiantes WHERE usuario_id=? LIMIT 1",
        [p.uid]
      );
      if (!est) return res.status(403).json({ error: "Alumno no encontrado" });
    }

    req.alumno = {
      control: est.id_estudiante,
      usuario_id: p.uid,
      email: p.email,
    };
    next();
  } catch (err) {
    console.error("requireAlumno error:", err);
    res.status(401).json({ error: "Sesión inválida" });
  }
};

/* ---------- GET pendientes/evaluadas ---------- */
router.get("/materias", requireAlumno, async (req, res) => {
  try {
    await ensureAlumnoMateriaTable();

    const periodo = periodoActual();
    const control = req.alumno.control;

    const [evaluadas] = await pool.query(
      `SELECT r.id_materia, m.nom_materia, COUNT(*) AS respuestas
         FROM respuestas r
         JOIN materias m ON m.id_materia = r.id_materia
        WHERE r.id_estudiante = ? AND r.periodo = ?
        GROUP BY r.id_materia, m.nom_materia
        ORDER BY m.nom_materia`,
      [control, periodo]
    );

    const [pendientes] = await pool.query(
      `SELECT am.id_materia, m.nom_materia
         FROM alumno_materia am
         JOIN materias m ON m.id_materia = am.id_materia
    LEFT JOIN (
           SELECT DISTINCT id_materia
             FROM respuestas
            WHERE id_estudiante = ? AND periodo = ?
         ) r ON r.id_materia = am.id_materia
        WHERE am.id_estudiante = ? AND am.periodo = ?
          AND r.id_materia IS NULL
        ORDER BY m.nom_materia`,
      [control, periodo, control, periodo]
    );

    res.json({ periodo, pendientes, evaluadas });
  } catch (err) {
    console.error("GET /api/alumno/materias error:", err);
    res.status(500).json({ error: "No se pudo cargar la lista de materias" });
  }
});

/* ---------- POST registrar clave de materia ---------- */
router.post("/materias/registrar", requireAlumno, async (req, res) => {
  try {
    await ensureAlumnoMateriaTable();

    const { id_materia } = req.body ?? {};
    const control = req.alumno.control;
    const periodo = periodoActual();

    if (!id_materia || !/^[A-Z]{3}-\d{4}$/i.test(id_materia)) {
      return res
        .status(400)
        .json({ error: "Clave de materia inválida (ej. SCD-1015)" });
    }

    const [[mat]] = await pool.query(
      "SELECT id_materia, nom_materia FROM materias WHERE id_materia=?",
      [id_materia.toUpperCase()]
    );
    if (!mat) return res.status(404).json({ error: "La materia no existe" });

    const [[map]] = await pool.query(
      "SELECT 1 FROM materia_atributo WHERE id_materia=? LIMIT 1",
      [id_materia.toUpperCase()]
    );
    if (!map) {
      return res
        .status(409)
        .json({ error: "La materia no tiene evaluación configurada" });
    }

    const [[yaEval]] = await pool.query(
      `SELECT 1 FROM respuestas WHERE id_estudiante=? AND id_materia=? AND periodo=? LIMIT 1`,
      [control, id_materia.toUpperCase(), periodo]
    );
    if (yaEval) {
      await pool.query(
        `INSERT IGNORE INTO alumno_materia (id_estudiante, id_materia, periodo)
         VALUES (?,?,?)`,
        [control, id_materia.toUpperCase(), periodo]
      );
      return res.status(200).json({
        ok: true,
        estado: "evaluada",
        mensaje: "Esta materia ya fue evaluada en el periodo actual.",
        materia: { id_materia: mat.id_materia, nom_materia: mat.nom_materia },
      });
    }

    await pool.query(
      `INSERT IGNORE INTO alumno_materia (id_estudiante, id_materia, periodo)
       VALUES (?,?,?)`,
      [control, id_materia.toUpperCase(), periodo]
    );

    res.status(201).json({
      ok: true,
      estado: "pendiente",
      mensaje: "Materia registrada. Puedes iniciar tu evaluación.",
      materia: { id_materia: mat.id_materia, nom_materia: mat.nom_materia },
    });
  } catch (err) {
    console.error("POST /api/alumno/materias/registrar error:", err);
    res.status(500).json({ error: "No se pudo registrar la materia" });
  }
});

// --- obtiene la encuesta (atributos+criterios) de una materia ---
router.get("/encuesta/:materiaId", requireAlumno, async (req, res) => {
  try {
    const periodo = periodoActual();
    const control = req.alumno.control;
    const materiaId = String(req.params.materiaId || "").toUpperCase();

    const [[mat]] = await pool.query(
      "SELECT id_materia, nom_materia FROM materias WHERE id_materia=?",
      [materiaId]
    );
    if (!mat) return res.status(404).json({ error: "Materia no encontrada" });

    // atributos mapeados a la materia + criterios
    const [rows] = await pool.query(
      `SELECT ma.id_carrera, ma.id_atributo, ma.nivel,
              a.nom_atributo,
              c.id_criterio, c.descripcion, c.des_n1, c.des_n2, c.des_n3, c.des_n4
         FROM materia_atributo ma
         JOIN atributos a
           ON a.id_carrera=ma.id_carrera AND a.id_atributo=ma.id_atributo
         JOIN criterios c
           ON c.id_carrera=ma.id_carrera AND c.id_atributo=ma.id_atributo
        WHERE ma.id_materia=?
        ORDER BY ma.id_atributo, c.id_criterio`,
      [materiaId]
    );
    if (!rows.length)
      return res
        .status(409)
        .json({ error: "La materia no tiene evaluación configurada" });

    // mapear estructura { atributos:[{id_atributo, nom_atributo, nivel, criterios:[]}] }
    const map = new Map();
    for (const r of rows) {
      const key = r.id_atributo;
      if (!map.has(key)) {
        map.set(key, {
          id_carrera: r.id_carrera,
          id_atributo: r.id_atributo,
          nom_atributo: r.nom_atributo,
          nivel: r.nivel,
          criterios: [],
        });
      }
      map.get(key).criterios.push({
        id_criterio: r.id_criterio,
        descripcion: r.descripcion,
        des_n1: r.des_n1,
        des_n2: r.des_n2,
        des_n3: r.des_n3,
        des_n4: r.des_n4,
      });
    }

    const [[ya]] = await pool.query(
      `SELECT 1 FROM respuestas
        WHERE id_estudiante=? AND id_materia=? AND periodo=? LIMIT 1`,
      [control, materiaId, periodo]
    );

    res.json({
      periodo,
      materia: mat,
      yaRespondida: !!ya,
      atributos: Array.from(map.values()),
    });
  } catch (err) {
    console.error("GET /api/alumno/encuesta/:materiaId", err);
    res.status(500).json({ error: "No se pudo cargar la encuesta" });
  }
});

// --- guarda las respuestas ---
router.post("/encuesta/:materiaId", requireAlumno, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const periodo = periodoActual();
    const control = req.alumno.control;
    const materiaId = String(req.params.materiaId || "").toUpperCase();

    // 🔧 Robustez: si por alguna razón llegó como string, intenta parsear
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        /* ignore */
      }
    }
    const answers = body?.answers;
    if (!Array.isArray(answers) || answers.length === 0) {
      return res
        .status(400)
        .json({ error: "Cuerpo inválido: se esperaba { answers: [...] }" });
    }

    // validar materia y combos válidos (atributo/criterio) desde configuración
    const [validRows] = await pool.query(
      `SELECT c.id_carrera, c.id_atributo, c.id_criterio
         FROM materia_atributo ma
         JOIN criterios c
           ON c.id_carrera=ma.id_carrera AND c.id_atributo=ma.id_atributo
        WHERE ma.id_materia=?`,
      [materiaId]
    );
    if (!validRows.length)
      return res
        .status(409)
        .json({ error: "La materia no tiene evaluación configurada" });

    const valid = new Set(
      validRows.map((r) => `${r.id_carrera}:${r.id_atributo}:${r.id_criterio}`)
    );
    const carrera = validRows[0].id_carrera;

    // insertar respuestas (UPSERT)
    await conn.beginTransaction();
    for (const a of answers) {
      if (a == null || typeof a !== "object")
        return res.status(400).json({ error: "Formato de respuesta inválido" });

      const k = `${carrera}:${a.id_atributo}:${a.id_criterio}`;
      if (!valid.has(k)) throw new Error(`Criterio inválido ${k}`);
      const lik = Number(a.likert);
      if (!Number.isInteger(lik) || lik < 1 || lik > 4) {
        return res.status(400).json({ error: "Likert fuera de rango (1..4)" });
      }

      await conn.query(
        `INSERT INTO respuestas
         (id_carrera, id_materia, periodo, id_estudiante, id_atributo, id_criterio, likert)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE likert=VALUES(likert)`,
        [
          carrera,
          materiaId,
          periodo,
          control,
          a.id_atributo,
          a.id_criterio,
          lik,
        ]
      );
    }
    // asegura presencia en alumno_materia
    await conn.query(
      `INSERT IGNORE INTO alumno_materia (id_estudiante, id_materia, periodo)
       VALUES (?,?,?)`,
      [control, materiaId, periodo]
    );
    await conn.commit();

    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("POST /api/alumno/encuesta/:materiaId", err);
    // si el error trae mensaje "Criterio inválido ..." u otro, repórtalo
    const msg = err?.message || "No se pudieron guardar las respuestas";
    // 400 para errores de validación; 500 para el resto
    if (/inválido|rango|formato|cuerpo inválido/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  } finally {
    conn.release();
  }
});

export default router;
