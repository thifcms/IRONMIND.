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

/**
 * Função auxiliar para fetch com retentativa (Cold Start detection)
 */
async function fetchIronMindWithRetry(body: any, maxAttempts = 5): Promise<any> {
  let attempts = 0;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(EXTERNAL_COACH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": EXTERNAL_COACH_API_KEY
        },
        body: JSON.stringify(body)
      });

      const contentType = response.headers.get("content-type") || "";
      
      if (response.ok && contentType.includes("application/json")) {
        return await response.json();
      }

      // Detecção de HTML (Cold Start do Cloud Run/Proxy)
      if (contentType.includes("text/html")) {
        attempts++;
        if (attempts < maxAttempts) {
          console.warn(`[RETRY ${attempts}/${maxAttempts}] Cold Start detectado. Aguardando 10s...`);
          // "Treinador acordando, aguarde alguns segundos..." -> Logado no servidor
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
        throw new Error("HTML_RESPONSE_EXHAUSTED");
      }

      if (!response.ok) {
        throw new Error(`CORE_ERROR_${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;
      attempts++;
      if (attempts < maxAttempts && error.message !== "HTML_RESPONSE_EXHAUSTED") {
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      break;
    }
  }

  if (lastError?.message === "HTML_RESPONSE_EXHAUSTED") {
    throw new Error("Treinador temporariamente offline. Tente novamente em instantes.");
  }
  throw lastError || new Error("Erro de comunicação com o motor primário.");
}

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
      const data = await fetchIronMindWithRetry({ messages, userId });
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/chat:", error.message);
      res.status(503).json({ error: error.message });
    }
  });

  app.post("/api/generate-proposal", async (req, res) => {
    try {
      const { prompt, userId } = req.body;
      const data = await fetchIronMindWithRetry({ messages: [{ role: "user", content: prompt }], userId });
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/generate-proposal:", error.message);
      res.status(503).json({ error: error.message });
    }
  });

  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageBase64, prompt, userId } = req.body;
      const data = await fetchIronMindWithRetry({ imageBase64, messages: [{ role: "user", content: prompt }], userId });
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/analyze-image:", error.message);
      res.status(503).json({ error: error.message });
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
