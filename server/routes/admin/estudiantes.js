// server/routes/admin/estudiantes.js
import { Router } from "express";
import { pool } from "../../db.js";
import bcrypt from "bcrypt";

const router = Router();

// GET /api/admin/estudiantes - Listar estudiantes con filtros
router.get("/", async (req, res) => {
  try {
    const { carrera, search, active } = req.query;
    
    let sql = `
      SELECT 
        e.id_estudiante, 
        e.nombre, 
        u.email,
        u.id_usuario,
        CASE 
          WHEN u.id_usuario IS NOT NULL THEN 'Activo'
          ELSE 'Inactivo'
        END as estado,
        (SELECT COUNT(DISTINCT id_materia, periodo) FROM respuestas WHERE id_estudiante = e.id_estudiante) as evaluaciones_completadas,
        (SELECT MAX(STR_TO_DATE(CONCAT(periodo, '/01'), '%Y/%m/%d')) FROM respuestas WHERE id_estudiante = e.id_estudiante) as ultima_actividad
      FROM estudiantes e
      LEFT JOIN usuarios u ON e.usuario_id = u.id_usuario
    `;
    
    const conditions = [];
    const params = [];

    // Filtrar por carrera (basado en evaluaciones del estudiante)
    if (carrera) {
      sql = `
        SELECT DISTINCT
          e.id_estudiante, 
          e.nombre, 
          u.email,
          u.id_usuario,
          CASE 
            WHEN u.id_usuario IS NOT NULL THEN 'Activo'
            ELSE 'Inactivo'
          END as estado,
          (SELECT COUNT(DISTINCT id_materia, periodo) FROM respuestas WHERE id_estudiante = e.id_estudiante) as evaluaciones_completadas,
          (SELECT MAX(STR_TO_DATE(CONCAT(periodo, '/01'), '%Y/%m/%d')) FROM respuestas WHERE id_estudiante = e.id_estudiante) as ultima_actividad
        FROM estudiantes e
        LEFT JOIN usuarios u ON e.usuario_id = u.id_usuario
        INNER JOIN respuestas r ON e.id_estudiante = r.id_estudiante
        WHERE r.id_carrera = ?
      `;
      params.push(carrera);
    }

    // Filtro de búsqueda
    if (search) {
      const searchCondition = carrera ? " AND " : " WHERE ";
      sql += searchCondition + "(e.nombre LIKE ? OR e.id_estudiante LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filtro por estado
    if (active !== undefined) {
      const activeCondition = (carrera || search) ? " AND " : " WHERE ";
      if (active === 'true') {
        sql += activeCondition + "u.id_usuario IS NOT NULL";
      } else if (active === 'false') {
        sql += activeCondition + "u.id_usuario IS NULL";
      }
    }

    sql += " ORDER BY e.nombre";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener estudiantes" });
  }
});

// GET /api/admin/estudiantes/stats - Estadísticas generales (DEBE IR ANTES que /:id)
router.get("/stats", async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_estudiantes,
        COUNT(usuario_id) as con_cuenta,
        COUNT(*) - COUNT(usuario_id) as sin_cuenta,
        (SELECT COUNT(DISTINCT id_estudiante) FROM respuestas) as con_evaluaciones
      FROM estudiantes
    `);

    res.json(stats[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// GET /api/admin/estudiantes/:id - Obtener detalle de estudiante
router.get("/:id", async (req, res) => {
  try {
    const id_estudiante = req.params.id;
    
    const [[estudiante]] = await pool.query(`
      SELECT 
        e.id_estudiante, 
        e.nombre, 
        u.email,
        u.id_usuario,
        u.nombre as usuario_nombre
      FROM estudiantes e
      LEFT JOIN usuarios u ON e.usuario_id = u.id_usuario
      WHERE e.id_estudiante = ?
    `, [id_estudiante]);

    if (!estudiante) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    // Obtener estadísticas de evaluaciones
    const [evaluaciones] = await pool.query(`
      SELECT 
        r.id_carrera,
        c.nom_carrera,
        COUNT(DISTINCT CONCAT(r.id_materia, '-', r.periodo)) as materias_evaluadas,
        COUNT(DISTINCT r.periodo) as periodos,
        MAX(r.periodo) as ultimo_periodo
      FROM respuestas r
      JOIN carreras c ON r.id_carrera = c.id_carrera
      WHERE r.id_estudiante = ?
      GROUP BY r.id_carrera, c.nom_carrera
    `, [id_estudiante]);

    res.json({
      estudiante,
      evaluaciones
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener detalles del estudiante" });
  }
});

// POST /api/admin/estudiantes - Crear estudiante individual
router.post("/", async (req, res) => {
  try {
    const { id_estudiante, nombre, email = null } = req.body;
    
    if (!id_estudiante || !nombre) {
      return res.status(400).json({ error: "ID de estudiante y nombre son requeridos" });
    }

    // Validar formato de número de control TecNM
    if (!/^\d{8,9}$/.test(id_estudiante)) {
      return res.status(400).json({ error: "Formato de número de control inválido (8-9 dígitos)" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let userId = null;
      
      // Si se proporciona email o se genera automático, crear usuario
      const studentEmail = email || `${id_estudiante}@itcelaya.edu.mx`;
      
      // Generar contraseña temporal
      const tempPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Obtener rol_id de ALUMNO
      const [[rolAlumno]] = await conn.query("SELECT id_rol FROM roles WHERE clave = 'ALUMNO'");
      const rolId = rolAlumno ? rolAlumno.id_rol : 3;

      // Crear usuario
      const [userResult] = await conn.execute(
        "INSERT INTO usuarios (email, password_hash, nombre, rol_id) VALUES (?, ?, ?, ?)",
        [studentEmail, passwordHash, nombre, rolId]
      );
      userId = userResult.insertId;

      // Crear estudiante
      await conn.execute(
        "INSERT INTO estudiantes (id_estudiante, nombre, usuario_id) VALUES (?, ?, ?)",
        [id_estudiante, nombre, userId]
      );

      await conn.commit();
      
      res.status(201).json({ 
        ok: true, 
        id_estudiante,
        email: studentEmail,
        temp_password: tempPassword 
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un estudiante con ese número de control" });
    }
    res.status(500).json({ error: "Error al crear estudiante" });
  }
});

// POST /api/admin/estudiantes/import - Importación masiva desde CSV/Excel
router.post("/import", async (req, res) => {
  try {
    const { estudiantes } = req.body;
    
    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de estudiantes" });
    }

    const conn = await pool.getConnection();
    const results = {
      created: 0,
      updated: 0,
      errors: [],
      passwords: []
    };

    try {
      await conn.beginTransaction();

      // Obtener rol_id de ALUMNO
      const [[rolAlumno]] = await conn.query("SELECT id_rol FROM roles WHERE clave = 'ALUMNO'");
      const rolId = rolAlumno ? rolAlumno.id_rol : 3;

      for (const [index, est] of estudiantes.entries()) {
        try {
          const { id_estudiante, nombre, email } = est;
          
          if (!id_estudiante || !nombre) {
            results.errors.push(`Fila ${index + 1}: Faltan datos requeridos`);
            continue;
          }

          // Validar formato
          if (!/^\d{8,9}$/.test(id_estudiante)) {
            results.errors.push(`Fila ${index + 1}: Formato de control inválido`);
            continue;
          }

          const studentEmail = email || `${id_estudiante}@itcelaya.edu.mx`;
          const tempPassword = Math.random().toString(36).slice(-10);
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          // Verificar si ya existe
          const [[existingStudent]] = await conn.query(
            "SELECT id_estudiante, usuario_id FROM estudiantes WHERE id_estudiante = ?",
            [id_estudiante]
          );

          if (existingStudent) {
            // Actualizar existente
            if (existingStudent.usuario_id) {
              await conn.execute(
                "UPDATE usuarios SET nombre = ?, email = ? WHERE id_usuario = ?",
                [nombre, studentEmail, existingStudent.usuario_id]
              );
            } else {
              // Crear usuario para estudiante existente sin usuario
              const [userResult] = await conn.execute(
                "INSERT INTO usuarios (email, password_hash, nombre, rol_id) VALUES (?, ?, ?, ?)",
                [studentEmail, passwordHash, nombre, rolId]
              );
              
              await conn.execute(
                "UPDATE estudiantes SET usuario_id = ? WHERE id_estudiante = ?",
                [userResult.insertId, id_estudiante]
              );
              
              results.passwords.push({ id_estudiante, email: studentEmail, password: tempPassword });
            }
            
            await conn.execute(
              "UPDATE estudiantes SET nombre = ? WHERE id_estudiante = ?",
              [nombre, id_estudiante]
            );
            results.updated++;
          } else {
            // Crear nuevo
            const [userResult] = await conn.execute(
              "INSERT INTO usuarios (email, password_hash, nombre, rol_id) VALUES (?, ?, ?, ?)",
              [studentEmail, passwordHash, nombre, rolId]
            );

            await conn.execute(
              "INSERT INTO estudiantes (id_estudiante, nombre, usuario_id) VALUES (?, ?, ?)",
              [id_estudiante, nombre, userResult.insertId]
            );
            
            results.created++;
            results.passwords.push({ id_estudiante, email: studentEmail, password: tempPassword });
          }
        } catch (error) {
          results.errors.push(`Fila ${index + 1}: ${error.message}`);
        }
      }

      await conn.commit();
      res.json(results);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error en importación masiva" });
  }
});

// PUT /api/admin/estudiantes/:id - Actualizar estudiante
router.put("/:id", async (req, res) => {
  try {
    const id_estudiante = req.params.id;
    const { nombre } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: "Nombre es requerido" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [updateResult] = await conn.execute(
        "UPDATE estudiantes SET nombre = ? WHERE id_estudiante = ?",
        [nombre, id_estudiante]
      );

      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Estudiante no encontrado" });
      }

      // Actualizar también el nombre en usuarios si existe
      await conn.execute(`
        UPDATE usuarios u
        INNER JOIN estudiantes e ON u.id_usuario = e.usuario_id
        SET u.nombre = ?
        WHERE e.id_estudiante = ?
      `, [nombre, id_estudiante]);

      await conn.commit();
      res.json({ ok: true });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al actualizar estudiante" });
  }
});

// DELETE /api/admin/estudiantes/:id - Eliminar estudiante
router.delete("/:id", async (req, res) => {
  try {
    const id_estudiante = req.params.id;
    const force = req.query.force === "1";

    const conn = await pool.getConnection();
    try {
      // Verificar dependencias
      const [[deps]] = await conn.query(`
        SELECT 
          (SELECT COUNT(*) FROM respuestas WHERE id_estudiante = ?) as respuestas
      `, [id_estudiante]);

      if (!force && deps.respuestas > 0) {
        return res.status(409).json({
          error: "Estudiante con evaluaciones",
          detail: `El estudiante tiene ${deps.respuestas} respuestas registradas.`,
          counts: deps,
          code: "DEPENDENCIES_FOUND"
        });
      }

      await conn.beginTransaction();

      // Obtener usuario_id antes de eliminar
      const [[estudiante]] = await conn.query(
        "SELECT usuario_id FROM estudiantes WHERE id_estudiante = ?",
        [id_estudiante]
      );

      if (!estudiante) {
        await conn.rollback();
        return res.status(404).json({ error: "Estudiante no encontrado" });
      }

      // Eliminar respuestas si hay
      if (deps.respuestas > 0) {
        await conn.execute("DELETE FROM respuestas WHERE id_estudiante = ?", [id_estudiante]);
      }

      // Eliminar estudiante
      await conn.execute("DELETE FROM estudiantes WHERE id_estudiante = ?", [id_estudiante]);

      // Eliminar usuario asociado si existe
      if (estudiante.usuario_id) {
        await conn.execute("DELETE FROM usuarios WHERE id_usuario = ?", [estudiante.usuario_id]);
      }

      await conn.commit();
      res.json({ ok: true, deleted: deps });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al eliminar estudiante" });
  }
});

// POST /api/admin/estudiantes/:id/reset-password - Reset contraseña de estudiante
router.post("/:id/reset-password", async (req, res) => {
  try {
    const id_estudiante = req.params.id;
    
    const [[estudiante]] = await pool.query(`
      SELECT e.nombre, u.email, u.id_usuario
      FROM estudiantes e
      LEFT JOIN usuarios u ON e.usuario_id = u.id_usuario
      WHERE e.id_estudiante = ?
    `, [id_estudiante]);

    if (!estudiante) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    if (!estudiante.id_usuario) {
      return res.status(400).json({ error: "Estudiante no tiene cuenta de usuario activa" });
    }

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await pool.execute(
      "UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?",
      [passwordHash, estudiante.id_usuario]
    );

    res.json({ 
      ok: true, 
      temp_password: tempPassword,
      email: estudiante.email 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al resetear contraseña" });
  }
});

export default router;