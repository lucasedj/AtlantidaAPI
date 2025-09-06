import mongoose from "mongoose";
import { validateIssuanceDate } from "./validation.js";

const { Schema } = mongoose;

/** Subdocumento só para compat (antigo blob em base64) */
const certificateImageSchema = new Schema(
  {
    data: String,
    contentType: String,
  },
  { _id: false }
);

const certificateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },

    // Campos canônicos usados no front/controller
    certificateName: { type: String, required: true, trim: true },
    accreditor: { type: String, required: true, trim: true },
    certificationNumber: { type: String, required: true, trim: true },

    level: { type: String, trim: true },                        // (antes: certificationLevel)
    issueDate: { type: Date, validate: validateIssuanceDate },  // (antes: issuanceDate)
    expiryDate: { type: Date },                                  // (antes: expirationDate)

    // Caminho/URL do arquivo salvo (ex.: "/uploads/123.jpg")
    fileUrl: { type: String, trim: true },

    // Metadados opcionais do upload
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },

    // ---- Campos legados (mantidos p/ leitura), ocultos por padrão ----
    certificationLevel: { type: String, select: false },
    issuanceDate: { type: Date, select: false },
    expirationDate: { type: Date, select: false },
    certificateImage: {
      type: certificateImageSchema,
      select: false, // ← agora é opção do **path**, não campo do subdocumento
    },
  },
  { timestamps: true }
);

// Fallback: se vierem campos legados, copia para os novos
certificateSchema.pre("validate", function (next) {
  if (!this.level && this.certificationLevel) this.level = this.certificationLevel;
  if (!this.issueDate && this.issuanceDate) this.issueDate = this.issuanceDate;
  if (!this.expiryDate && this.expirationDate) this.expiryDate = this.expirationDate;
  next();
});

// JSON limpo
certificateSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    // não expõe blob legado
    delete ret.certificateImage;
    return ret;
  },
});

// Evita OverwriteModelError em dev
const Certificate =
  mongoose.models.certificates || mongoose.model("certificates", certificateSchema);

export default Certificate;
