import { ChatMessage, TrainingPlan, DietPlan } from "../types";
import { apiUrl, apiHeaders, API_BASE, HUB_API_KEY } from './apiBase';

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
6. ROTEAMENTO POR ABA (MUITO IMPORTANTE): O app tem abas separadas para Aquecimento, Treino (força) e Cardio. Ao montar a proposta JSON de treino, cada item dentro de "exercises" (em cada "day") DEVE ter um campo "category" com um dos valores exatos: "aquecimento", "treino" ou "cardio". Itens de mobilidade/ativação/alongamento inicial vão em "aquecimento" (ex: "Mobilidade de ombro", "Ativação de glúteo"). Exercícios de força/hipertrofia vão em "treino". Esteira/corrida/bike/elíptico/HIIT vão em "cardio" — nesses itens, use o campo "reps" para indicar a duração em minutos (ex: reps: "15") e "notes" para o modo (corrida, esteira ou bicicleta) e intensidade. Nunca deixe um exercício sem "category". O app se encarrega de separar automaticamente cada categoria para a aba correta.
6. LINGUAGEM: No chat, use um tom de "IA de Alta Performance": preciso, direto e motivador. Use português do Brasil.
7. RESPOSTAS: Nunca dê respostas genéricas. Se solicitado um treino, elabore a divisão (ex: Push/Pull/Legs) com justificativa técnica.
8. HIPER-PERSONALIZAÇÃO: Você DEVE atuar como o treinador mais personalizado do mundo. Antes de gerar treinos, SE não houver contexto suficiente, questione o usuário sobre: objetivo principal, nível atual (iniciante/avançado), tempo disponível por dia, lesões/dores, dias de treino na semana, peso, altura e equipamentos disponíveis. NUNCA gere um treino genérico. Adapte cada exercício, série, e repetição à realidade ESTIVA e única do usuário e explique o PORQUÊ de cada escolha.
9. SEQUÊNCIA TREINO -> DIETA: Assim que o usuário aceitar um plano de treino, você vai receber automaticamente uma mensagem pedindo pra montar a dieta em seguida. Antes de gerar a proposta de dieta:
   a) Confira se o perfil do usuário (seção [AVALIAÇÃO DE CORPO E DIETA] abaixo) já informou quais suplementos ele usa. Se já informou algo diferente de vazio/"Nenhum", USE essa informação diretamente na dieta, sem perguntar de novo.
   b) Se o perfil não informou nenhum suplemento (vazio ou "Nenhum"), PERGUNTE ao usuário, antes de montar a dieta: "Você já usa algum suplemento (creatina, whey protein, BCAA, multivitamínico)? Se sim, quais? Se não, posso sugerir alguns que ajudam a ter resultados mais rápidos." Espere a resposta antes de gerar o JSON da dieta.
   c) Quando for gerar a proposta de dieta em JSON, inclua SEMPRE dois campos extras, além de "meals": "aguaLitrosDia" (número, litros de água recomendados por dia, calculado a partir do peso/objetivo do usuário -- regra prática: ~35ml por kg de peso corporal, ajustando pra cima em dias de treino/cardio intenso) e "suplementos" (array de objetos {"nome", "quantidade", "horario"} -- os que o usuário já usa OU os que você sugeriu e ele aceitou, com dose e horário de tomar cada um, ex: "Creatina: 5g, ao acordar").`;

/**
 * Atualiza a URL e Chave de API do Cérebro Externo
 */
export async function updateNeuralLinkUrl(url?: string, apiKey?: string): Promise<any> {
  try {
    const res = await fetch(apiUrl("/api/neural-link/config"), {
      method: "POST",
      headers: apiHeaders(),
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
    // Não existe mais um "cérebro externo" configurável separado -- o
    // IronMind AI já é o motor direto. Usamos /api/ping (sempre existiu,
    // sempre funciona) só pra confirmar que o backend está de pé.
    const res = await fetch(apiUrl("/api/ping"));
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { online: data.status === 'pong', target: API_BASE || '(mesmo domínio)', apiKey: HUB_API_KEY ? '••••••••' : null };
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
 * Recupera e formata dados de perfil do usuário a partir do localStorage
 */
function getProfileContext(userProfileFromParams?: any): { profileObj: any, contextText: string } {
  let profileData: any = null;
  
  // 1. Tenta carregar do localStorage chave 'ironmind_user'
  try {
    const saved = localStorage.getItem('ironmind_user');
    if (saved) {
      profileData = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Erro ao ler ironmind_user:", e);
  }

  // 2. Fallbacks
  if (!profileData) {
    try {
      const saved = localStorage.getItem('profile');
      if (saved) {
        profileData = JSON.parse(saved);
      }
    } catch {}
  }

  if (!profileData && userProfileFromParams) {
    profileData = userProfileFromParams;
  }

  if (!profileData) {
    return { profileObj: null, contextText: "" };
  }

  // Mapeamento e normalização dos nomes de variáveis
  const name = profileData.name || profileData.nome || "Não informado";
  const age = profileData.age || profileData.idade || "Não informado";
  const weight = profileData.weight || profileData.peso || "Não informado";
  const height = profileData.height || profileData.altura || "Não informado";
  const gender = profileData.gender || "Não informado";
  const objective = profileData.objective || profileData.objetivo || "Não informado";
  const level = profileData.experienceLevel || profileData.level || profileData.nivel || "Não informado";
  const daysPerWeek = profileData.daysPerWeek || profileData.frequencia || "Não informado";
  const timePerWorkout = profileData.timePerWorkout || "Não informado";
  const injuries = profileData.injuries || profileData.lesoes || "Nenhuma";
  const dietRestrictions = profileData.dietaryRestrictions || profileData.restricoes || "Nenhuma";

  const contextText = `

