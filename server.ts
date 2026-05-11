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

const systemInstruction = `Você é o IronMind Treinador. Sua missão é gerar treinos e dietas baseados na biblioteca de 350 exercícios do app. Seja técnico, direto e motivador. Use sempre o modelo Gemini 1.5 Flash para garantir estabilidade. Identifique-se sempre como IronMind Treinador.
REGRA DE EXERCÍCIOS: Dê preferência aos exercícios da nossa biblioteca interna. Contudo, se um exercício específico for superior para o objetivo do usuário e não estiver na lista, você tem permissão para buscá-lo ou sugeri-lo com base em conhecimento técnico externo.`;

const EXERCISE_NAMES_HINT = [
  'Supino Reto (Barra)', 'Supino Inclinado (Barra)', 'Supino Reto (Haltere)', 'Supino Inclinado (Haltere)', 
  'Crucifixo Reto', 'Crossover (Polia Alta)', 'Fly (Máquina)', 'Flexão de Braços',
  'Puxada Aberta (Pulley)', 'Remada Curvada (Barra)', 'Remada Unilateral (Serrote)', 'Puxada com Triângulo', 
  'Remada Baixa (Triângulo)', 'Levantamento Terra', 'Pull Down (Corda)', 'Barra Fixa',
  'Agachamento Livre', 'Leg Press 45', 'Extensora', 'Flexora Deitada', 'Flexora Sentada', 
  'Afundo (Haltere)', 'Stiff (Barra)', 'Cadeira Abdutora', 'Cadeira Adutora', 'Gêmeos em Pé',
  'Desenvolvimento (Barra)', 'Desenvolvimento (Haltere)', 'Elevação Lateral', 'Elevação Frontal', 'Posterior de Ombro (Corda)',
  'Rosca Direta (Barra E-Z)', 'Rosca Alternada', 'Rosca Martelo',
  'Tríceps Pulley (Barra)', 'Tríceps Corda', 'Tríceps Testa'
].join(', ');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Usa preferencialmente GEMINI_API_KEY injetada pela plataforma
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "AIzaSyA8pQOVnGhCRzJru_xDTlM8Z_WtoKIlQsQ";
  
  // LOGS DE DIAGNÓSTICO
  console.log("Servidor ouvindo na porta 3000");
  console.log("Status da Chave (Platform):", process.env.GEMINI_API_KEY ? "OK" : "Vazia");
  console.log("Status da Chave (Custom):", process.env.VITE_GEMINI_API_KEY ? "Detectada" : "Vazia");
  if (!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY) {
    console.log("⚠️  Usando chave de fallback fornecida pelo usuário.");
  }
  
  if (!apiKey) {
    console.log("❌ ERRO CRÍTICO: Nenhuma Chave de API (GEMINI_API_KEY ou VITE_GEMINI_API_KEY) encontrada!");
  } else {
    console.log(`✅ Conexão com IA configurada.`);
  }
  
  // Inicialização ROBUSTA da Treinadora IronMind
  // Forçamos apiVersion: 'v1' para evitar v1beta se o modelo pedir
  const genAI = new GoogleGenerativeAI(apiKey as string, { apiVersion: 'v1' });
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: systemInstruction
  });

  /**
   * GERENTE DE IA: Otimizador de Histórico (Controle de Tokens e Estabilidade)
   * Garante alternância estrita User/Model e limite de 10 mensagens.
   */
  const stabilizeHistory = (history: any[]) => {
    // 1. Mapear roles e garantir conteúdo
    let stabilized = history.map((msg: any) => ({
      role: (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user',
      parts: [{ text: msg.content || msg.text || "" }],
    })).filter(msg => msg.parts[0].text.trim() !== "");

    // 2. Limitar tamanho (Últimas 10)
    if (stabilized.length > 10) {
      stabilized = stabilized.slice(-10);
    }

    // 3. Garantir que comece com 'user'
    while (stabilized.length > 0 && stabilized[0].role !== 'user') {
      stabilized.shift();
    }

    // 4. Garantir alternância (remover duplicatas seguidas)
    const alternated = [];
    for (let i = 0; i < stabilized.length; i++) {
      if (i === 0 || stabilized[i].role !== stabilized[i - 1].role) {
        alternated.push(stabilized[i]);
      } else {
        // Se houver duas iguais, concatena o texto para não perder contexto
        alternated[alternated.length - 1].parts[0].text += "\n\n" + stabilized[i].parts[0].text;
      }
    }

    return alternated;
  };

  /**
   * GERENTE DE IA: Validador de Chave e Conexão Real
   */
  const validateAIHealth = async () => {
    if (!apiKey) {
      return { status: "error", message: "Chave VITE_GEMINI_API_KEY não configurada." };
    }
    try {
      const testModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      await testModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7, topP: 0.95, topK: 64 }
      });
      return { status: "ok", message: "Motor IronMind Ativo" };
    } catch (err: any) {
      console.error("🤖 GERENTE DE IA - Erro de Autenticação:", err.message);
      return { status: "error", message: "Autenticação Falhou" };
    }
  };

  // Gemini API Routes
  app.post("/api/chat", async (req, res) => {
    let { history, message } = req.body;
    try {
      const chatHistory = stabilizeHistory(history);
      
      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
        },
      });

      // Adicionamos a dica de exercícios apenas na mensagem atual para o modelo ter contexto da nossa biblioteca
      const result = await withRetry(() => chat.sendMessage(`${message}\n\n(Dica para Treinadora: Se for sugerir exercícios, use preferencialmente: ${EXERCISE_NAMES_HINT})`));
      const response = await result.response;
      res.json({ role: 'model', text: response.text() || "Transmissão interrompida." });
    } catch (error: any) {
      const errorDetail = error?.message || String(error);
      console.error("🤖 GERENTE DE IA - Painel de Diagnóstico:", errorDetail);
      
      // Se for erro de quota (429) ou erro de requisição inválida (400), sugerimos limpar o histórico
      if (errorDetail.includes("429") || errorDetail.includes("quota") || errorDetail.includes("400") || errorDetail.includes("model not found")) {
        return res.status(errorDetail.includes("429") ? 429 : 400).json({ 
          role: 'model', 
          text: "Ocorreu um erro de conexão ou limite de cota com o motor de IA. Por segurança, tente limpar o histórico da conversa para restabelecer a estabilidade.",
          shouldClearHistory: true 
        });
      }

      // Se for erro de segurança/bloqueio de conteúdo
      if (errorDetail.includes("safety") || errorDetail.includes("blocked")) {
        return res.json({ role: 'model', text: "Minhas diretrizes de segurança bloquearam esta resposta. Tente reformular sua pergunta de forma mais técnica sobre treinos ou dietas." });
      }

      res.status(500).json({ error: `Falha no motor de IA: ${errorDetail}` });
    }
  });

  app.get("/api/ai-status", async (req, res) => {
    const health = await validateAIHealth();
    res.json(health);
  });

  app.post("/api/proposal", async (req, res) => {
    const { type, context } = req.body;
    const isTraining = type === 'training';
    const schema = isTraining ? trainingSchema : dietSchema;

    try {
      const result = await withRetry(() => model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Com base neste contexto: "${context}", gere uma proposta estruturada de ${isTraining ? 'treino dividido em dias' : 'dieta esportiva'} seguindo estritamente o schema JSON em Português. ${isTraining ? 'Para os exercícios, use EXCLUSIVAMENTE estes nomes: ' + EXERCISE_NAMES_HINT : ''}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema as any,
          temperature: 0.1,
        },
      }));

      const response = await result.response;
      const data = JSON.parse(response.text() || "{}");
      
      // GERENTE DE IA: Garantia de IDs Únicos para evitar avisos de chave duplicada no React
      if (isTraining && data.days) {
        let exCounter = 1;
        data.days = data.days.map((day: any) => ({
          ...day,
          exercises: (day.exercises || []).map((ex: any) => ({
            ...ex,
            id: `ex-${Date.now()}-${exCounter++}`
          }))
        }));
      }

      res.json({
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now()
      });
    } catch (error: any) {
      console.error("🤖 GERENTE DE IA - Erro de Proposta:", error.message);
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
      console.error("🤖 GERENTE DE IA - Erro de Imagem:", error.message);
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
      console.error("🤖 GERENTE DE IA - Erro de Guia:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/resolve-video", async (req, res) => {
    const { name } = req.body;
    try {
      const videoSchema = {
        type: SchemaType.OBJECT,
        properties: {
          videoId: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          source: { type: SchemaType.STRING }
        },
        required: ["videoId"]
      };

      const result = await withRetry(() => model.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: `Find the YouTube Video ID for: "${name}". RETURN ONLY THE ID STRING.` }] 
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: videoSchema as any,
          temperature: 0,
        },
      }));

      const response = await result.response;
      const data = JSON.parse(response.text() || "{}");
      
      // GERENTE DE IA: Validação de Segurança do Link
      if (!data.videoId || data.videoId.length < 5 || data.videoId.includes(" ")) {
        console.warn(`🤖 GERENTE DE IA: Detectado possível link quebrado para ${name}. Usando fallback.`);
        return res.json({ videoId: "dQw4w9WgXcQ", title: "Fallback Técnica", source: "YouTube" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("🤖 GERENTE DE IA - Erro de Vídeo:", error.message);
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


