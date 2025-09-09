// src/application.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectToDB from "./config/dbConnect.js";
import routes from "./routes/index.js";

import "dotenv/config";

console.log("MONGO_URI:", process.env.MONGO_URI);

const app = express();

// ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* =========================
   Middlewares base
========================= */
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization', 'Location'],
}));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

/* =========================
   Arquivos estáticos (uploads)
   Se o server roda em src/, a pasta é ../uploads
========================= */
const uploadsDir = path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadsDir, {
  index: false,
  etag: true,
  maxAge: "7d",
}));

/* Ping/health */
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

/* =========================
   DB + Rotas
========================= */
connectToDB();
routes(app);

/* =========================
   Handler de erro (JSON)
========================= */
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Erro interno";
  res.status(status).json({ message });
});

export default app;
