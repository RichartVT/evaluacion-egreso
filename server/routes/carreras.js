import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/carreras -> lista todas las carreras
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_carrera, nom_carrera FROM carreras ORDER BY id_carrera"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudieron obtener carreras" });
  }
});

export default router;
