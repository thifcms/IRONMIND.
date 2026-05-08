import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper para retry com backoff exponencial no servidor
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = error?.message || String(error);
      if (!msg.includes("429") && !msg.includes("quota") && !msg.includes("fetch") && !msg.includes("timeout")) {
        throw error;
      }
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Retry ${i+1}/${maxRetries} due to error: ${msg}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

const trainingSchema = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING },
    name: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          exercises: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                name: { type: SchemaType.STRING },
                sets: { type: SchemaType.NUMBER },
                reps: { type: SchemaType.STRING },
                weight: { type: SchemaType.STRING },
                rest: { type: SchemaType.STRING },
                videoUrl: { type: SchemaType.STRING }
              },
              required: ["id", "name", "sets", "reps"]
            }
          }
        },
        required: ["label", "exercises"]
      }
    }
  },
  required: ["id", "name", "description", "days"]
};

const dietSchema = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING },
    name: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    meals: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          time: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ["time", "name", "items"]
      }
    }
  },
  required: ["id", "name", "description", "meals"]
};

const systemInstruction = `Você é o IronMind Coach, um treinador de elite especializado em alta performance, biomecânica e nutrição esportiva. 
Seu estilo é direto, autoritário mas motivador, focado em resultados máximos.

- Forneça explicações detalhadas sobre PORQUÊ certas técnicas ou alimentos são recomendados.
- Use terminologia técnica quando apropriado (ex: hipertrofia sarcoplasmática, déficit calórico, recrutamento motor).
- Seja encorajador e mantenha o tom de um mentor de alto nível.
- Sem respostas genéricas. Cada conselho deve ser biomecanicamente fundamentado.

1. Estruture treinos de AB a ABCDE conforme a necessidade. SEMPRE que sugerir um treino ou dieta, finalize com "EU ELABOREI ESTA PROPOSTA DE TREINO PARA VOCÊ" ou "AQUI ESTÁ SUA PROPOSTA DE DIETA ESTRUTURADA" para que o sistema reconheça e gere os botões de aceitação.
2. Sugira vídeos de execução técnica precisa.
3. Responda em Português do Brasil.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Usa obrigatoriamente VITE_GEMINI_API_KEY conforme solicitado
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  
  // LOGS DE DIAGNÓSTICO
  console.log("Servidor ouvindo na porta 3000");
  console.log("Status da Chave:", process.env.VITE_GEMINI_API_KEY ? "Detectada" : "Vazia");
  
  if (!apiKey) {
    console.log("❌ ERRO CRÍTICO: VITE_GEMINI_API_KEY não foi encontrada! Verifique seus Secrets.");
  } else {
    console.log(`✅ Chave de API ativa: ${apiKey.substring(0, 5)}...`);
  }
  
  // Inicialização usando v1beta para garantir suporte total a systemInstruction
  const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel(
    { 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction 
    },
    { apiVersion: "v1beta" }
  );

  // Gemini API Routes
  app.post("/api/chat", async (req, res) => {
    const { history, message } = req.body;
    try {
      // Garantir que as roles alternem (User -> Model -> User -> Model)
      // O Gemini SDK exige alternância estrita.
      let rawContents = history.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }]
      })).filter((c: any) => c.parts[0].text && c.parts[0].text.trim() !== "");

      const contents: any[] = [];
      if (rawContents.length > 0) {
        let currentGroup = rawContents[0];
        for (let i = 1; i < rawContents.length; i++) {
          if (rawContents[i].role === currentGroup.role) {
            // Mesma role, concatena o texto
            currentGroup.parts[0].text += "\n\n" + rawContents[i].parts[0].text;
          } else {
            // Role diferente, fecha o grupo anterior e abre novo
            contents.push(currentGroup);
            currentGroup = rawContents[i];
          }
        }
        contents.push(currentGroup);
      }

      // Se o último for user, o Gemini se perde se enviarmos message separada.
      // Vamos remover o último se for user e usar apenas a message final para evitar duplicidade ou conflito.
      // Mas o correto é garantir que o último de 'contents' seja 'model' para o Gemini receber o próximo 'user'.
      
      // Sanitização final: se o histórico termina em 'user', Gemini pode reclamar de ordem.
      // Vamos garantir que limpamos mensagens vazias.
      const sanitizedContents = contents.filter(c => c.parts[0].text.trim() !== "");
      
      const result = await withRetry(() => model.generateContent({
        contents: [
          ...sanitizedContents,
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          temperature: 0.7,
        }
      }));

      const response = await result.response;
      res.json({ role: 'model', text: response.text() || "Oscilação na IA." });
    } catch (error: any) {
      console.error("Chat Server Error:", error);
      res.status(500).json({ error: error.message || "Erro desconhecido no servidor de IA." });
    }
  });

  app.post("/api/proposal", async (req, res) => {
    const { type, context } = req.body;
    const isTraining = type === 'training';
    const schema = isTraining ? trainingSchema : dietSchema;

    try {
      const result = await withRetry(() => model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Com base neste contexto: "${context}", gere uma proposta estruturada de ${isTraining ? 'treino dividido em dias' : 'dieta esportiva'} seguindo estritamente o schema JSON.` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema as any,
          temperature: 0.2,
        },
      }));

      const response = await result.response;
      const data = JSON.parse(response.text() || "{}");
      res.json({
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now()
      });
    } catch (error: any) {
      console.error("Proposal Server Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analyze-image", async (req, res) => {
    const { imageBase64 } = req.body;
    try {
      const analysisSchema = {
        type: SchemaType.OBJECT,
        properties: {
          food: { type: SchemaType.STRING },
          calories: { type: SchemaType.NUMBER },
          color: { type: SchemaType.STRING, enum: ["green", "yellow", "red"] },
          explanation: { type: SchemaType.STRING }
        },
        required: ["food", "calories", "color", "explanation"]
      };

      const result = await withRetry(() => model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: "Analise esta foto de comida, estime as calorias e classifique." },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64.split(",")[1] || imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema as any,
        },
      }));

      const response = await result.response;
      res.json(JSON.parse(response.text() || "{}"));
    } catch (error: any) {
      console.error("Image Analysis Server Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/exercise-guide", async (req, res) => {
    const { name } = req.body;
    try {
      const guideSchema = {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          muscle: { type: SchemaType.STRING },
          setup: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          execution: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          commonMistakes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          proTip: { type: SchemaType.STRING }
        },
        required: ["name", "muscle", "setup", "execution", "commonMistakes", "proTip"]
      };

      const result = await withRetry(() => model.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: `Gere um guia técnico ultra-detalhado para o exercício: "${name}". O guia deve ser focado em biomecânica e segurança.` }] 
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: guideSchema as any,
          temperature: 0.1,
        },
      }));

      const response = await result.response;
      res.json(JSON.parse(response.text() || "{}"));
    } catch (error: any) {
      console.error("Exercise Guide Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware setup
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