[DADOS CRÍTICOS DO PERFIL DO USUÁRIO]:
- Nome: ${name}
- Idade: ${age} anos
- Peso: ${weight} kg
- Altura: ${height} cm
- Gênero: ${gender}
- Objetivo Principal: ${objective}
- Nível de Treinamento: ${level}
- Frequência Semanal: ${daysPerWeek} dias de treino por semana
- Duração das Sessões: ${timePerWorkout} minutos por treino
- Lesões/Dores/Limitações Coorporais: ${injuries}
- Restrições Alimentares/Dieta: ${dietRestrictions}
${buildBodyDietContext(profileData.bodyDietProfile)}
${buildCheckinContext(profileData.checkinHistory)}

Você DEVE usar rigorosamente essas informações para gerar os treinos e dietas altamente personalizados, adaptados para o peso, objetivo, limitações físicas e nível especificados. Não proponha exercícios conflitantes com as lesões listadas ou alimentos conflitantes com as restrições alimentares.`;

  return { profileObj: profileData, contextText };
}

const REGION_LABELS: Record<string, string> = {
  abdomen: 'Abdômen', bracos: 'Braços', pernas: 'Pernas', gluteos: 'Glúteos', peito_ombros: 'Peito/Ombros',
};
const LEVEL_LABELS: Record<number, string> = { 1: 'baixo/pouco definido', 2: 'médio', 3: 'alto/bem definido' };

/**
 * Monta o bloco de contexto da Avaliação de Corpo & Dieta (aba Perfil ->
 * Corpo & Dieta), quando o usuário já preencheu. Usado tanto pra sugestão
 * de treino quanto de dieta -- o mesmo treinador de IA lê tudo isso.
 */
function buildBodyDietContext(bd: any): string {
  if (!bd) return '';

  const lines: string[] = ['\n[AVALIAÇÃO DE CORPO E DIETA (preenchida pelo usuário)]:'];

  if (bd.sexo) lines.push(`- Sexo: ${bd.sexo}`);

  if (bd.medidas) {
    const m = bd.medidas;
    const parts = [
      m.cintura && `cintura ${m.cintura}cm`,
      m.quadril && `quadril ${m.quadril}cm`,
      m.peito && `peito ${m.peito}cm`,
      m.braco && `braço ${m.braco}cm`,
      m.coxa && `coxa ${m.coxa}cm`,
    ].filter(Boolean);
    if (parts.length) lines.push(`- Medidas: ${parts.join(', ')}`);
  }

  if (bd.tipoCorpoAtual) lines.push(`- Tipo de corpo (autopercepção): ${bd.tipoCorpoAtual}`);

  if (bd.autopercepcaoAtual) {
    const parts = Object.entries(bd.autopercepcaoAtual).map(([regiao, lvl]) =>
      `${REGION_LABELS[regiao] || regiao}: ${LEVEL_LABELS[lvl as number] || lvl}`
    );
    if (parts.length) lines.push(`- Como se vê hoje, por região: ${parts.join('; ')}`);
  }

  if (bd.metaCorpo) {
    const parts = Object.entries(bd.metaCorpo).map(([regiao, lvl]) =>
      `${REGION_LABELS[regiao] || regiao}: ${LEVEL_LABELS[lvl as number] || lvl}`
    );
    if (parts.length) lines.push(`- Meta de corpo, por região (PRIORIZE exercícios pra essas regiões): ${parts.join('; ')}`);
  }

  if (bd.dieta) {
    const d = bd.dieta;
    if (d.alimentosPreferidos) lines.push(`- Alimentos preferidos: ${d.alimentosPreferidos}`);
    if (d.facilidadeHorarios) lines.push(`- Facilidade pra manter horário das refeições: ${d.facilidadeHorarios}`);
    const supps = [...(d.suplementos || [])];
    if (d.suplementoOutro) supps.push(d.suplementoOutro);
    if (supps.length) lines.push(`- Suplementos em uso: ${supps.join(', ')}`);
    if (d.aguaLitrosDia) lines.push(`- Ingestão de água: ${d.aguaLitrosDia}L/dia`);
  }

  if (bd.sono) {
    const s = bd.sono;
    const parts = [s.qualidade && `qualidade ${s.qualidade}`, s.horasPorNoite && `${s.horasPorNoite}h/noite`].filter(Boolean);
    if (parts.length) lines.push(`- Sono: ${parts.join(', ')}`);
  }

  if (bd.preTreino?.quer) {
    const regioes = (bd.preTreino.regioes || []).map((r: string) => REGION_LABELS[r] || r).join(', ');
    lines.push(`- Quer bloco de ativação muscular pré-treino${regioes ? `, focado em: ${regioes}` : ''}.`);
  }

  if (lines.length === 1) return ''; // nada preenchido
  lines.push('\nUse essa avaliação pra priorizar exercícios nas regiões da meta de corpo, respeitar a facilidade/dificuldade de horários na dieta sugerida, considerar os suplementos já em uso (não repetir sugestão do que já usa), e incluir ativação muscular pré-treino se solicitado.');
  return lines.join('\n');
}

/**
 * Resumo compacto dos últimos check-ins semanais (aba Check-in), pra o
 * treinador enxergar a TENDÊNCIA (energia caindo, dor recorrente, adesão
 * piorando) mesmo que essas mensagens já tenham "rolado pra fora" do
 * histórico de chat bruto (que só guarda as últimas ~50 mensagens).
 */
function buildCheckinContext(checkinHistory: any[] | undefined): string {
  if (!checkinHistory || checkinHistory.length === 0) return '';

  const recentes = [...checkinHistory].slice(-6); // últimos 6 check-ins
  const linhas = recentes.map((c) => {
    const data = new Date(c.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const partes = [
      `${data}: treino ${c.adesaoTreino}`,
      `dieta ${c.adesaoDieta}`,
      `energia ${c.energia}/5`,
      c.peso ? `peso ${c.peso}kg` : null,
      c.dorOuDificuldade ? `dor/dificuldade: "${c.dorOuDificuldade}"` : null,
    ].filter(Boolean);
    return `  - ${partes.join(', ')}`;
  });

  return `
