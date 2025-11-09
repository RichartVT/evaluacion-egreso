// server/routes/admin/carreras.js
import { Router } from "express";
import { pool } from "../../db.js";

const router = Router();

// Helpers
const normId = (s = "") => s.trim().toUpperCase();
const isIdCarrera = (s) => /^[A-Z0-9]{2,5}$/.test(s);

// GET /api/admin/carreras
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id_carrera,
        c.nom_carrera,
        u.nombre  AS coordinador_nombre,
        u.email   AS coordinador_email,
        (SELECT COUNT(*) FROM materias  m WHERE m.id_carrera = c.id_carrera)  AS total_materias,
        (SELECT COUNT(*) FROM atributos a WHERE a.id_carrera = c.id_carrera)  AS total_atributos
      FROM carreras c
      LEFT JOIN coordinadores coord ON coord.carrera_id = c.id_carrera
      LEFT JOIN usuarios      u    ON u.id_usuario     = coord.usuario_id
      ORDER BY c.nom_carrera;
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener carreras" });
  }
});

// POST /api/admin/carreras
router.post("/", async (req, res) => {
  try {
    const id_carrera = normId(req.body?.id_carrera ?? "");
    const nom_carrera = (req.body?.nom_carrera ?? "").trim();

    if (!isIdCarrera(id_carrera) || !nom_carrera) {
      return res
        .status(400)
        .json({ error: "ID y nombre válidos son requeridos" });
    }

    await pool.execute(
      "INSERT INTO carreras (id_carrera, nom_carrera) VALUES (?, ?)",
      [id_carrera, nom_carrera]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ya existe una carrera con ese ID" });
    }
    res.status(500).json({ error: "Error al crear carrera" });
  }
});

// PUT /api/admin/carreras/:id
router.put("/:id", async (req, res) => {
  try {
    const id_carrera = normId(req.params.id);
    const nom_carrera = (req.body?.nom_carrera ?? "").trim();

    if (!isIdCarrera(id_carrera) || !nom_carrera) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const [result] = await pool.execute(
      "UPDATE carreras SET nom_carrera = ? WHERE id_carrera = ?",
      [nom_carrera, id_carrera]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Carrera no encontrada" });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al actualizar carrera" });
  }
});

// DELETE /api/admin/carreras/:id?force=1
router.delete("/:id", async (req, res) => {
  const id_carrera = normId(req.params.id);
  const force = req.query.force === "1";

  if (!isIdCarrera(id_carrera)) {
    return res.status(400).json({ error: "ID de carrera inválido" });
  }

  const conn = await pool.getConnection();
  try {
    // Conteo de dependencias
    const [[deps]] = await conn.query(
      `
      SELECT
        (SELECT COUNT(*) FROM materias m WHERE m.id_carrera = ?) AS materias,
        (SELECT COUNT(*) FROM atributos a WHERE a.id_carrera = ?) AS atributos,
        (SELECT COUNT(*) FROM criterios c WHERE c.id_carrera = ?) AS criterios,
        (SELECT COUNT(*) FROM materia_atributo ma WHERE ma.id_carrera = ?) AS materia_atributo,
        (SELECT COUNT(*) FROM respuestas r WHERE r.id_carrera = ?) AS respuestas,
        (SELECT COUNT(*) FROM alumno_materia am 
           JOIN materias m ON m.id_materia = am.id_materia
         WHERE m.id_carrera = ?) AS alumno_materia,
        (SELECT COUNT(*) FROM coordinadores coord WHERE coord.carrera_id = ?) AS coordinadores
      `,
      [
        id_carrera,
        id_carrera,
        id_carrera,
        id_carrera,
        id_carrera,
        id_carrera,
        id_carrera,
      ]
    );

    const totalDeps =
      deps.materias +
      deps.atributos +
      deps.criterios +
      deps.materia_atributo +
      deps.respuestas +
      deps.alumno_materia +
      deps.coordinadores;

    if (!force && totalDeps > 0) {
      return res.status(409).json({
        error: "Carrera en uso",
        code: "DEPENDENCIES_FOUND",
        counts: deps,
      });
    }

    await conn.beginTransaction();

    if (force && totalDeps > 0) {
      // Orden de borrado para respetar FKs (todos ON DELETE RESTRICT)
      await conn.execute("DELETE FROM respuestas WHERE id_carrera = ?", [
        id_carrera,
      ]);
      await conn.execute(
        `DELETE am FROM alumno_materia am
          JOIN materias m ON m.id_materia = am.id_materia
         WHERE m.id_carrera = ?`,
        [id_carrera]
      );
      // Mapeos (por carrera y por materias de la carrera)
      await conn.execute("DELETE FROM materia_atributo WHERE id_carrera = ?", [
        id_carrera,
      ]);
      await conn.execute(
        `DELETE ma FROM materia_atributo ma
          JOIN materias m ON m.id_materia = ma.id_materia
         WHERE m.id_carrera = ?`,
        [id_carrera]
      );
      await conn.execute("DELETE FROM criterios WHERE id_carrera = ?", [
        id_carrera,
      ]);
      await conn.execute("DELETE FROM atributos WHERE id_carrera = ?", [
        id_carrera,
      ]);
      await conn.execute("DELETE FROM materias WHERE id_carrera = ?", [
        id_carrera,
      ]);
      await conn.execute("DELETE FROM coordinadores WHERE carrera_id = ?", [
        id_carrera,
      ]);
    } else {
      // Aun sin force, eliminamos coordinadores para permitir borrado si no hay más deps
      await conn.execute("DELETE FROM coordinadores WHERE carrera_id = ?", [
        id_carrera,
      ]);
    }

    const [del] = await conn.execute(
      "DELETE FROM carreras WHERE id_carrera = ?",
      [id_carrera]
    );
    if (del.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Carrera no encontrada" });
    }

    await conn.commit();
    res.json({ ok: true, deleted: deps, forced: force });
  } catch (e) {
    await (async () => {
      try {
        await conn.rollback();
      } catch {}
    })();
    console.error(e);
    res.status(500).json({ error: "Error al eliminar carrera" });
  } finally {
    conn.release();
  }
});

export default router;
