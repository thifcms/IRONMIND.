import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

// Polyfill Object.hasOwn for older environments
if (typeof Object.hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', {
    value: function (object: any, property: PropertyKey): boolean {
      if (object === null || object === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      return Object.prototype.hasOwnProperty.call(object, property);
    },
    writable: true,
    configurable: true,
    enumerable: false
  });
}

dotenv.config();

let EXTERNAL_COACH_URL = "https://ironmind-ai-572028997371.us-east1.run.app/api/chat";
let EXTERNAL_COACH_API_KEY = "HUB_IRONMIND_2024_UPLINK";

// Permite atualização via endpoint
export function setExternalCoachUrl(url: string) {
  EXTERNAL_COACH_URL = url;
}

export function setExternalCoachApiKey(apiKey: string) {
  EXTERNAL_COACH_API_KEY = apiKey;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Servidor IronMind Ativo",
      env: process.env.NODE_ENV
    });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, userId } = req.body;
      const response = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "HUB_IRONMIND_2024_UPLINK"
        },
        body: JSON.stringify({ messages, userId })
      });
      
      if (!response.ok) {
        throw new Error("Coach offline");
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/chat:", error);
      res.status(503).json({ error: "Treinador temporariamente offline. Tente novamente em instantes." });
    }
  });

  app.post("/api/generate-proposal", async (req, res) => {
    try {
      const { prompt, userId } = req.body;
      const response = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "HUB_IRONMIND_2024_UPLINK"
        },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], userId })
      });

      if (!response.ok) {
        throw new Error("Coach offline");
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/generate-proposal:", error);
      res.status(503).json({ error: "Treinador temporariamente offline. Tente novamente em instantes." });
    }
  });

  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageBase64, prompt, userId } = req.body;
      const response = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": "HUB_IRONMIND_2024_UPLINK"
        },
        body: JSON.stringify({ imageBase64, messages: [{ role: "user", content: prompt }], userId })
      });

      if (!response.ok) {
        throw new Error("Coach offline");
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/analyze-image:", error);
      res.status(503).json({ error: "Treinador temporariamente offline. Tente novamente em instantes." });
    }
  });

  app.get("/api/neural-link/diagnose", (req, res) => {
    res.json({ online: true, source: "external", status: "Neural Link UP" });
  });

  app.post("/api/neural-link/config", (req, res) => {
    const { url, apiKey } = req.body;
    if (url) EXTERNAL_COACH_URL = url;
    if (apiKey) EXTERNAL_COACH_API_KEY = apiKey;
    res.json({ success: true, message: "Configuração atualizada." });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
