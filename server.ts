import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountVar && serviceAccountVar.trim().startsWith('{')) {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully with service account");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
      // Fallback to application default credentials if in Cloud Run or if path is set
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log("Firebase Admin initialized with Application Default Credentials");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found or invalid JSON. Firebase Admin not initialized.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin. Ensure FIREBASE_SERVICE_ACCOUNT is a valid JSON string starting with '{':", error);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const PORT = 3000;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
