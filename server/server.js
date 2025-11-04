// server/server.js
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Routers (asegúrate de que existan estos archivos)
import authRouter from "./routes/auth.js";
import materiasRouter from "./routes/materias.js";
import atributosRouter from "./routes/atributos.js";
import criteriosRouter from "./routes/criterios.js";
import nivelesMateriaRouter from "./routes/niveles_materia.js";
import carrerasRouter from "./routes/carreras.js"; // si no lo usas, puedes quitar esta línea

// Middleware de autorización
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();

// __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares base
app.use(express.json());
app.use(cookieParser());

// Archivos estáticos (sirve /public)
app.use(express.static(path.resolve(__dirname, "../public")));

// Rutas públicas
app.use("/api/auth", authRouter);

// Rutas protegidas (COORDINADOR / ADMIN)
app.use("/api/materias", requireAuth(["COORDINADOR", "ADMIN"]), materiasRouter);
app.use(
  "/api/atributos",
  requireAuth(["COORDINADOR", "ADMIN"]),
  atributosRouter
);
app.use(
  "/api/criterios",
  requireAuth(["COORDINADOR", "ADMIN"]),
  criteriosRouter
);
app.use(
  "/api/niveles-materia",
  requireAuth(["COORDINADOR", "ADMIN"]),
  nivelesMateriaRouter
);

// (Opcional) Carreras pública para selects; si quieres protegerla, muévela arriba con requireAuth
app.use("/api/carreras", carrerasRouter);

// Fallback simple (opcional)
app.get("/coordinador/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/coordinador/index.html"));
});

// Arranque
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
