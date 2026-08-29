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
 * Diagnóstico do Link Neural
 */
export async function diagnoseNeuralLink(): Promise<any> {
  // Sempre inclui target/apiKey, tanto no sucesso quanto na falha --
  // antes esses dois campos só apareciam quando o ping dava certo, e
  // no painel de diagnóstico (justamente a tela que existe pra ajudar
  // a entender uma falha) eles ficavam em branco bem na hora que mais
  // precisava deles.
  const target = API_BASE || '(mesmo domínio)';
  const apiKey = HUB_API_KEY ? '••••••••' : null;

  try {
    // Não existe mais um "cérebro externo" configurável separado -- o
    // IronMind AI já é o motor direto. Usamos /api/ping (sempre existiu,
    // sempre funciona) só pra confirmar que o backend está de pé.
    const res = await fetch(apiUrl("/api/ping"));
    if (!res.ok) return { online: false, target, apiKey, error: `HTTP ${res.status} (${res.statusText || 'sem detalhe'})` };
    const data = await res.json();
    return { online: data.status === 'pong', target, apiKey };
  } catch (error: any) {
    console.error("Diagnostic Error:", error);
    // Preserva a mensagem/nome REAL do erro (ex: "Failed to fetch",
    // "NetworkError", timeout, etc) em vez de uma string genérica --
    // é justamente essa mensagem que diferencia "backend fora do ar"
    // de "bloqueado por CORS" de "URL errada", e antes ela nunca
    // chegava a aparecer pro usuário nem pra mim quando pedia print.
    return { online: false, target, apiKey, error: `${error?.name || 'Erro'}: ${error?.message || 'Falha ao conectar.'}` };
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
    } catch (e) {
      console.warn("Erro ao ler fallback 'profile' do localStorage:", e);
    }
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
${buildLoadHistoryContext(profileData.loadHistory)}
${buildCardioHistoryContext(profileData.cardioSessionHistory)}
${buildMeasurementsContext(profileData.measurements)}
${buildConsistencyContext(profileData.streak, profileData.totalWorkoutsCompleted)}
${buildCurrentPlansContext(profileData.trainingPlan, profileData.warmupPlan, profileData.cardioPlan, profileData.dietPlan)}
${buildWaterContext(profileData.waterIntake)}
${buildCheckinContext(profileData.checkinHistory, profileData.lastCheckinAt)}

Você DEVE usar rigorosamente essas informações para gerar os treinos e dietas altamente personalizados, adaptados para o peso, objetivo, limitações físicas e nível especificados. Não proponha exercícios conflitantes com as lesões listadas ou alimentos conflitantes com as restrições alimentares.`;

  return { profileObj: profileData, contextText };
}

const REGION_LABELS: Record<string, string> = {
  costas: 'Ombros e Costas', torso: 'Peito/Abdômen', gluteos: 'Quadril e Glúteos', pernas: 'Pernas',
  // Ids antigos (formato anterior à atualização das fotos) -- mantidos
  // só de precaução, caso algum perfil salvo ainda tenha isso.
  abdomen: 'Abdômen', bracos: 'Braços', peito_ombros: 'Peito/Ombros',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  gordo: 'Gordo/Endomorfa', quadrado: 'Quadrado/Retangular', triangular: 'Triangular/Pera', vshape: 'Ombros Largos',
};

const GLUTEOS_LEVEL_TEXT = ['Plano/sem volume', 'Leve volume', 'Firme e definido', 'Bem definido', 'Hipertrofiado/volume acentuado'];
// Linha 1 das fotos de Costas/Torso é a referência "como está hoje" (sem
// legenda no material original); linhas 2-4 são níveis de meta,
// progressivamente mais definidos -- ver bodyDietIcons.tsx no app.
const COSTAS_TORSO_ROW_TEXT: Record<number, string> = {
  1: 'referência do estado atual', 2: 'meta leve (levemente mais definido)', 3: 'meta moderada (moderadamente definido)', 4: 'meta alta (bem definido/hipertrofiado)',
};

/**
 * Traduz o id de uma foto escolhida (ex: "gluteos_nivel_4",
 * "costas_3_2", "pernas_7") pra uma descrição legível pra IA. Os ids
 * codificam região/linha/coluna ou nível conforme a região -- ver
 * BODY_REGIONS em bodyDietIcons.tsx do app pra a estrutura exata.
 */
function describeBodyOption(regionId: string, optionId: string): string {
  if (regionId === 'gluteos') {
    const m = optionId.match(/gluteos_nivel_(\d+)/);
    if (m) return GLUTEOS_LEVEL_TEXT[Number(m[1]) - 1] || optionId;
  }
  if (regionId === 'costas' || regionId === 'torso') {
    const m = optionId.match(/_(\d+)_(\d+)$/);
    if (m) return COSTAS_TORSO_ROW_TEXT[Number(m[1])] || optionId;
  }
  if (regionId === 'pernas') {
    const m = optionId.match(/pernas_(\d+)/);
    if (m) {
      const n = Number(m[1]);
      return n <= 5 ? `referência visual atual (opção ${n} de 5)` : `referência visual de meta (opção ${n - 5} de 5)`;
    }
  }
  // Formato antigo (nível numérico 1/2/3 direto) -- fallback de precaução.
  if (optionId === '1' || optionId === '2' || optionId === '3') {
    return ['baixo/pouco definido', 'médio', 'alto/bem definido'][Number(optionId) - 1];
  }
  return optionId;
}

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

  if (bd.tipoCorpoAtual) lines.push(`- Tipo de corpo (autopercepção): ${BODY_TYPE_LABELS[bd.tipoCorpoAtual] || bd.tipoCorpoAtual}`);

  if (bd.autopercepcaoAtual) {
    const parts = Object.entries(bd.autopercepcaoAtual).map(([regiao, optionId]) =>
      `${REGION_LABELS[regiao] || regiao}: ${describeBodyOption(regiao, optionId as string)}`
    );
    if (parts.length) lines.push(`- Como se vê hoje, por região: ${parts.join('; ')}`);
  }

  if (bd.metaCorpo) {
    const parts = Object.entries(bd.metaCorpo).map(([regiao, optionId]) =>
      `${REGION_LABELS[regiao] || regiao}: ${describeBodyOption(regiao, optionId as string)}`
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
    const parts = [s.qualidade && `qualidade ${s.qualidade}`];
    if (s.horarioDormir) parts.push(`dorme por volta de ${s.horarioDormir}`);
    if (s.horarioAcordar) parts.push(`acorda por volta de ${s.horarioAcordar}`);

    if (s.horarioDormir && s.horarioAcordar) {
      const [dh, dm] = s.horarioDormir.split(':').map(Number);
      const [ah, am] = s.horarioAcordar.split(':').map(Number);
      let minutosDormindo = (ah * 60 + am) - (dh * 60 + dm);
      if (minutosDormindo <= 0) minutosDormindo += 24 * 60; // passou da meia-noite
      const horasDormindo = (minutosDormindo / 60).toFixed(1);
      parts.push(`~${horasDormindo}h de sono/noite`);
    }

    if (parts.filter(Boolean).length) lines.push(`- Sono: ${parts.filter(Boolean).join(', ')}`);

    if (s.horarioDormir) {
      lines.push(`  IMPORTANTE: ao sugerir suplementos ou horário de pré-treino/cafeína, NÃO recomende estimulantes (cafeína, pré-treino, termogênicos) muito próximo do horário de dormir (${s.horarioDormir}) -- isso pode prejudicar o sono do usuário.`);
    }
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
function buildCheckinContext(checkinHistory: any[] | undefined, lastCheckinAt?: number): string {
  const partesFinais: string[] = [];

  if (lastCheckinAt) {
    const diasSemCheckin = Math.floor((Date.now() - lastCheckinAt) / 86400000);
    if (diasSemCheckin >= 7) {
      partesFinais.push(`[LEMBRETE PARA VOCÊ, TREINADOR]: já se passaram ${diasSemCheckin} dias desde o último check-in semanal do usuário. Aproveite esta conversa para perguntar proativamente como foi a semana dele (adesão ao treino/dieta, energia, alguma dor ou dificuldade) -- não espere ele perguntar primeiro. Pode ser algo natural tipo "Antes de continuarmos, como foi sua semana de treino?".`);
    }
  }

  if (!checkinHistory || checkinHistory.length === 0) return partesFinais.join('\n');

  const recentes = [...checkinHistory].slice(-6); // últimos 6 check-ins
  const linhas = recentes.map((c) => {
    const data = new Date(c.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const partes = [
      `${data}: treino ${c.adesaoTreino}`,
      `dieta ${c.adesaoDieta}`,
      `energia ${c.energia}/5`,
      c.peso ? `peso ${c.peso}kg` : null,
      c.dorOuDificuldade ? `dor/dificuldade: "${c.dorOuDificuldade}"` : null,
      c.observacoes ? `observação: "${c.observacoes}"` : null,
    ].filter(Boolean);
    return `  - ${partes.join(', ')}`;
  });

  partesFinais.push(`
[HISTÓRICO DE CHECK-INS SEMANAIS (mais recentes primeiro no chat, mas listados aqui em ordem cronológica)]:
${linhas.join('\n')}

Observe a TENDÊNCIA ao longo dessas semanas (energia subindo/caindo, adesão piorando/melhorando, dor recorrente na mesma região) -- não só o check-in mais recente isolado -- e ajuste sua recomendação considerando essa evolução.`);

  return partesFinais.join('\n');
}

/**
 * Progressão de carga por exercício (aba Histórico -> Cargas), pra o
 * treinador saber o nível de força ATUAL antes de prescrever séries/
 * repetições/carga inicial -- sem isso, cada treino novo partia do
 * zero sem noção nenhuma do que o usuário já levanta.
 */
function buildLoadHistoryContext(loadHistory: any[] | undefined): string {
  if (!loadHistory || loadHistory.length === 0) return '';

  const byExercise = new Map<string, any[]>();
  for (const entry of loadHistory) {
    const list = byExercise.get(entry.exercise) || [];
    list.push(entry);
    byExercise.set(entry.exercise, list);
  }

  const linhas: string[] = [];
  for (const [exercise, entries] of byExercise) {
    const sorted = [...entries].sort((a, b) => a.date - b.date);
    const first = sorted[0], last = sorted[sorted.length - 1];
    const tendencia = sorted.length >= 2 ? (last.weight > first.weight ? 'subindo' : last.weight < first.weight ? 'caindo' : 'estável') : 'único registro';
    linhas.push(`  - ${exercise}: carga mais recente ${last.weight}kg (${sorted.length} registro(s), tendência ${tendencia})`);
  }

  return `
[PROGRESSÃO DE CARGA POR EXERCÍCIO (aba Histórico)]:
${linhas.join('\n')}

Use essas cargas como ponto de partida real pra prescrever séries/repetições/carga -- não sugira carga genérica pra exercícios que já têm histórico aqui.`;
}

/**
 * Medidas corporais (aba Histórico -> Medidas: cintura, braço, peito,
 * etc, ao longo do tempo) -- diferente da avaliação Corpo & Dieta
 * (que é uma foto única do momento do cadastro), isso mostra evolução
 * real medida em centímetro.
 */
function buildMeasurementsContext(measurements: any[] | undefined): string {
  if (!measurements || measurements.length === 0) return '';

  const byLabel = new Map<string, any[]>();
  for (const entry of measurements) {
    const list = byLabel.get(entry.label) || [];
    list.push(entry);
    byLabel.set(entry.label, list);
  }

  const linhas: string[] = [];
  for (const [label, entries] of byLabel) {
    const sorted = [...entries].sort((a, b) => a.date - b.date);
    const last = sorted[sorted.length - 1];
    const delta = sorted.length >= 2 ? last.value - sorted[0].value : null;
    linhas.push(`  - ${label}: ${last.value}${last.unit}${delta !== null ? ` (variação de ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${last.unit} desde o primeiro registro)` : ''}`);
  }

  return `
[MEDIDAS CORPORAIS REGISTRADAS (aba Histórico)]:
${linhas.join('\n')}`;
}

/**
 * Consistência real de treino (streak + total de treinos concluídos,
 * calculados em src/lib/streak.ts sempre que a pessoa termina 100% de
 * um dia de treino). Antes disso, a IA não tinha nenhuma noção de
 * ADESÃO real -- só via os check-ins subjetivos ("difícil"/"fácil"),
 * não se a pessoa está de fato terminando os treinos ou não.
 */
function buildConsistencyContext(streak: any | undefined, totalWorkoutsCompleted: number | undefined): string {
  if (!streak && !totalWorkoutsCompleted) return '';

  const parts: string[] = [];
  if (streak?.count) parts.push(`sequência atual de ${streak.count} dia(s) seguidos treinando`);
  if (streak?.longestStreak) parts.push(`recorde pessoal de ${streak.longestStreak} dia(s) seguidos`);
  if (totalWorkoutsCompleted) parts.push(`${totalWorkoutsCompleted} treino(s) concluído(s) no total (100% das séries do dia)`);

  if (parts.length === 0) return '';

  return `
[CONSISTÊNCIA REAL DE TREINO]:
${parts.map(p => `  - ${p}`).join('\n')}

Use isso pra calibrar o tom e a exigência: sequência alta = pode aumentar volume/intensidade com confiança; sequência baixa/zerada recentemente após um recorde maior = provável quebra de rotina, considere reduzir a barreira de entrada (treino mais curto/simples) pra ela retomar o hábito antes de intensificar de novo.`;
}

/**
 * Resumo compacto dos planos ATIVOS (treino, aquecimento, cardio,
 * dieta) -- sem isso, se o usuário pede pra "ajustar o treino B" ou
 * "trocar esse exercício de perna", a IA não tinha NENHUMA visão do
 * que já existe fora da conversa aberta no momento (se o chat foi
 * limpo, ou o plano foi criado numa sessão anterior, ela ficava cega).
 */
function buildCurrentPlansContext(trainingPlan: any, warmupPlan: any, cardioPlan: any, dietPlan: any): string {
  const lines: string[] = [];

  const summarizeTrainingPlan = (plan: any, label: string) => {
    if (!plan?.days?.length) return;
    lines.push(`- ${label} ATIVO ("${plan.name || 'sem nome'}"):`);
    for (const day of plan.days) {
      const exercises = (day.exercises || []).map((ex: any) => `${ex.name} (${ex.sets}x${ex.reps}${ex.weight ? `, ${ex.weight}` : ''})`).join('; ');
      lines.push(`    ${day.label}: ${exercises || 'sem exercícios'}`);
    }
  };

  summarizeTrainingPlan(trainingPlan, 'Plano de Treino');
  summarizeTrainingPlan(warmupPlan, 'Plano de Aquecimento');
  summarizeTrainingPlan(cardioPlan, 'Plano de Cardio');

  if (dietPlan?.meals?.length) {
    lines.push(`- Plano de Dieta ATIVO ("${dietPlan.name || 'sem nome'}"):`);
    for (const meal of dietPlan.meals) {
      lines.push(`    ${meal.time} ${meal.name}: ${(meal.items || []).join(', ')}`);
    }
  }

  if (lines.length === 0) return '';

  return `
[PLANOS ATIVOS DO USUÁRIO AGORA]:
${lines.join('\n')}

Se o usuário pedir pra ajustar/trocar/modificar algo, parta do que já está listado acima -- não recrie do zero nem peça pra ele descrever o plano que já existe.`;
}

/**
 * Histórico de sessões de cardio livre (aba Cardio -> Clássico:
 * corrida/esteira/bike), pra a IA saber a frequência/volume real de
 * cardio -- antes disso não existia esse dado nenhum, sessões
 * terminadas não deixavam rastro.
 */
function buildCardioHistoryContext(cardioSessionHistory: any[] | undefined): string {
  if (!cardioSessionHistory || cardioSessionHistory.length === 0) return '';

  const now = Date.now();
  const last30Days = cardioSessionHistory.filter(s => now - s.date < 30 * 24 * 60 * 60 * 1000);
  if (last30Days.length === 0) return '';

  const totalTime = last30Days.reduce((s, x) => s + x.time, 0);
  const totalDistance = last30Days.reduce((s, x) => s + x.distance, 0);
  const porTipo = new Map<string, number>();
  for (const s of last30Days) porTipo.set(s.type, (porTipo.get(s.type) || 0) + 1);

  const recentes = [...last30Days].slice(-5).map(s => {
    const data = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `  - ${data}: ${s.type}, ${s.time}min, ${s.distance}km, ${s.calories}kcal`;
  });

  return `
[HISTÓRICO DE CARDIO LIVRE (últimos 30 dias)]:
  - ${last30Days.length} sessão(ões), ${totalTime}min total, ${totalDistance.toFixed(1)}km total
  - Por tipo: ${[...porTipo.entries()].map(([t, c]) => `${t} (${c}x)`).join(', ')}
Últimas sessões:
${recentes.join('\n')}`;
}

/**
 * Consumo real de água dos últimos 7 dias (aba Água), comparado com a
 * meta declarada na Avaliação de Corpo & Dieta -- diferente da meta em
 * si (que já é coberta por buildBodyDietContext), isso mostra se a
 * pessoa REALMENTE está batendo a meta ou não.
 */
function buildWaterContext(waterIntake: Record<string, number> | undefined): string {
  if (!waterIntake) return '';
  const entries = Object.entries(waterIntake);
  if (entries.length === 0) return '';

  const sorted = entries.sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  const media = sorted.reduce((s, [, v]) => s + v, 0) / sorted.length;

  return `
[CONSUMO REAL DE ÁGUA (últimos ${sorted.length} dia(s) registrados)]:
  - Média: ${media.toFixed(1)} copo(s)/dia
  - Detalhe: ${sorted.map(([data, v]) => `${data.slice(5)}: ${v}`).join(', ')}`;
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
      headers: await apiHeaders(),
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
 * Gera um insight curto sobre a semana (peso, progressão de carga,
 * check-ins) usando o mesmo endpoint de chat, mas como uma chamada
 * avulsa -- não entra no histórico visível de conversa com o
 * Treinador, é só pra essa análise pontual.
 */
export async function generateWeeklyInsights(weeklySummary: string, userProfile?: any): Promise<string> {
  const { contextText } = getProfileContext(userProfile);

  const prompt = `Analise os dados da última semana deste aluno e escreva um insight curto (3-5 frases, tom direto e motivador, português do Brasil). Aponte padrões, correlações entre os dados (ex: energia baixa em dias de pior adesão, progressão de carga parada ou subindo), e UMA sugestão prática pra semana que vem. Não repita os números de forma robótica, interprete-os.

DADOS DA SEMANA:
${weeklySummary}`;

  const res = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: await apiHeaders(),
    body: JSON.stringify({
      messages: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: `Você é o IronMind Neural, o treinador IA do app. Responda em texto corrido (sem markdown de tabela, sem tags de proposta).${contextText}`,
      userId: "anonymous",
    })
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) {
    const errorData = contentType.includes("application/json") ? await res.json() : { message: await res.text() };
    throw new Error(errorData.message || errorData.error || "Falha ao gerar insights.");
  }

  if (!contentType.includes("application/json")) {
    return (await res.text()).trim();
  }
  const data = await res.json();
  return data.text;
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
      headers: await apiHeaders(),
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
    // Mesmo padrão de personalização usado em chatWithCoach/generateProposal:
    // monta o contexto completo do usuário (perfil, lesões, objetivo,
    // restrições alimentares, avaliação corpo & dieta, etc) e manda como
    // systemInstruction -- antes disso a análise de foto nunca sabia nada
    // sobre quem estava perguntando.
    const { contextText } = getProfileContext(userProfile);
    const finalSystemInstruction = systemInstruction + contextText;
    const prompt = "Analise esta foto de comida e estime as calorias, considerando o objetivo e as restrições alimentares do usuário.";
    const cleanBase64 = imageBase64.split(",")[1] || imageBase64;

    const res = await fetch(apiUrl("/api/analyze-image"), {
      method: "POST",
      headers: await apiHeaders(),
      body: JSON.stringify({ 
        imageBase64: cleanBase64, 
        prompt, 
        systemInstruction: finalSystemInstruction,
        allowFallback, 
        userId: userId || "anonymous",
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
    // Preserva o motivo real do erro (ex: "Unauthorized", detalhe de
    // rede, etc) em vez de sempre trocar por uma mensagem genérica --
    // isso escondia a causa de verdade sempre que algo dava errado
    // aqui, mesmo quando o servidor já mandava um detalhe útil.
    throw new Error(error?.message || "Não foi possível analisar esta imagem.");
  }
}

export async function getExerciseGuide(name: string) {
  const prompt = `Gere um guia técnico JSON para o exercício: ${name}.`;
  const res = await fetch(apiUrl("/api/generate-proposal"), {
    method: "POST",
    headers: await apiHeaders(),
    body: JSON.stringify({ prompt, systemInstruction: "Você é um especialista em biomecânica." })
  });
  return await res.json();
}

export async function resolveVideoDirectly(name: string) {
  // Busca real na API do YouTube (vídeo de verdade, existente) em vez
  // de pedir pra IA adivinhar um videoId -- isso resultava em vídeos
  // inexistentes na maior parte das vezes.
  const res = await fetch(apiUrl("/api/resolve-exercise-video"), {
    method: "POST",
    headers: await apiHeaders(),
    body: JSON.stringify({ exerciseName: name })
  });
  return await res.json();
}

