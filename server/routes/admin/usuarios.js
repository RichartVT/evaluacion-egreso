import { Router } from "express";
import { pool } from "../../db.js";
import bcrypt from "bcrypt";

const router = Router();

// GET /api/admin/usuarios - Listar usuarios con filtros
router.get("/", async (req, res) => {
  try {
    const { rol, search } = req.query;
    let sql = `
      SELECT u.id_usuario, u.email, u.nombre, r.nombre as rol_nombre, r.clave as rol_clave,
             c.carrera_id, car.nom_carrera
      FROM usuarios u 
      JOIN roles r ON u.rol_id = r.id_rol
      LEFT JOIN coordinadores c ON u.id_usuario = c.usuario_id
      LEFT JOIN carreras car ON c.carrera_id = car.id_carrera
    `;
    const params = [];
    const conditions = [];

    if (rol) {
      conditions.push("r.clave = ?");
      params.push(rol);
    }
    if (search) {
      conditions.push("(u.nombre LIKE ? OR u.email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY u.nombre";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// POST /api/admin/usuarios - Crear usuario
router.post("/", async (req, res) => {
  try {
    const { email, nombre, rol_clave, carrera_id } = req.body;
    
    if (!email || !nombre || !rol_clave) {
      return res.status(400).json({ error: "Email, nombre y rol son requeridos" });
    }

    const [[rol]] = await pool.query("SELECT id_rol FROM roles WHERE clave = ?", [rol_clave]);
    if (!rol) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [userResult] = await conn.execute(
        "INSERT INTO usuarios (email, password_hash, nombre, rol_id) VALUES (?, ?, ?, ?)",
        [email, passwordHash, nombre, rol.id_rol]
      );

      if (rol_clave === "COORDINADOR" && carrera_id) {
        await conn.execute(
          "INSERT INTO coordinadores (usuario_id, carrera_id) VALUES (?, ?)",
          [userResult.insertId, carrera_id]
        );
      }

      await conn.commit();
      res.status(201).json({ 
        ok: true, 
        id_usuario: userResult.insertId,
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
      return res.status(409).json({ error: "El email ya existe" });
    }
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// DELETE /api/admin/usuarios/:id
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute("DELETE FROM coordinadores WHERE usuario_id = ?", [userId]);
      await conn.execute("DELETE FROM estudiantes WHERE usuario_id = ?", [userId]);
      
      const [deleteResult] = await conn.execute("DELETE FROM usuarios WHERE id_usuario = ?", [userId]);
      
      if (deleteResult.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

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
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// POST /api/admin/usuarios/:id/reset-password
router.post("/:id/reset-password", async (req, res) => {
  try {
    const userId = req.params.id;
    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [result] = await pool.execute(
      "UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?",
      [passwordHash, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ ok: true, temp_password: tempPassword });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al resetear contraseña" });
  }
});

export default router;