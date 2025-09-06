// src/controllers/certificatesController.js
import { promises as fs } from "fs";
import path from "path";
import CertificatesService from "../services/certificatesService.js";
import TokenService from "../services/tokenService.js";

// Pasta onde os arquivos serão salvos (raiz do projeto)
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

/* ========= Helpers ========= */
function getUserIdFromReq(req) {
  // bearer já injeta o usuário aqui
  const fromReq = req.user?.id || req.user?._id;
  if (fromReq) return String(fromReq);
  // fallback pelo header Authorization
  try {
    return TokenService.returnUserIdFromHeader(req.headers.authorization || "");
  } catch {
    return null;
  }
}

function normDate(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d) ? undefined : d;
}

function mapBody(body = {}) {
  // front -> schema
  const certificateName = body.certificateName ?? body.name ?? "";
  const accreditor = body.accreditor ?? body.agency ?? "";
  const certificationNumber = body.certificationNumber ?? body.number ?? "";

  return {
    certificateName,
    accreditor,
    certificationNumber,
    level: body.level || undefined,
    issueDate: normDate(body.issueDate),
    expiryDate: normDate(body.expiryDate),
  };
}

// Salva arquivo quando usar memoryStorage
async function saveFromBuffer(file) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const byName = (file.originalname || "").match(/\.[a-zA-Z0-9]+$/)?.[0] || "";
  const byMime =
    {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "application/pdf": ".pdf",
    }[file.mimetype] || "";
  const ext = byName || byMime || "";

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
}

// Retorna a URL pública considerando diskStorage (preferido) ou memoryStorage (fallback)
async function getFileUrl(file) {
  if (!file) return null;

  // Caso DISK STORAGE (multer.diskStorage): já existe filename/path
  if (file.filename) {
    return `/uploads/${file.filename}`;
  }

  // Caso MEMORY STORAGE: precisamos gravar manualmente
  if (file.buffer) {
    return saveFromBuffer(file);
  }

  // Não foi possível determinar
  return null;
}

/* ========= Controller ========= */
class CertificatesController {
  static async findCertificateById(req, res) {
    try {
      const foundCertificate = await CertificatesService.findCertificateById(req.params.id);
      if (!foundCertificate) {
        return res.status(404).json({ message: "Certificado não encontrado" });
      }
      return res.status(200).json(foundCertificate);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  static async findCertificateByToken(req, res) {
    try {
      const userId = getUserIdFromReq(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const certificates = await CertificatesService.findCertificateByUserId(userId);
      return res.status(200).json(certificates);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  static async findExpiredCertificates(req, res) {
    try {
      const userId = getUserIdFromReq(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const expiredCertificates = await CertificatesService.findExpiredCertificates(userId);
      return res.status(200).json(expiredCertificates);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async createCertificate(req, res) {
    try {
      const userId = getUserIdFromReq(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const mapped = mapBody(req.body);
      // valida obrigatórios
      if (!mapped.certificateName || !mapped.accreditor || !mapped.certificationNumber) {
        return res.status(400).json({
          message: "certificateName, accreditor e certificationNumber são obrigatórios",
        });
      }

      const fileUrl = await getFileUrl(req.file);

      const newCertificate = await CertificatesService.createCertificate({
        userId,
        ...mapped,
        ...(fileUrl ? { fileUrl } : {}),
        // metadados do arquivo (opcional)
        ...(req.file
          ? {
              originalName: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size,
            }
          : {}),
      });

      return res
        .status(201)
        .set("Location", `/api/certificates/${newCertificate._id}`)
        .json(newCertificate);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async updateCertificate(req, res) {
    try {
      const mapped = mapBody(req.body);
      const fileUrl = await getFileUrl(req.file);

      const payload = {
        ...mapped,
        ...(fileUrl ? { fileUrl } : {}),
        ...(req.file
          ? {
              originalName: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size,
            }
          : {}),
      };

      const updatedCertificate = await CertificatesService.updateCertificate(req.params.id, payload);
      if (!updatedCertificate) {
        return res.status(404).json({ message: "Certificado não encontrado" });
      }
      return res.status(200).json(updatedCertificate);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async deleteCertificate(req, res) {
    try {
      await CertificatesService.deleteCertificate(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export default CertificatesController;
