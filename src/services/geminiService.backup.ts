import { ChatMessage, TrainingPlan, DietPlan } from "../types";

// Chave para persistência no localStorage
const STORAGE_KEY = 'ironmind_chat_history';

const systemInstruction = `Você é o IronMind Neural, o núcleo de inteligência central da aplicação IronMind. 
Sua personalidade é analítica, focada em dados, biomecânica de precisão e segurança absoluta.

DIRETRIZES DE IA (AGENTE NEURAL):
1. PRECISÃO BIOMECÂNICA: Ao sugerir exercícios, priorize aqueles com maior tensão mecânica no alongamento.
2. SEGURANÇA MOTORA: Bloqueie volumes > 30 séries/treino. Recuse propostas perigosas.
3. FORMATO TABULAR: Para treinos e dietas no chat, use EXCLUSIVAMENTE Tabelas Markdown (Colunas: Exercício, Séries, Reps, Descanso para treinos; Refeição, Horário, Itens para dieta).
4. MARCAÇÃO DE PROPOSTA (MUITO IMPORTANTE): Sempre que você apresentar um plano de treino novo e completo na sua resposta, você DEVE obrigatoriamente colocar a tag [PROPOSTA_TREINO] no final da sua mensagem. Sempre que apresentar uma dieta nova, coloque a tag [PROPOSTA_DIETA] no final da mensagem. Isso ativará os botões na interface.
5. FORMATO JSON: Para diagnósticos e formalização de propostas, use EXCLUSIVAMENTE o schema solicitado.
6. LINGUAGEM: No chat, use um tom de "IA de Alta Performance": preciso, direto e motivador. Use português do Brasil.
7. RESPOSTAS: Nunca dê respostas genéricas. Se solicitado um treino, elabore a divisão (ex: Push/Pull/Legs) com justificativa técnica.
8. HIPER-PERSONALIZAÇÃO: Você DEVE atuar como o treinador mais personalizado do mundo. Antes de gerar treinos, SE não houver contexto suficiente, questione o usuário sobre: objetivo principal, nível atual (iniciante/avançado), tempo disponível por dia, lesões/dores, dias de treino na semana, peso, altura e equipamentos disponíveis. NUNCA gere um treino genérico. Adapte cada exercício, série, e repetição à realidade ESTIVA e única do usuário e explique o PORQUÊ de cada escolha.`;

/**
 * Atualiza a URL e Chave de API do Cérebro Externo
 */
export async function updateNeuralLinkUrl(url?: string, apiKey?: string): Promise<any> {
  try {
    const res = await fetch("/api/neural-link/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, apiKey })
    });
    return await res.json();
  } catch (error) {
    console.error("Config Error:", error);
    return { success: false, error: "Falha ao atualizar configuração." };
  }
}

/**
 * Diagnóstico do Link Neural
 */
export async function diagnoseNeuralLink(): Promise<any> {
  try {
    const res = await fetch("/api/neural-link/diagnose");
    return await res.json();
  } catch (error) {
    console.error("Diagnostic Error:", error);
    return { online: false, error: "Falha ao conectar com o servidor de diagnóstico." };
  }
}

/**
 * Função auxiliar para persistir o histórico de chat
 */
export function saveChatHistory(history: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Erro ao salvar histórico:", error);
  }
}

/**
 * Função auxiliar para carregar o histórico persistido
 */
export function loadChatHistory(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    return [];
  }
}

/**
 * Chat com o Treinador IronMind (Via Servidor)
 */
export async function chatWithCoach(history: ChatMessage[], message: string, userProfile?: any, userId?: string, allowFallback: boolean = false): Promise<ChatMessage> {
  if (!userId) saveChatHistory(history);

  try {
    const contents = [
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.text }]
      })).filter(msg => msg.parts[0].text.trim() !== "").slice(-10),
      { role: 'user' as const, parts: [{ text: message }] }
    ];

    // Estabiliza alternância role User/Model
    const stabilized: any[] = [];
    contents.forEach((item, index) => {
      if (index === 0 || item.role !== stabilized[stabilized.length - 1].role) {
        stabilized.push(item);
      } else {
        stabilized[stabilized.length - 1].parts[0].text += "\n\n" + item.parts[0].text;
      }
    });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages: stabilized, 
        systemInstruction, 
        allowFallback, 
        userId: userId || "anonymous",
        userProfile 
      })
    });

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      let errorData: any = {};
      if (contentType.includes("application/json")) {
        errorData = await res.json();
      } else {
        const text = await res.text();
        errorData = { error: "SERVER_ERROR", message: text.substring(0, 100), technicalDetails: { status: res.status, body: text } };
      }
      
      const error = new Error(errorData.message || errorData.error || "Falha na comunicação com o núcleo neural.");
      (error as any).code = errorData.error;
      (error as any).technicalDetails = errorData.technicalDetails;
      (error as any).status = res.status;
      throw error;
    }

    if (!contentType.includes("application/json")) {
      const text = await res.text();
      return { role: 'model', text: text.trim() };
    }

    const data = await res.json();
    return { role: 'model', text: data.text };
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
}

