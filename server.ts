import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createExpressApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
       console.log(`[Server] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: `Rota da API não encontrada: ${req.path}` });
  });

  return app;
}

async function startServer() {
  const app = await createExpressApp();
  const PORT = 3000;
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Vite middleware
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start server only if not in Vercel environment
if (!process.env.VERCEL) {
  startServer();
}

