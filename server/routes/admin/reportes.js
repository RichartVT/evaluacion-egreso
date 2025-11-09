// server/routes/admin/reportes.js
import { Router } from "express";
import { pool } from "../../db.js";

const router = Router();

// GET /api/admin/reportes/dashboard - Estadísticas generales para dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const [generalStats] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM carreras) as total_carreras,
        (SELECT COUNT(*) FROM estudiantes) as total_estudiantes,
        (SELECT COUNT(*) FROM materias) as total_materias,
        (SELECT COUNT(*) FROM atributos) as total_atributos,
        (SELECT COUNT(DISTINCT id_estudiante, id_materia, periodo) FROM respuestas) as total_evaluaciones,
        (SELECT COUNT(DISTINCT periodo) FROM respuestas) as periodos_activos,
        (SELECT MAX(periodo) FROM respuestas) as ultimo_periodo
    `);

    res.json(generalStats[0] || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener estadísticas del dashboard" });
  }
});

// GET /api/admin/reportes/usuarios-por-rol - Distribución de usuarios por rol
router.get("/usuarios-por-rol", async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        r.nombre as rol,
        r.clave as rol_clave,
        COUNT(u.id_usuario) as cantidad
      FROM roles r
      LEFT JOIN usuarios u ON r.id_rol = u.rol_id
      GROUP BY r.id_rol, r.nombre, r.clave
      ORDER BY cantidad DESC
    `);

    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener distribución de usuarios" });
  }
});

// GET /api/admin/reportes/carreras-stats - Estadísticas por carrera
router.get("/carreras-stats", async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        c.id_carrera,
        c.nom_carrera,
        (SELECT COUNT(*) FROM materias WHERE id_carrera = c.id_carrera) as materias,
        (SELECT COUNT(*) FROM atributos WHERE id_carrera = c.id_carrera) as atributos,
        (SELECT COUNT(DISTINCT r.id_estudiante) FROM respuestas r WHERE r.id_carrera = c.id_carrera) as estudiantes_activos,
        (SELECT COUNT(DISTINCT CONCAT(r.id_materia, '-', r.periodo)) FROM respuestas r WHERE r.id_carrera = c.id_carrera) as evaluaciones_completadas,
        (SELECT u.nombre FROM coordinadores coord 
         JOIN usuarios u ON coord.usuario_id = u.id_usuario 
         WHERE coord.carrera_id = c.id_carrera LIMIT 1) as coordinador
      FROM carreras c
      ORDER BY c.nom_carrera
    `);

    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener estadísticas por carrera" });
  }
});

// GET /api/admin/reportes/evaluaciones-por-periodo - Evaluaciones por período
router.get("/evaluaciones-por-periodo", async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        periodo,
        COUNT(DISTINCT id_estudiante) as estudiantes_unicos,
        COUNT(DISTINCT CONCAT(id_estudiante, '-', id_materia)) as evaluaciones_materias,
        COUNT(*) as respuestas_total,
        COUNT(DISTINCT id_carrera) as carreras_activas
      FROM respuestas
      GROUP BY periodo
      ORDER BY periodo DESC
      LIMIT 12
    `);

    res.json(stats.reverse()); // Invertir para mostrar cronológicamente
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener evaluaciones por período" });
  }
});

// GET /api/admin/reportes/atributos-mas-evaluados - Atributos más evaluados
router.get("/atributos-mas-evaluados", async (req, res) => {
  try {
    const { carrera } = req.query;
    
    let sql = `
      SELECT 
        a.id_carrera,
        c.nom_carrera,
        a.id_atributo,
        a.nomcorto,
        a.nom_atributo,
        COUNT(DISTINCT r.id_estudiante) as estudiantes_evaluados,
        COUNT(DISTINCT CONCAT(r.id_materia, '-', r.periodo)) as evaluaciones_completadas,
        COUNT(*) as respuestas_total,
        AVG(r.likert) as promedio_likert
      FROM atributos a
      JOIN carreras c ON a.id_carrera = c.id_carrera
      LEFT JOIN respuestas r ON a.id_carrera = r.id_carrera AND a.id_atributo = r.id_atributo
    `;

    const params = [];
    if (carrera) {
      sql += " WHERE a.id_carrera = ?";
      params.push(carrera);
    }

    sql += `
      GROUP BY a.id_carrera, c.nom_carrera, a.id_atributo, a.nomcorto, a.nom_atributo
      ORDER BY respuestas_total DESC, promedio_likert DESC
      LIMIT 20
    `;

    const [stats] = await pool.query(sql, params);
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener atributos más evaluados" });
  }
});

