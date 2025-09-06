// src/config/dbConnect.js
import mongoose from 'mongoose';

const connectToDB = async () => {
  // aceita tanto MONGO_URI quanto MONGODB_URI
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/atlantida';

  if (!uri) {
    throw new Error("❌ Nenhuma URI do MongoDB encontrada. Defina MONGO_URI ou MONGODB_URI no .env");
  }

  // evitar buffering de queries
  mongoose.set("bufferCommands", false);

  // logs úteis
  mongoose.connection.on("connected", () => console.log("✅ Mongo conectado"));
  mongoose.connection.on("error", (e) => console.error("❌ Erro Mongo:", e.message));
  mongoose.connection.on("disconnected", () => console.warn("⚠️ Mongo desconectado"));

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      // dbName: "atlantida", // descomente se a sua URI não contiver o nome do banco
    });
    console.log(`🌊 Conectado ao MongoDB em ${uri}`);
  } catch (error) {
    console.error('❌ Falha ao conectar no MongoDB:', error.message);
    throw error;
  }
};

export default connectToDB;
