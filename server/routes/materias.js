// server/routes/materias.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/** GET /api/materias?carrera=ISC  (param opcional)
 *  - Si mandas ?carrera=ISC filtra por carrera
 *  - Si no mandas parámetro, regresa todas (útil para debug)
 */
router.get("/", async (req, res) => {
  try {
    const { carrera } = req.query;
    let sql =
      "SELECT id_materia, nom_materia, id_carrera, mat_fecini, mat_fecfin FROM materias";
    const args = [];
    if (carrera) {
      sql += " WHERE id_carrera = ?";
      args.push(carrera);
    }
    sql += " ORDER BY id_materia";
    const [rows] = await pool.query(sql, args);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron obtener las materias" });
  }
});

/** POST /api/materias
 * body: { id_materia, nom_materia, id_carrera, mat_fecini?, mat_fecfin? }
 */
router.post("/", async (req, res) => {
  try {
    const {
      id_materia,
      nom_materia,
      id_carrera,
      mat_fecini = null,
      mat_fecfin = null,
    } = req.body || {};
    if (!id_materia || !nom_materia || !id_carrera) {
      return res.status(400).json({
        error: "id_materia, nom_materia e id_carrera son obligatorios",
      });
    }
    if (String(id_materia).length > 12) {
      return res.status(400).json({ error: "id_materia excede 12 caracteres" });
    }
    await pool.execute(
      `INSERT INTO materias (id_materia, nom_materia, id_carrera, mat_fecini, mat_fecfin)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id_materia.trim(),
        nom_materia.trim(),
        id_carrera.trim(),
        mat_fecini || null,
        mat_fecfin || null,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(409).json({ error: "La carrera no existe" });
    }
    if (e.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe una materia con esa clave" });
    }
    res.status(500).json({ error: "No se pudo crear la materia" });
  }
});

/** PUT /api/materias/:id_materia
 * body: { nom_materia?, mat_fecini?, mat_fecfin? }
 */
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const {
      nom_materia,
      mat_fecini = null,
      mat_fecfin = null,
    } = req.body || {};
    if (!nom_materia && !mat_fecini && !mat_fecfin) {
      return res.status(400).json({ error: "Nada para actualizar" });
    }
    const [r] = await pool.execute(
      `UPDATE materias
         SET nom_materia = COALESCE(?, nom_materia),
             mat_fecini  = ?,
             mat_fecfin  = ?
       WHERE id_materia = ?`,
      [nom_materia ?? null, mat_fecini || null, mat_fecfin || null, id]
    );
    if (r.affectedRows === 0)
      return res.status(404).json({ error: "Materia no encontrada" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo actualizar la materia" });
  }
});

/** DELETE /api/materias/:id_materia */
// server/routes/materias.js  (solo el handler DELETE, lo demás igual)
router.delete("/:id", async (req, res) => {
  const id = String(req.params.id).trim();
  const force = req.query.force === "1";

  const conn = await pool.getConnection();
  try {
    // Conteos de dependencias
    const [[rDeps]] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM respuestas        WHERE id_materia = ?) AS respuestas,
         (SELECT COUNT(*) FROM materia_atributo  WHERE id_materia = ?) AS mapa`,
      [id, id]
    );

    if (!force && (rDeps.respuestas > 0 || rDeps.mapa > 0)) {
      return res.status(409).json({
        error: "Materia en uso",
        detail: `La materia tiene ${rDeps.respuestas} respuestas y ${rDeps.mapa} mapeos materia_atributo.`,
        counts: rDeps,
        code: "DEPENDENCIES_FOUND",
      });
    }

    await conn.beginTransaction();

    // Borrar dependientes si hay y si viene forzado
    let delResp = { affectedRows: 0 },
      delMapa = { affectedRows: 0 };
    if (rDeps.respuestas > 0 || force) {
      [delResp] = await conn.execute(
        "DELETE FROM respuestas WHERE id_materia = ?",
        [id]
      );
    }
    if (rDeps.mapa > 0 || force) {
      [delMapa] = await conn.execute(
        "DELETE FROM materia_atributo WHERE id_materia = ?",
        [id]
      );
    }

    const [delMat] = await conn.execute(
      "DELETE FROM materias WHERE id_materia = ?",
      [id]
    );
    if (delMat.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Materia no encontrada" });
    }

    await conn.commit();
    return res.json({
      ok: true,
      deleted: {
        materia: delMat.affectedRows,
        respuestas: delResp.affectedRows,
        materia_atributo: delMapa.affectedRows,
      },
    });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    // Si aún hay FKs RESTRICT en BD, devolver mensaje claro
    if (e.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ error: "Materia en uso (FK RESTRICT)" });
    }
    return res.status(500).json({ error: "No se pudo eliminar la materia" });
  } finally {
    conn.release();
  }
});

export default router;