/**
 * Gera propostas de treino ou dieta (JSON via Servidor)
 */
export async function generateProposal(type: 'training' | 'diet', context: string, userProfile?: any, userId?: string, allowFallback: boolean = false): Promise<TrainingPlan | DietPlan> {
  const isTraining = type === 'training';
  
  try {
    const schemaRef = isTraining 
      ? `{"name": "Treino ABC", "days": [{"label": "Treino A - Peito e Tríceps", "exercises": [{"name": "Supino", "sets": 3, "reps": "12", "rest": "60"}]}, {"label": "Treino B - Costas e Bíceps", "exercises": [{"name": "Remada", "sets": 3, "reps": "12", "rest": "60"}]}]}`
      : `{"name": "Dieta Bulking", "meals": [{"name": "Café", "time": "08:00", "items": ["Aveia", "Ovos"]}]}`;

    const prompt = `Com base neste contexto: "${context}", gere uma proposta estruturada de ${isTraining ? 'treino' : 'dieta'} seguindo estritamente este formato JSON: ${schemaRef}`;
    
    const res = await fetch("/api/generate-proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt, 
        systemInstruction, 
        allowFallback, 
        userId: userId || "anonymous",
        userProfile 
      })
    });

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      let errorData: any = {};
      if (contentType.includes("application/json")) {
        errorData = await res.json();
      } else {
        errorData = { error: "SERVER_ERROR", message: "Erro interno no servidor." };
      }
      
      const error = new Error(errorData.message || errorData.error || "Falha ao organizar plano.");
      (error as any).code = errorData.error;
      throw error;
    }

    if (!contentType.includes("application/json")) {
      throw new Error("Resposta do servidor não está em formato JSON.");
    }

    const rawData = await res.json();
    
    // Validação de segurança básica
    if (isTraining && rawData.days) {
      rawData.days.forEach((day: any) => {
        if (day.exercises && day.exercises.length > 8) day.exercises = day.exercises.slice(0, 8);
        day.exercises?.forEach((ex: any) => {
          if (ex.sets > 5) ex.sets = 3;
          if (!ex.rest) ex.rest = "90s";
        });
      });
    }

    return {
      ...rawData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now()
    };
  } catch (error) {
    console.error("Proposal Generation Error:", error);
    throw new Error("Falha ao organizar plano JSON. Tente refinar seu pedido.");
  }
}

/**
 * Analisa imagem de comida (Via Servidor)
 */
export async function analyzeFoodImage(imageBase64: string, userProfile?: any, userId?: string, allowFallback: boolean = false): Promise<{ food: string, calories: number, color: 'green' | 'yellow' | 'red', explanation: string }> {
  try {
    const prompt = "Analise esta foto de comida, estime as calorias e classifique color (green/yellow/red). Retorne JSON.";
    const cleanBase64 = imageBase64.split(",")[1] || imageBase64;

    const res = await fetch("/api/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        imageBase64: cleanBase64, 
        prompt, 
        allowFallback, 
        userId: userId || "anonymous",
        userProfile 
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      const error = new Error(errorData.message || errorData.error || "Falha na análise visual.");
      (error as any).code = errorData.error;
      throw error;
    }

    return await res.json();
  } catch (error: any) {
    console.error("Vision Error:", error);
    if (error.code === 'PRIMARY_ENGINE_OFFLINE') throw error;
    throw new Error("Não foi possível analisar esta imagem.");
  }
}

export async function getExerciseGuide(name: string) {
  const prompt = `Gere um guia técnico JSON para o exercício: ${name}.`;
  const res = await fetch("/api/generate-proposal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemInstruction: "Você é um especialista em biomecânica." })
  });
  return await res.json();
}

export async function resolveVideoDirectly(name: string) {
  const prompt = `Encontre o videoID do YouTube para o exercício: ${name}. Retorne JSON { "videoId": "..." }.`;
  const res = await fetch("/api/generate-proposal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemInstruction: "Retorne apenas JSON." })
  });
  return await res.json();
}

