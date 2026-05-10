import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { whatsappService } from "./whatsapp.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const PORT = 3000;

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
       console.log(`[Server] ${req.method} ${req.path}`);
    }
    next();
  });

  // WhatsApp API Routes
  app.get("/api/whatsapp/status", (req, res) => {
    res.json(whatsappService.getStatus());
  });
  
  app.post("/api/whatsapp/connect", async (req, res) => {
    try {
      await whatsappService.connect();
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[WhatsApp] Connect Error:`, error);
      const message = error.message || error.toString() || "Erro ao conectar";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/whatsapp/reset", async (req, res) => {
    try {
      await whatsappService.logout(true, true, false);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[WhatsApp] Reset Error:`, error);
      const message = error.message || error.toString() || "Erro ao reiniciar";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/whatsapp/logout", async (req, res) => {
    try {
      await whatsappService.logout(false, true, true);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[WhatsApp] Logout Error:`, error);
      const message = error.message || error.toString() || "Erro ao desconectar";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/whatsapp/add", async (req, res) => {
    const { groupName, phoneNumber } = req.body;
    try {
      console.log(`[WhatsApp] API Request: Add ${phoneNumber} to ${groupName}`);
      const result = await whatsappService.addToGroup(groupName, phoneNumber);
      res.json({ success: true, result });
    } catch (error: any) {
      console.error(`[WhatsApp] Add to Group Error for ${phoneNumber}:`, error);
      if (error.stack) console.error(error.stack);
      
      const message = error.message || error.toString() || "Erro desconhecido ao adicionar contato";
      const statusCode = error.output?.statusCode || error.status || 500;
      
      // Use the actual status code if it's a client error (4xx), otherwise 500
      const finalStatus = (statusCode >= 400 && statusCode < 500) ? statusCode : 500;
      
      res.status(finalStatus).json({ 
        success: false, 
        error: message,
        details: error.data || error.output?.payload || null,
        code: statusCode
      });
    }
  });

  app.post("/api/whatsapp/groups/create", async (req, res) => {
    const { name } = req.body;
    try {
      const groupId = await whatsappService.createGroup(name);
      res.json({ success: true, groupId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/whatsapp/groups/add-participant", async (req, res) => {
    const { groupId, phoneNumber, welcomeMessage } = req.body;
    try {
      const result = await whatsappService.addParticipant(groupId, phoneNumber, welcomeMessage);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/whatsapp/groups/remove-participant", async (req, res) => {
    const { groupId, phoneNumber } = req.body;
    try {
      const result = await whatsappService.removeFromGroup(groupId, phoneNumber);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/whatsapp/groups/sync", async (req, res) => {
    try {
      const groupIds = await whatsappService.syncGroups();
      res.json({ success: true, groupIds });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: `Rota da API não encontrada: ${req.path}` });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
