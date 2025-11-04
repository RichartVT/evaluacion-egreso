// server/routes/niveles_materia.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET ?carrera=ISC&materia=ACA-0907
router.get("/", async (req, res) => {
  try {
    const careerId = String(req.query.carrera || "").trim();
    const subjectId = String(req.query.materia || "").trim();
    if (!careerId || !subjectId)
      return res.status(400).json({ error: "Faltan carrera y materia" });

    const [rows] = await pool.query(
      `SELECT ma.id_carrera, ma.id_materia, ma.id_atributo, ma.nivel,
              a.nomcorto AS atributo_corto, a.nom_atributo AS atributo_nombre,
              m.nom_materia
       FROM materia_atributo ma
       JOIN atributos a ON a.id_carrera = ma.id_carrera AND a.id_atributo = ma.id_atributo
       JOIN materias  m ON m.id_materia = ma.id_materia
       WHERE ma.id_carrera = ? AND ma.id_materia = ?
       ORDER BY ma.id_atributo`,
      [careerId, subjectId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo obtener el mapa" });
  }
});

// POST { id_carrera, id_materia, id_atributo, nivel: 'I'|'M'|'A' }
router.post("/", async (req, res) => {
  try {
    const { id_carrera, id_materia, id_atributo, nivel } = req.body || {};
    if (!id_carrera || !id_materia || !id_atributo || !nivel)
      return res
        .status(400)
        .json({
          error:
            "Campos obligatorios: id_carrera, id_materia, id_atributo, nivel",
        });
    if (!["I", "M", "A"].includes(String(nivel)))
      return res.status(400).json({ error: "nivel inválido (I|M|A)" });

    const [[mat]] = await pool.query(
      "SELECT id_carrera FROM materias WHERE id_materia=?",
      [id_materia]
    );
    if (!mat) return res.status(409).json({ error: "Materia inexistente" });
    if (mat.id_carrera !== id_carrera)
      return res
        .status(409)
        .json({ error: "La materia no pertenece a esa carrera" });

    const [[attr]] = await pool.query(
      "SELECT 1 FROM atributos WHERE id_carrera=? AND id_atributo=?",
      [id_carrera, id_atributo]
    );
    if (!attr)
      return res
        .status(409)
        .json({ error: "Atributo inexistente en la carrera" });

    await pool.execute(
      "INSERT INTO materia_atributo (id_carrera, id_materia, id_atributo, nivel) VALUES (?,?,?,?)",
      [id_carrera, id_materia, Number(id_atributo), String(nivel)]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Ya existe el mapeo Materia↔Atributo" });
    return res.status(500).json({ error: "No se pudo crear el mapeo" });
  }
});

// DELETE /:carrera/:materia/:atributo?force=1
router.delete("/:carrera/:materia/:atributo", async (req, res) => {
  const careerId = String(req.params.carrera).trim();
  const subjectId = String(req.params.materia).trim();
  const attributeId = Number(req.params.atributo);
  const force = req.query.force === "1";
  const conn = await pool.getConnection();

  try {
    const [[counts]] = await conn.query(
      `SELECT (SELECT COUNT(*) FROM respuestas
               WHERE id_carrera=? AND id_materia=? AND id_atributo=?) AS respuestas`,
      [careerId, subjectId, attributeId]
    );
    if (!force && counts.respuestas > 0) {
      return res.status(409).json({
        error: "Mapeo en uso",
        detail: "Existen respuestas ligadas a esta Materia↔Atributo.",
        counts,
        code: "DEPENDENCIES_FOUND",
      });
    }

    await conn.beginTransaction();
    await conn.execute(
      "DELETE FROM respuestas WHERE id_carrera=? AND id_materia=? AND id_atributo=?",
      [careerId, subjectId, attributeId]
    );
    const [del] = await conn.execute(
      "DELETE FROM materia_atributo WHERE id_carrera=? AND id_materia=? AND id_atributo=?",
      [careerId, subjectId, attributeId]
    );
    if (del.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Mapeo no encontrado" });
    }
    await conn.commit();
    res.json({
      ok: true,
      deleted: { mapeos: del.affectedRows, respuestas: counts.respuestas },
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar el mapeo" });
  } finally {
    conn.release();
  }
});

export default router;
