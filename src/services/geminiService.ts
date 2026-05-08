import { ChatMessage, TrainingPlan, DietPlan } from "../types";

// Chave para persistência no localStorage
const STORAGE_KEY = 'ironmind_chat_history';

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
 * Função utilitária para fetch com lógica de Retry (tentativa automática)
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Se a resposta for OK, retorna imediatamente
    if (response.ok) return response;
    
    // Se for um erro de rede ou servidor (5xx) e ainda tiver tentativas, tenta novamente
    if (retries > 0 && (response.status >= 500 || response.status === 429)) {
      console.warn(`Instabilidade detectada em ${url}. Tentando novamente... (${retries} tentativas restantes)`);
      // Pequeno delay antes de tentar novamente (Backoff exponencial simples)
      await new Promise(res => setTimeout(res, 1000 * (4 - retries)));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    return response;
  } catch (error) {
    // Se houver erro de rede (ex: sem internet ou timeout)
    if (retries > 0) {
      console.warn(`Erro de conexão fatal. Tentando reconectar... (${retries} tentativas restantes)`);
      await new Promise(res => setTimeout(res, 1000 * (4 - retries)));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

/**
 * Função principal de Chat com o Coach IronMind
 */
export async function chatWithCoach(history: ChatMessage[], message: string): Promise<ChatMessage> {
  // Salva o histórico atual antes do envio
  saveChatHistory(history);

  try {
    const response = await fetchWithRetry("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, message }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Gemini Chat Critical Error:", error);
    
    // Tratamento amigável de erros de instabilidade
    const errorMessage = error?.message || String(error);
    
    if (errorMessage.includes("quota") || errorMessage.includes("429")) {
      return { 
        role: 'model', 
        text: "Minha capacidade de processamento atingiu o limite temporário. Por favor, aguarde alguns segundos e tente novamente." 
      };
    }

    return { 
      role: 'model', 
      text: "Detectei uma instabilidade persistente na conexão. Salvei suas mensagens no navegador para evitar perdas; você pode recarregar a página se o problema continuar." 
    };
  }
}

/**
 * Gera propostas de treino ou dieta com retry
 */
export async function generateProposal(type: 'training' | 'diet', context: string): Promise<TrainingPlan | DietPlan> {
  try {
    const response = await fetchWithRetry("/api/proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, context }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Falha ao gerar proposta no servidor");
    }

    return await response.json();
  } catch (error) {
    console.error("Proposal Generation Error:", error);
    throw error;
  }
}

/**
 * Analisa imagem de comida com retry
 */
export async function analyzeFoodImage(imageBase64: string): Promise<{ food: string, calories: number, color: 'green' | 'yellow' | 'red', explanation: string }> {
  try {
    const response = await fetchWithRetry("/api/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Falha na análise da imagem no servidor");
    }

    return await response.json();
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw new Error("Não foi possível processar a imagem devido a uma instabilidade de rede.");
  }
}

/**
 * Busca por um guia técnico de exercício gerado por IA
 */
export async function getExerciseGuide(name: string): Promise<{
  name: string;
  muscle: string;
  setup: string[];
  execution: string[];
  commonMistakes: string[];
  proTip: string;
}> {
  try {
    const response = await fetchWithRetry("/api/exercise-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Falha ao gerar guia no servidor");
    }

    return await response.json();
  } catch (error) {
    console.error("Exercise Guide Fetch Error:", error);
    throw error;
  }
}