[HISTÓRICO DE CHECK-INS SEMANAIS (mais recentes primeiro no chat, mas listados aqui em ordem cronológica)]:
${linhas.join('\n')}

Observe a TENDÊNCIA ao longo dessas semanas (energia subindo/caindo, adesão piorando/melhorando, dor recorrente na mesma região) -- não só o check-in mais recente isolado -- e ajuste sua recomendação considerando essa evolução.`;
}


/**
 * Chat com o Treinador IronMind (Via Servidor)
 */
export async function chatWithCoach(history: ChatMessage[], message: string, userProfile?: any, userId?: string, allowFallback: boolean = false): Promise<ChatMessage> {
  if (!userId) saveChatHistory(history);

  try {
    const { profileObj, contextText } = getProfileContext(userProfile);
    const finalSystemInstruction = systemInstruction + contextText;

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

    const res = await fetch(apiUrl("/api/chat"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ 
        messages: stabilized, 
        systemInstruction: finalSystemInstruction, 
        allowFallback, 
        userId: userId || "anonymous",
        userProfile: profileObj || userProfile 
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
    const { profileObj, contextText } = getProfileContext(userProfile);
    const finalSystemInstruction = systemInstruction + contextText;

    const schemaRef = isTraining 
      ? `{"name": "Treino ABC", "days": [{"label": "Treino A - Peito e Tríceps", "exercises": [{"name": "Mobilidade de ombro", "sets": 1, "reps": "8", "category": "aquecimento"}, {"name": "Supino", "sets": 3, "reps": "12", "rest": "60", "category": "treino"}, {"name": "Esteira", "sets": 1, "reps": "15", "notes": "esteira, ritmo moderado", "category": "cardio"}]}, {"label": "Treino B - Costas e Bíceps", "exercises": [{"name": "Remada", "sets": 3, "reps": "12", "rest": "60", "category": "treino"}]}]}`
      : `{"name": "Dieta Bulking", "meals": [{"name": "Café", "time": "08:00", "items": ["Aveia", "Ovos"]}]}`;

    const prompt = `Com base neste contexto: "${context}", gere uma proposta estruturada de ${isTraining ? 'treino' : 'dieta'} seguindo estritamente este formato JSON: ${schemaRef}`;
    
    const res = await fetch(apiUrl("/api/generate-proposal"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ 
        prompt, 
        systemInstruction: finalSystemInstruction, 
        allowFallback, 
        userId: userId || "anonymous",
        userProfile: profileObj || userProfile 
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
    const { profileObj } = getProfileContext(userProfile);
    const prompt = "Analise esta foto de comida, estime as calorias e classifique color (green/yellow/red). Retorne JSON.";
    const cleanBase64 = imageBase64.split(",")[1] || imageBase64;

    const res = await fetch(apiUrl("/api/analyze-image"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ 
        imageBase64: cleanBase64, 
        prompt, 
        allowFallback, 
        userId: userId || "anonymous",
        userProfile: profileObj || userProfile 
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
  const res = await fetch(apiUrl("/api/generate-proposal"), {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ prompt, systemInstruction: "Você é um especialista em biomecânica." })
  });
  return await res.json();
}

export async function resolveVideoDirectly(name: string) {
  const prompt = `Encontre o videoID do YouTube para o exercício: ${name}. Retorne JSON { "videoId": "..." }.`;
  const res = await fetch(apiUrl("/api/generate-proposal"), {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ prompt, systemInstruction: "Retorne apenas JSON." })
  });
  return await res.json();
}

