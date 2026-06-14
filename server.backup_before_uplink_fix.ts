// Backup of server.ts before fixing proxy routes and neural-link diagnose
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
    const probe = await fetch("https://ironmind-ai-572028997371.us-east1.run.app/api/health", {
      headers: { 
        "X-API-KEY": "HUB_IRONMIND_2024_UPLINK",
        "Content-Type": "application/json"
      }
    });
    const duration = Date.now() - start;
    if (probe.ok) {
      const remoteData = await probe.json().catch(() => ({}));
      res.json({ 
        online: true, 
        source: "external-uplink", 
        status: `Neural Link UP (Uplink Ativo, Ping: ${duration}ms)`,
        latency: duration,
        remote: remoteData
      });
    } else {
      res.json({ 
        online: false, 
        source: "external-uplink", 
        status: `OFFLINE: Status incorreto do Servidor Externo (${probe.status})` 
      });
    }
  } catch (err: any) {
    res.json({ 
      online: false, 
      source: "external-uplink", 
      status: `Neural Link DOWN: ${err.message}` 
    });
  }
});

app.post("/api/neural-link/config", (req, res) => {
  res.json({ success: true, message: "Handshake sincronizado via proxy externo." });
});

// Proxy handler to redirect routing directly to the target external AI engine
const proxyHandler = async (req: express.Request, res: express.Response) => {
  const targetUrl = `https://ironmind-ai-572028997371.us-east1.run.app${req.originalUrl}`;
  console.log(`[IronMind Proxy] Direcionando ${req.method} de ${req.originalUrl} para ${targetUrl}`);
  
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": "HUB_IRONMIND_2024_UPLINK"
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    
    // Set response status
    res.status(response.status);

    const contentType = response.headers.get("content-type") || "";
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    if (contentType.includes("application/json")) {
      const json = await response.json();
      return res.json(json);
    } else {
      const text = await response.text();
      return res.send(text);
    }
  } catch (err: any) {
    console.error(`[IronMind Proxy] Erro no encaminhamento para ${targetUrl}:`, err.message);
    return res.status(502).json({ 
      error: "BAD_UPLINK_GATEWAY",
      message: `Erro na comunicação com o Hub de IA do IronMind: ${err.message}`
    });
  }
};

// Route mapping
app.post("/api/chat", proxyHandler);
app.post("/api/generate-proposal", proxyHandler);
app.post("/api/analyze-image", proxyHandler);

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
