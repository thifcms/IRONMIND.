import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

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

let EXTERNAL_COACH_URL = "https://ironmind-ai.netlify.app/api/chat";
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
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
        throw new Error("MOTOR_OFFLINE_COLD_START");
      }

      if (!response.ok) {
        throw new Error(`CORE_ERROR_${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;
      attempts++;
      if (attempts < maxAttempts && error.message !== "MOTOR_OFFLINE_COLD_START") {
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      break;
    }
  }

  if (lastError?.message === "MOTOR_OFFLINE_COLD_START") {
    throw new Error("MOTOR_OFFLINE_COLD_START");
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
  // Render (e a maioria dos hosts) terminam o HTTPS num proxy na frente do
  // app e falam HTTP puro por dentro. Sem isso, req.protocol sempre vem
  // "http", mesmo em produção — quebrando qualquer coisa que dependa da
  // origem real (como a verificação da biometria/WebAuthn).
  app.set('trust proxy', 1);
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
      const { messages, userId, userProfile, systemInstruction } = req.body;
      const data = await fetchIronMindWithRetry({ messages, userId, userProfile, systemInstruction });
      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/chat:", error.message);
      res.status(503).json({ error: error.message });
    }
  });

  app.post("/api/generate-proposal", async (req, res) => {
    try {
      const { prompt, userId, userProfile, systemInstruction } = req.body;
      const data = await fetchIronMindWithRetry({ 
        messages: [{ role: "user", content: prompt }], 
        userId, 
        userProfile, 
        systemInstruction 
      });

      // Lógica de Extração Robusta de JSON (IronMind Neural Engine)
      if (data && typeof data.text === 'string') {
        try {
          let cleanText = data.text.trim();
          
          // 1. Remover blocos de código markdown se existirem
          if (cleanText.includes('```')) {
            cleanText = cleanText.replace(/```json\n?|```/g, '').trim();
          }

          // 2. Localizar o objeto JSON (entre a primeira e última chave)
          const start = cleanText.indexOf('{');
          const end = cleanText.lastIndexOf('}');
          
          if (start !== -1 && end !== -1) {
            const jsonString = cleanText.substring(start, end + 1);
            const parsed = JSON.parse(jsonString);

            // 3. Se o objeto foi parseado e os dados originais não têm 'proposal', injetamos
            if (parsed && !data.proposal) {
              data.proposal = {
                type: parsed.type || (parsed.meals || parsed.refeicoes || parsed.dieta ? 'diet' : 'training'),
                data: parsed
              };
            }
          }
        } catch (e) {
          console.warn("[JSON_PARSE_SKIP] O texto não é um JSON puro ou está malformado.");
        }
      }

      res.json(data);
    } catch (error: any) {
      console.error("Erro no /api/generate-proposal:", error.message);
      res.status(503).json({ error: error.message });
    }
  });

  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageBase64, prompt, userId, userProfile } = req.body;
      const data = await fetchIronMindWithRetry({ 
        imageBase64, 
        messages: [{ role: "user", content: prompt }], 
        userId, 
        userProfile 
      });
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

  // ─────────────────────────────────────────────────────────────
  // WebAuthn (biometria como tranca local do app)
  //
  // O servidor só faz a parte criptográfica (gerar desafio, verificar
  // assinatura) — não guarda nada no Firestore. Quem lê/grava a
  // credencial no Firestore é sempre o cliente autenticado, respeitando
  // as regras de segurança normalmente. Isso evita precisar de uma
  // Service Account do Firebase (bloqueada por política da organização).
  // ─────────────────────────────────────────────────────────────
  const rpName = "IronMind";
  const getRpID = (req: express.Request) => (req.hostname || "localhost");
  const getOrigin = (req: express.Request) => `${req.protocol}://${req.get('host')}`;

  // Desafios pendentes, em memória, com expiração curta (5 min).
  const pendingChallenges = new Map<string, { challenge: string; expires: number }>();
  const cleanupExpiredChallenges = () => {
    const now = Date.now();
    for (const [key, val] of pendingChallenges.entries()) {
      if (val.expires < now) pendingChallenges.delete(key);
    }
  };

  app.post("/api/webauthn/register-options", async (req, res) => {
    try {
      cleanupExpiredChallenges();
      const { userId, email } = req.body;
      if (!userId || !email) return res.status(400).json({ error: "userId e email são obrigatórios." });

      const options = await generateRegistrationOptions({
        rpName,
        rpID: getRpID(req),
        userName: email,
        userID: new TextEncoder().encode(userId),
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
        },
      });

      const flowId = crypto.randomUUID();
      pendingChallenges.set(flowId, { challenge: options.challenge, expires: Date.now() + 5 * 60 * 1000 });

      res.json({ flowId, options });
    } catch (error: any) {
      console.error("Erro em /api/webauthn/register-options:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar opções de registro." });
    }
  });

  app.post("/api/webauthn/register-verify", async (req, res) => {
    try {
      cleanupExpiredChallenges();
      const { flowId, response } = req.body;
      const pending = flowId && pendingChallenges.get(flowId);
      if (!pending) return res.status(400).json({ error: "Desafio expirado ou inválido. Tente novamente." });
      pendingChallenges.delete(flowId);

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: getOrigin(req),
        expectedRPID: getRpID(req),
      });

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ error: "Não foi possível verificar a biometria." });
      }

      const { credential } = verification.registrationInfo;
      res.json({
        verified: true,
        credential: {
          id: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          transports: credential.transports || [],
        }
      });
    } catch (error: any) {
      console.error("Erro em /api/webauthn/register-verify:", error);
      res.status(500).json({ error: error.message || "Erro ao verificar registro." });
    }
  });

  app.post("/api/webauthn/login-options", async (req, res) => {
    try {
      cleanupExpiredChallenges();
      const { credentials } = req.body; // [{ id, transports }]
      if (!Array.isArray(credentials) || credentials.length === 0) {
        return res.status(400).json({ error: "Nenhuma credencial de biometria encontrada para esta conta." });
      }

      const options = await generateAuthenticationOptions({
        rpID: getRpID(req),
        userVerification: 'required',
        allowCredentials: credentials.map((c: any) => ({ id: c.id, transports: c.transports })),
      });

      const flowId = crypto.randomUUID();
      pendingChallenges.set(flowId, { challenge: options.challenge, expires: Date.now() + 5 * 60 * 1000 });

      res.json({ flowId, options });
    } catch (error: any) {
      console.error("Erro em /api/webauthn/login-options:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar opções de login." });
    }
  });

  app.post("/api/webauthn/login-verify", async (req, res) => {
    try {
      cleanupExpiredChallenges();
      const { flowId, response, credential } = req.body; // credential = { id, publicKey (base64url), counter }
      const pending = flowId && pendingChallenges.get(flowId);
      if (!pending) return res.status(400).json({ error: "Desafio expirado ou inválido. Tente novamente." });
      pendingChallenges.delete(flowId);

      if (!credential || !credential.publicKey) {
        return res.status(400).json({ error: "Credencial não informada." });
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: getOrigin(req),
        expectedRPID: getRpID(req),
        credential: {
          id: credential.id,
          publicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: credential.counter || 0,
          transports: credential.transports || [],
        },
      });

      if (!verification.verified) {
        return res.status(401).json({ error: "Biometria não confere." });
      }

      res.json({
        verified: true,
        newCounter: verification.authenticationInfo.newCounter
      });
    } catch (error: any) {
      console.error("Erro em /api/webauthn/login-verify:", error);
      res.status(500).json({ error: error.message || "Erro ao verificar biometria." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // index.html e sw.js nunca podem ficar em cache — são eles que "apontam"
        // pra versão certa do bundle. Os arquivos em /assets já têm hash no nome
        // (ex: index-D7cYJFGt.js), então podem e devem ficar em cache normalmente.
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });

  // Self-ping removido de propósito (2026-08-21): com 3 serviços
  // dividindo as 750h/mês grátis do Render (workspace único), manter
  // este sempre ligado 24/7 esgotava a cota rápido. Deixando hibernar
  // normalmente após ~15min sem uso -- a troca é só uns 30-60s a mais
  // na primeira abertura depois de um tempo parado, sem custo de horas.
}

startServer();
