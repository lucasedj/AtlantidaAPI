import mongoose from 'mongoose';

const connectToDB = async () => {
  const uri = (process.env.MONGO_URI ?? process.env.MONGODB_URI) || 'mongodb://localhost:27017/mongodb-atlantida';
  if (!uri) throw new Error("MONGO_URI não definida no .env");

  // Desativa buffer para falhar rápido (em vez de "buffering timed out")
  mongoose.set("bufferCommands", false);

  // logs úteis
  mongoose.connection.on("connected", () => console.log("✅ Mongo conectado"));
  mongoose.connection.on("error", (e) => console.error("❌ Mongo error:", e));
  mongoose.connection.on("disconnected", () => console.warn("⚠️ Mongo desconectado"));

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      // dbName: "atlantida", // use se a sua URI não tiver o db no final
    });
    console.log('Conectado ao MongoDB!');
  } catch (error) {
    console.error('Erro na conexão com o MongoDB:', error);
  }
};

export default connectToDB;
