import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import carrerasRouter from "./routes/carreras.js";
import materiasRouter from "./routes/materias.js";
import atributosRouter from "./routes/atributos.js";
import criteriosRouter from "./routes/criterios.js";
import nivelesMateriaRouter from "./routes/niveles_materia.js";

dotenv.config();
const app = express();

app.use(express.json());

// servir frontend estático
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir));

// API
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use("/api/carreras", carrerasRouter);
app.use("/api/materias", materiasRouter);
app.use("/api/atributos", atributosRouter);
app.use("/api/criterios", criteriosRouter);
app.use("/api/niveles-materia", nivelesMateriaRouter);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
