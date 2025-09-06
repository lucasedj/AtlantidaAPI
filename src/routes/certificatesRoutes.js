// src/routes/certificatesRoutes.js
import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

import CertificatesController from "../controllers/certificatesController.js";
import { bearer } from "../middleware/autenticationMiddleware.js";

const certificatesRoutes = express.Router();

/* =========================
   Upload de arquivos (multer)
   Salva em <raiz-do-projeto>/uploads
========================= */
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = /^(image\/(png|jpe?g|gif|webp|bmp)|application\/pdf)$/i.test(file.mimetype);
  cb(ok ? null : new Error("Tipo de arquivo não suportado"), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/* =========================
   Rotas
========================= */
certificatesRoutes
  .get("/api/certificates/:id", bearer, CertificatesController.findCertificateById)
  .get("/api/certificates", bearer, CertificatesController.findCertificateByToken)
  .post("/api/certificates/expired", bearer, CertificatesController.findExpiredCertificates)
  // campo do arquivo DEVE chamar "file"
  .post("/api/certificates", bearer, upload.single("file"), CertificatesController.createCertificate)
  .put("/api/certificates/:id", bearer, upload.single("file"), CertificatesController.updateCertificate)
  .delete("/api/certificates/:id", bearer, CertificatesController.deleteCertificate);

export default certificatesRoutes;
