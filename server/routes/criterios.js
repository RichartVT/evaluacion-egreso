// server/routes/criterios.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/** GET /api/criterios?carrera=ISC&atributo=3(opcional) */
router.get("/", async (req, res) => {
  try {
    const careerId = String(req.query.carrera || "").trim();
    const attributeId = req.query.atributo ? Number(req.query.atributo) : null;
    if (!careerId)
      return res.status(400).json({ error: "Falta parámetro carrera" });

    let sql = `SELECT id_carrera, id_atributo, id_criterio, descripcion, des_n1, des_n2, des_n3, des_n4
               FROM criterios WHERE id_carrera = ?`;
    const params = [careerId];
    if (attributeId) {
      sql += " AND id_atributo = ?";
      params.push(attributeId);
    }
    sql += " ORDER BY id_atributo, id_criterio";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron obtener los criterios" });
  }
});

/** POST /api/criterios
 * body: { id_carrera, id_atributo, id_criterio, descripcion, des_n1, des_n2, des_n3, des_n4 }
 */
router.post("/", async (req, res) => {
  try {
    const {
      id_carrera,
      id_atributo,
      id_criterio,
      descripcion,
      des_n1,
      des_n2,
      des_n3,
      des_n4,
    } = req.body || {};

    if (
      !id_carrera ||
      !id_atributo ||
      !id_criterio ||
      !descripcion ||
      !des_n1 ||
      !des_n2 ||
      !des_n3 ||
      !des_n4
    ) {
      return res
        .status(400)
        .json({
          error:
            "Campos obligatorios: id_carrera, id_atributo, id_criterio, descripcion, des_n1..des_n4",
        });
    }

    await pool.execute(
      `INSERT INTO criterios
       (id_carrera, id_atributo, id_criterio, descripcion, des_n1, des_n2, des_n3, des_n4)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id_carrera.trim(),
        Number(id_atributo),
        Number(id_criterio),
        descripcion.trim(),
        des_n1.trim(),
        des_n2.trim(),
        des_n3.trim(),
        des_n4.trim(),
      ]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Criterio duplicado para ese atributo" });
    if (e.code === "ER_NO_REFERENCED_ROW_2")
      return res.status(409).json({ error: "Atributo o carrera inexistentes" });
    res.status(500).json({ error: "No se pudo crear el criterio" });
  }
});

/** PUT /api/criterios/:carrera/:atributo/:criterio
 * body: { descripcion?, des_n1?, des_n2?, des_n3?, des_n4? }
 */
router.put("/:carrera/:atributo/:criterio", async (req, res) => {
  try {
    const careerId = String(req.params.carrera).trim();
    const attributeId = Number(req.params.atributo);
    const criteriaId = Number(req.params.criterio);
    const {
      descripcion = null,
      des_n1 = null,
      des_n2 = null,
      des_n3 = null,
      des_n4 = null,
    } = req.body || {};

    if (
      ![descripcion, des_n1, des_n2, des_n3, des_n4].some(
        (v) => v !== null && v !== undefined
      )
    ) {
      return res.status(400).json({ error: "Nada para actualizar" });
    }

    const [result] = await pool.execute(
      `UPDATE criterios SET
         descripcion = COALESCE(?, descripcion),
         des_n1      = COALESCE(?, des_n1),
         des_n2      = COALESCE(?, des_n2),
         des_n3      = COALESCE(?, des_n3),
         des_n4      = COALESCE(?, des_n4)
       WHERE id_carrera=? AND id_atributo=? AND id_criterio=?`,
      [
        descripcion,
        des_n1,
        des_n2,
        des_n3,
        des_n4,
        careerId,
        attributeId,
        criteriaId,
      ]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Criterio no encontrado" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo actualizar el criterio" });
  }
});

/** DELETE /api/criterios/:carrera/:atributo/:criterio?force=1
 * - Si hay respuestas relacionadas, devuelve 409 con conteo y code=DEPENDENCIES_FOUND
 * - Con ?force=1 elimina respuestas y luego el criterio (transacción)
 */
router.delete("/:carrera/:atributo/:criterio", async (req, res) => {
  const careerId = String(req.params.carrera).trim();
  const attributeId = Number(req.params.atributo);
  const criteriaId = Number(req.params.criterio);
  const forceDelete = req.query.force === "1";

  const conn = await pool.getConnection();
  try {
    const [[counts]] = await conn.query(
      `SELECT (SELECT COUNT(*) FROM respuestas
               WHERE id_carrera=? AND id_atributo=? AND id_criterio=?) AS respuestas`,
      [careerId, attributeId, criteriaId]
    );

    if (!forceDelete && counts.respuestas > 0) {
      return res.status(409).json({
        error: "Criterio en uso",
        detail: `Existen ${counts.respuestas} respuesta(s) asociadas.`,
        counts,
        code: "DEPENDENCIES_FOUND",
      });
    }

    await conn.beginTransaction();
    await conn.execute(
      "DELETE FROM respuestas WHERE id_carrera=? AND id_atributo=? AND id_criterio=?",
      [careerId, attributeId, criteriaId]
    );
    const [delCrit] = await conn.execute(
      "DELETE FROM criterios WHERE id_carrera=? AND id_atributo=? AND id_criterio=?",
      [careerId, attributeId, criteriaId]
    );
    if (delCrit.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Criterio no encontrado" });
    }
    await conn.commit();
    res.json({
      ok: true,
      deleted: {
        criterios: delCrit.affectedRows,
        respuestas: counts.respuestas,
      },
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar el criterio" });
  } finally {
    conn.release();
  }
});

export default router;
