import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/** GET /api/atributos?carrera=ISC */
router.get("/", async (req, res) => {
  try {
    const { carrera } = req.query;
    if (!carrera)
      return res.status(400).json({ error: "Falta parámetro carrera" });
    const [rows] = await pool.query(
      "SELECT id_carrera, id_atributo, nom_atributo, nomcorto FROM atributos WHERE id_carrera = ? ORDER BY id_atributo",
      [carrera]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron obtener los atributos" });
  }
});

/** POST /api/atributos  body: { id_carrera, id_atributo, nom_atributo, nomcorto? } */
router.post("/", async (req, res) => {
  try {
    const {
      id_carrera,
      id_atributo,
      nom_atributo,
      nomcorto = null,
    } = req.body || {};
    if (!id_carrera || !id_atributo || !nom_atributo) {
      return res
        .status(400)
        .json({
          error: "id_carrera, id_atributo y nom_atributo son obligatorios",
        });
    }
    await pool.execute(
      "INSERT INTO atributos (id_carrera, id_atributo, nom_atributo, nomcorto) VALUES (?,?,?,?)",
      [id_carrera, Number(id_atributo), nom_atributo.trim(), nomcorto]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Atributo duplicado en la carrera" });
    if (e.code === "ER_NO_REFERENCED_ROW_2")
      return res.status(409).json({ error: "Carrera inexistente" });
    res.status(500).json({ error: "No se pudo crear el atributo" });
  }
});

/** DELETE /api/atributos/:carrera/:id_atributo?force=1
 *  - Si tiene dependencias (criterios, mapeos, respuestas) devuelve 409 con conteos
 *  - Si ?force=1, borra dependencias y luego el atributo, en transacción
 */
router.delete("/:carrera/:id", async (req, res) => {
  const idCarrera = String(req.params.carrera).trim();
  const idAtributo = Number(req.params.id);
  const force = req.query.force === "1";
  const conn = await pool.getConnection();

  try {
    // contar dependencias
    const [[counts]] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM criterios        WHERE id_carrera=? AND id_atributo=?) AS criterios,
         (SELECT COUNT(*) FROM materia_atributo WHERE id_carrera=? AND id_atributo=?) AS mapeos,
         (SELECT COUNT(*) FROM respuestas       WHERE id_carrera=? AND id_atributo=?) AS respuestas`,
      [idCarrera, idAtributo, idCarrera, idAtributo, idCarrera, idAtributo]
    );

    if (
      !force &&
      (counts.criterios > 0 || counts.mapeos > 0 || counts.respuestas > 0)
    ) {
      return res.status(409).json({
        error: "Atributo en uso",
        detail: "Existen criterios, mapeos y/o respuestas relacionadas.",
        counts,
        code: "DEPENDENCIES_FOUND",
      });
    }

    await conn.beginTransaction();

    // borrar dependencias (orden: respuestas -> criterios -> mapeos) y luego atributo
    await conn.execute(
      "DELETE FROM respuestas       WHERE id_carrera=? AND id_atributo=?",
      [idCarrera, idAtributo]
    );
    await conn.execute(
      "DELETE FROM criterios        WHERE id_carrera=? AND id_atributo=?",
      [idCarrera, idAtributo]
    );
    await conn.execute(
      "DELETE FROM materia_atributo WHERE id_carrera=? AND id_atributo=?",
      [idCarrera, idAtributo]
    );

    const [rDelAttr] = await conn.execute(
      "DELETE FROM atributos WHERE id_carrera=? AND id_atributo=?",
      [idCarrera, idAtributo]
    );
    if (rDelAttr.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Atributo no encontrado" });
    }

    await conn.commit();
    res.json({
      ok: true,
      deleted: { atributos: rDelAttr.affectedRows, ...counts },
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar el atributo" });
  } finally {
    conn.release();
  }
});

export default router;
