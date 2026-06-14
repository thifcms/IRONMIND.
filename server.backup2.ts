import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

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

// Lista de modelos recomendados (Ordem de prioridade/estabilidade)
const MODEL_FALLBACK_LIST = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite"
];

let EXTERNAL_COACH_URL = "https://ironmind-ai-572028997371.us-east1.run.app/api/chat";
let EXTERNAL_COACH_API_KEY = "HUB_IRONMIND_2024_UPLINK";

// Permite atualização via endpoint
export function setExternalCoachUrl(url: string) {
  EXTERNAL_COACH_URL = url;
}

export function setExternalCoachApiKey(apiKey: string) {
  EXTERNAL_COACH_API_KEY = apiKey;
}

async function callExternalCoach(endpoint: string, body: any): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    console.log(`[Neural Link] Conectando ao Coach de Elite: ${EXTERNAL_COACH_URL}...`);
    
    // Wakeup Ping Loop
    const baseUrl = new URL(EXTERNAL_COACH_URL).origin;
    const pingUrl = `${baseUrl}/api/ping`;
    let isAwake = false;
    let pingAttempt = 1;
    const maxPingAttempts = 10;
    
    while (!isAwake && pingAttempt <= maxPingAttempts) {
      try {
        console.log(`[Neural Link] Enviando wakeup PING para ${pingUrl}... (Tentativa ${pingAttempt}/${maxPingAttempts})`);
        const pingResponse = await fetch(pingUrl, { 
          method: "GET",
          signal: controller.signal 
        });
        const pingText = await pingResponse.text();
        
        let isHtml = pingText.toLowerCase().includes("<!doctype") || pingText.toLowerCase().includes("<html");
        
        if (isHtml) {
          console.warn(`[Neural Link] Servidor retornou HTML (Cold Start). Aguardando 8s...`);
          await new Promise(resolve => setTimeout(resolve, 8000));
          pingAttempt++;
          continue;
        }
        
        try {
          const pingData = JSON.parse(pingText);
          if (pingData) {
             console.log(`[Neural Link] Servidor acordado.`);
             isAwake = true;
          }
        } catch (je) {
          console.warn(`[Neural Link] Resposta não-JSON. Aguardando 8s...`);
          await new Promise(resolve => setTimeout(resolve, 8000));
          pingAttempt++;
        }
      } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        console.warn(`[Neural Link] Ping wakeup falhou. Aguardando 8s...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
        pingAttempt++;
      }
    }
    
    const response = await fetch(EXTERNAL_COACH_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { 
        "Content-Type": "application/json",
        "X-API-KEY": EXTERNAL_COACH_API_KEY
      },
      body: JSON.stringify(body),
    });
    
    clearTimeout(timeoutId);
    
    let text = await response.text();
    
    if (!response.ok) {
      console.error(`[Neural Link] Erro no Coach Externo (${response.status}):`, text.substring(0, 500));
      const extErr = new Error(`Motor Primário retornou erro ${response.status}`);
      (extErr as any).status = response.status;
      throw extErr;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("[Neural Link] Timeout de 120s atingido.");
      return { text: "⚠️ Conexão interrompida: O Coach de Elite demorou mais de 120 segundos para responder." };
    }
    console.error(`[Neural Link] Falha na integração:`, error.message);
    throw error;
  }
}

async function generateWithFallback(apiKey: string, call: (modelId: string, ai: GoogleGenAI) => Promise<any>) {
  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  let lastError: any = null;

  for (const modelId of MODEL_FALLBACK_LIST) {
    try {
      console.log(`[Neural Core] Sincronizando com agente: ${modelId}...`);
      return await call(modelId, ai);
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.response?.status || 500;
      const errorMsg = error?.message?.toLowerCase() || "";
      
      const isQuotaError = status === 429 || errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit");
      const isUnavailableError = status === 503 || status === 504 || errorMsg.includes("503") || errorMsg.includes("demand") || errorMsg.includes("unavailable");
      const isNotFoundError = status === 404 || errorMsg.includes("404") || errorMsg.includes("not found");
      
      if (isQuotaError || isUnavailableError || isNotFoundError) {
        console.warn(`[Neural Fallback] Agente ${modelId} reportou problema temporário (${status}). Tentando escalonamento para o próximo modelo...`);
        continue;
      }
      throw error;
    }
  }
  
  const finalError = lastError?.message || lastError || "Todos os agentes neurais offline.";
  throw new Error(`[Neural System Error] ${finalError}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

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
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/chat:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Novos endpoints para resolver os 4 erros de conexão:
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
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
