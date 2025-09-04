import app from "./src/application.js";
import "dotenv/config";

const port = process.env.PORT || 3000;

const startServer = async () => {
  app.listen(port, () => {
    console.log(`Servidor ATLANTIDA-API escutando em http://localhost:${port}`);
  });
};

startServer();
