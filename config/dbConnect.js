// config/dbConnect.js
import mongoose from "mongoose";

export default async function connectToDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI não definida no .env");

  // Desativa buffer para falhar rápido (em vez de "buffering timed out")
  mongoose.set("bufferCommands", false);

  // logs úteis
  mongoose.connection.on("connected", () => console.log("✅ Mongo conectado"));
  mongoose.connection.on("error", (e) => console.error("❌ Mongo error:", e));
  mongoose.connection.on("disconnected", () => console.warn("⚠️ Mongo desconectado"));

  // timeouts curtos ajudam a ver erro real
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000,
    // dbName: "atlantida", // use se a sua URI não tiver o db no final
  });
}
