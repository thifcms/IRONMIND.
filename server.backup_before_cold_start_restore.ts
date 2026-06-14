import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Local health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Servidor IronMind Ativo",
    env: process.env.NODE_ENV
  });
});

// Diagnose Neural Link
app.get("/api/neural-link/diagnose", async (req, res) => {
  try {
    const start = Date.now();
    let hubOnline = false;
    let duration = 0;
    
    try {
      const probe = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/chat", {
        method: "POST",
        headers: { 
          "X-API-KEY": "HUB_IRONMIND_2024_UPLINK",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ messages: [{ role: "user", content: "ping" }], userId: "anonymous" }),
        signal: AbortSignal.timeout(5000)
      });
      duration = Date.now() - start;
      hubOnline = probe.ok;
    } catch {
      hubOnline = false;
    }

    if (hubOnline) {
      res.json({ 
        online: true, 
        source: "external-uplink", 
        status: `Neural Link UP (Uplink Ativo, Ping: ${duration}ms)`,
        latency: duration,
        target: "https://ironmind-ai-572028997371.us-east1.run.app/api/chat",
        apiKey: "HUB_IRONMIND_2024_UPLINK"
      });
    } else {
      res.json({
        online: false,
        source: "disconnected",
        status: "OFFLINE (Uplink indisponível)",
        target: "Desconectado",
        suggestion: "O servidor de inteligência principal está temporariamente indisponível."
      });
    }
  } catch (err: any) {
    res.json({ 
      online: false, 
      source: "error", 
      status: `Erro no diagnóstico: ${err.message}` 
    });
  }
});

app.post("/api/neural-link/config", (req, res) => {
  res.json({ success: true, message: "Handshake sincronizado via proxy externo." });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userId, userProfile, systemInstruction } = req.body;
    console.log(`[IronMind Proxy] Direcionando /api/chat para Hub Externo`);
    
    const response = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "HUB_IRONMIND_2024_UPLINK"
      },
      body: JSON.stringify({ messages, userId, userProfile, systemInstruction }),
      signal: AbortSignal.timeout(15000) // Timeout de 15s
    });

    if (!response.ok) {
      throw new Error(`Hub respondeu com status ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Erro no proxy /api/chat:", error.message);
    return res.status(503).json({ 
      error: "SERVER_ERROR", 
      message: "Treinador temporariamente offline. Tente novamente." 
    });
  }
});

app.post("/api/generate-proposal", async (req, res) => {
  try {
    const { prompt, userId, userProfile, systemInstruction } = req.body;
    console.log(`[IronMind Proxy] Direcionando /api/generate-proposal para Hub Externo`);
    
    const response = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "HUB_IRONMIND_2024_UPLINK"
      },
      body: JSON.stringify({ 
        messages: [{ role: "user", content: prompt }], 
        userId: userId || "anonymous",
        userProfile,
        systemInstruction
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Hub respondeu com status ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Erro no /api/generate-proposal:", error.message);
    return res.status(503).json({ 
      error: "SERVER_ERROR", 
      message: "Treinador temporariamente offline. Tente novamente." 
    });
  }
});

app.post("/api/analyze-image", async (req, res) => {
  try {
    const { imageBase64, prompt, userId, userProfile } = req.body;
    console.log(`[IronMind Proxy] Direcionando /api/analyze-image para Hub Externo`);
    
    const response = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "HUB_IRONMIND_2024_UPLINK"
      },
      body: JSON.stringify({ 
        imageBase64, 
        messages: [{ role: "user", content: prompt }], 
        userId: userId || "anonymous",
        userProfile
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Hub respondeu com status ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Erro no /api/analyze-image:", error.message);
    return res.status(503).json({ 
      error: "SERVER_ERROR", 
      message: "Treinador temporariamente offline. Tente novamente." 
    });
  }
});

async function startServer() {
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
    console.log(`🚀 Servidor rodando em http://localhost:${PORT} (Uplink Proxy Ativo)`);
  });
}

startServer();