// GET /api/admin/reportes/actividad-reciente - Actividad reciente del sistema
router.get("/actividad-reciente", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Esta es una simulación ya que no tenemos logs reales
    // En un sistema real, tendrías una tabla de logs/auditoría
    const [activity] = await pool.query(`
      (SELECT 
        'evaluacion' as tipo,
        CONCAT('Evaluación completada en ', m.nom_materia) as accion,
        e.nombre as usuario,
        r.periodo as detalles,
        STR_TO_DATE(CONCAT(r.periodo, '/01'), '%Y/%m/%d') as fecha
      FROM respuestas r
      JOIN estudiantes e ON r.id_estudiante = e.id_estudiante
      JOIN materias m ON r.id_materia = m.id_materia
      ORDER BY STR_TO_DATE(CONCAT(r.periodo, '/01'), '%Y/%m/%d') DESC
      LIMIT 10)
      
      UNION ALL
      
      (SELECT 
        'usuario' as tipo,
        CONCAT('Usuario registrado: ', r.nombre) as accion,
        'Sistema' as usuario,
        CONCAT('Rol: ', ro.nombre) as detalles,
        NOW() as fecha
      FROM usuarios r
      JOIN roles ro ON r.rol_id = ro.id_rol
      ORDER BY r.id_usuario DESC
      LIMIT 10)
      
      ORDER BY fecha DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json(activity);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener actividad reciente" });
  }
});

// GET /api/admin/reportes/rendimiento-materias - Rendimiento por materias
router.get("/rendimiento-materias", async (req, res) => {
  try {
    const { carrera } = req.query;
    
    let sql = `
      SELECT 
        m.id_materia,
        m.nom_materia,
        c.nom_carrera,
        COUNT(DISTINCT r.id_estudiante) as estudiantes_evaluados,
        COUNT(DISTINCT r.periodo) as periodos_evaluados,
        COUNT(*) as respuestas_total,
        AVG(r.likert) as promedio_general,
        MIN(r.likert) as calificacion_minima,
        MAX(r.likert) as calificacion_maxima,
        (SELECT COUNT(*) FROM materia_atributo WHERE id_materia = m.id_materia) as atributos_asignados
      FROM materias m
      JOIN carreras c ON m.id_carrera = c.id_carrera
      LEFT JOIN respuestas r ON m.id_materia = r.id_materia
    `;

    const params = [];
    if (carrera) {
      sql += " WHERE m.id_carrera = ?";
      params.push(carrera);
    }

    sql += `
      GROUP BY m.id_materia, m.nom_materia, c.nom_carrera
      HAVING respuestas_total > 0
      ORDER BY promedio_general DESC, respuestas_total DESC
      LIMIT 30
    `;

    const [stats] = await pool.query(sql, params);
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener rendimiento de materias" });
  }
});

// GET /api/admin/reportes/export/:tipo - Exportar reportes (placeholder)
router.get("/export/:tipo", async (req, res) => {
  try {
    const { tipo } = req.params;
    
    // Placeholder para exportación
    // En un sistema real, aquí generarías CSV, Excel o PDF
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `reporte_${tipo}_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // CSV básico de ejemplo
    let csvContent = '';
    
    switch (tipo) {
      case 'usuarios':
        const [usuarios] = await pool.query(`
          SELECT u.email, u.nombre, r.nombre as rol
          FROM usuarios u
          JOIN roles r ON u.rol_id = r.id_rol
          ORDER BY u.nombre
        `);
        
        csvContent = 'Email,Nombre,Rol\n';
        csvContent += usuarios.map(u => `"${u.email}","${u.nombre}","${u.rol}"`).join('\n');
        break;
        
      case 'carreras':
        const [carreras] = await pool.query(`
          SELECT c.id_carrera, c.nom_carrera,
                 (SELECT COUNT(*) FROM materias WHERE id_carrera = c.id_carrera) as materias,
                 (SELECT COUNT(*) FROM atributos WHERE id_carrera = c.id_carrera) as atributos
          FROM carreras c
          ORDER BY c.nom_carrera
        `);
        
        csvContent = 'ID,Nombre,Materias,Atributos\n';
        csvContent += carreras.map(c => `"${c.id_carrera}","${c.nom_carrera}",${c.materias},${c.atributos}`).join('\n');
        break;
        
      default:
        csvContent = 'Tipo de reporte no disponible\n';
    }
    
    res.send(csvContent);
    
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al exportar reporte" });
  }
});

// Agregar estos endpoints al archivo server/routes/admin/reportes.js

// GET /api/admin/reportes/distribucion-likert - Distribución de respuestas por nivel Likert
router.get("/distribucion-likert", async (req, res) => {
  try {
    const { carrera } = req.query;
    
    let sql = `
      SELECT 
        likert,
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / (
          SELECT COUNT(*) FROM respuestas r2 ${carrera ? 'WHERE r2.id_carrera = ?' : ''}
        )), 2) as porcentaje
      FROM respuestas r
    `;

    const params = [];
    if (carrera) {
      sql += " WHERE r.id_carrera = ?";
      params.push(carrera);
      params.push(carrera); // Para el subquery también
    }

    sql += `
      GROUP BY likert
      ORDER BY likert
    `;

    const [stats] = await pool.query(sql, params);
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener distribución Likert" });
  }
});

// GET /api/admin/reportes/evolucion-desempeno - Evolución del desempeño por atributo a través del tiempo
router.get("/evolucion-desempeno", async (req, res) => {
  try {
    const { carrera } = req.query;
    
    let sql = `
      SELECT 
        a.id_atributo,
        a.nomcorto,
        a.nom_atributo,
        r.periodo,
        AVG(r.likert) as promedio,
        COUNT(*) as respuestas,
        COUNT(DISTINCT r.id_estudiante) as estudiantes
      FROM atributos a
      INNER JOIN respuestas r ON a.id_carrera = r.id_carrera AND a.id_atributo = r.id_atributo
    `;
    
    const params = [];
    if (carrera) {
      sql += " WHERE a.id_carrera = ?";
      params.push(carrera);
    }
    
    sql += `
      GROUP BY a.id_atributo, a.nomcorto, a.nom_atributo, r.periodo
      ORDER BY a.id_atributo, r.periodo
    `;
    
    const [results] = await pool.query(sql, params);
    
    // Agrupar resultados por atributo
    const atributosMap = new Map();
    
    results.forEach(row => {
      if (!atributosMap.has(row.id_atributo)) {
        atributosMap.set(row.id_atributo, {
          id_atributo: row.id_atributo,
          nomcorto: row.nomcorto,
          nom_atributo: row.nom_atributo,
          data: []
        });
      }
      
      atributosMap.get(row.id_atributo).data.push({
        periodo: row.periodo,
        promedio: parseFloat(row.promedio),
        respuestas: row.respuestas,
        estudiantes: row.estudiantes
      });
    });
    
    // Convertir Map a Array y limitar a 8 atributos para el gráfico
    const evolucionData = Array.from(atributosMap.values())
      .slice(0, 8)
      .filter(attr => attr.data.length > 0); // Solo atributos con datos
    
    res.json(evolucionData);
  } catch (e) {
    console.error("Error en evolución del desempeño:", e);
    res.status(500).json({ error: "Error al obtener evolución del desempeño" });
  }
});

// GET /api/admin/reportes/top-materias-desempeno - Top materias por desempeño
router.get("/top-materias-desempeno", async (req, res) => {
  try {
    const { carrera, limit = 10 } = req.query;
    
    let sql = `
      SELECT 
        m.id_materia,
        m.nom_materia,
        c.nom_carrera,
        COUNT(DISTINCT r.id_estudiante) as estudiantes_evaluados,
        COUNT(DISTINCT r.periodo) as periodos_evaluados,
        COUNT(*) as total_respuestas,
        AVG(r.likert) as promedio_general,
        MIN(r.likert) as calificacion_minima,
        MAX(r.likert) as calificacion_maxima,
        -- Cálculo de consistencia (desviación estándar)
        ROUND(STDDEV(r.likert), 2) as desviacion_estandar,
        -- Progreso (comparación primer vs último período)
        (SELECT AVG(r2.likert) FROM respuestas r2 
         WHERE r2.id_materia = m.id_materia 
         AND r2.periodo = (SELECT MIN(r3.periodo) FROM respuestas r3 WHERE r3.id_materia = m.id_materia)
        ) as promedio_primer_periodo,
        (SELECT AVG(r2.likert) FROM respuestas r2 
         WHERE r2.id_materia = m.id_materia 
         AND r2.periodo = (SELECT MAX(r3.periodo) FROM respuestas r3 WHERE r3.id_materia = m.id_materia)
        ) as promedio_ultimo_periodo
      FROM materias m
      JOIN carreras c ON m.id_carrera = c.id_carrera
      LEFT JOIN respuestas r ON m.id_materia = r.id_materia
    `;

    const params = [];
    if (carrera) {
      sql += " WHERE m.id_carrera = ?";
      params.push(carrera);
    }

    sql += `
      GROUP BY m.id_materia, m.nom_materia, c.nom_carrera
      HAVING total_respuestas > 0
      ORDER BY promedio_general DESC, total_respuestas DESC
      LIMIT ?
    `;
    
    params.push(parseInt(limit));

    const [materias] = await pool.query(sql, params);
    
    // Calcular tendencia de mejora para cada materia
    const materiasConTendencia = materias.map(materia => {
      let tendencia = 'estable';
      if (materia.promedio_primer_periodo && materia.promedio_ultimo_periodo) {
        const diferencia = materia.promedio_ultimo_periodo - materia.promedio_primer_periodo;
        if (diferencia > 0.2) tendencia = 'mejorando';
        else if (diferencia < -0.2) tendencia = 'declinando';
      }
      
      return {
        ...materia,
        tendencia,
        mejora: materia.promedio_ultimo_periodo && materia.promedio_primer_periodo 
          ? (materia.promedio_ultimo_periodo - materia.promedio_primer_periodo).toFixed(2)
          : null
      };
    });
    
    res.json(materiasConTendencia);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al obtener top materias por desempeño" });
  }
});

export default router;