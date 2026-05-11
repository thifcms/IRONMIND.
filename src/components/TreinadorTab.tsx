import { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { Send, Check, Loader2, Trash2, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { ChatMessage, TrainingPlan, DietPlan } from '../types';
import { chatWithCoach, generateProposal } from '../services/geminiService';
import { checkAIHealth } from '../services/aiManagerService';

interface TreinadorTabProps {
  history: ChatMessage[];
  setHistory: Dispatch<SetStateAction<ChatMessage[]>>;
  onAcceptTraining: (plan: TrainingPlan) => void;
  onAcceptDiet: (plan: DietPlan) => void;
  onClearChat?: () => void;
}

export default function TreinadorTab({ history, setHistory, onAcceptTraining, onAcceptDiet, onClearChat }: TreinadorTabProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{status: string, message: string} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAIHealth().then(setAiStatus);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setHistory(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithCoach(history, input);
      setHistory(prev => [...prev, response]);

      if (response.shouldClearHistory && onClearChat) {
        // Se o servidor sugeriu limpar, o erro já está na mensagem.
        // O usuário já tem o botão de limpar no topo, mas podemos ressaltar aqui.
      }

      // Handle proposal generation
      const text = response.text;
      const lowerText = text.toLowerCase();
      
      // Gatilhos super amplos e redundantes para o Gerente de IA garantir a conexão
      const isTrainingProposal = lowerText.includes('proposta de treino') || lowerText.includes('treino elaborei') || lowerText.includes('divisão de treino') || lowerText.includes('protocolo de treino') || lowerText.includes('treino estruturado') || lowerText.includes('seu novo treino');
      const isDietProposal = lowerText.includes('proposta de dieta') || lowerText.includes('plano alimentar') || lowerText.includes('dieta estruturada') || lowerText.includes('seu novo plano') || lowerText.includes('cardápio');

      if (isTrainingProposal) {
        generateProposal('training', text)
          .then(proposal => {
            setHistory(prev => [...prev, { 
              role: 'model', 
              text: `Protocolo de treino finalizado! Deseja carregar este planejamento para sua aba de Treinos?`,
              proposal: { type: 'training', data: proposal }
            }]);
          })
          .catch(err => {
            console.error("Erro na proposta de treino:", err);
            setHistory(prev => [...prev, { role: 'model', text: "Tive um problema ao formalizar seu treino. Pode tentar novamente em alguns segundos?" }]);
          });
      }

      if (isDietProposal) {
        generateProposal('diet', text)
          .then(proposal => {
            setHistory(prev => [...prev, { 
              role: 'model', 
              text: `Plano alimentar estruturado! Deseja carregar estas refeições para sua aba de Dieta?`,
              proposal: { type: 'diet', data: proposal }
            }]);
          })
          .catch(err => {
            console.error("Erro na proposta de dieta:", err);
            setHistory(prev => [...prev, { role: 'model', text: "Tive um problema ao estruturar seu plano alimentar. Tente novamente em breve." }]);
          });
      }
    } catch (error: any) {
      console.error(error);
      const technicalError = error?.message || String(error);
      setHistory(prev => [...prev, { 
        role: 'model', 
        text: `⚠️ ERRO TÉCNICO DETECTADO:\n${technicalError}\n\nPor favor, reporte isso ao suporte ou verifique a conexão.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a]">
      {/* Header com Status do Gerente de IA */}
      <div className="bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-slate-800 p-2 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 ml-2">
            <div className={`w-2 h-2 rounded-full ${aiStatus?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 leading-none">Gerente de IA</span>
                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300">{aiStatus?.message || 'Verificando...'}</span>
            </div>
        </div>

        <button 
          onClick={onClearChat}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-95 flex items-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[9px] font-black uppercase tracking-widest">Limpar</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 touch-pan-y">
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200 dark:shadow-none' 
                : 'bg-white dark:bg-[#181818] text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-200 dark:border-slate-800'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {msg.text.split(/(IronMind)/gi).map((part, index) => (
                  part.toLowerCase() === 'ironmind' 
                    ? <span key={index} translate="no" className="notranslate font-bold">{part}</span> 
                    : part
                ))}
              </p>
              
              {msg.shouldClearHistory && onClearChat && (
                <button 
                  onClick={onClearChat}
                  className="mt-3 w-full py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Zerar Chat Agora
                </button>
              )}
              
              {msg.proposal && (
                <div className={`mt-3 p-3 rounded-xl border ${
                  msg.role === 'user' 
                    ? 'bg-white/10 border-white/20 text-white' 
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30 text-blue-900 dark:text-blue-300 texture-dots'
                }`}>
                  <p className="text-[8px] font-[1000] uppercase tracking-widest mb-1 opacity-80">
                    Proposta de {msg.proposal.type === 'training' ? 'Treino' : 'Dieta'}
                  </p>
                  <p className="text-sm font-bold mb-2">{msg.proposal.data.name}</p>
                  <button 
                    onClick={() => {
                      if (msg.proposal?.type === 'training') onAcceptTraining(msg.proposal.data);
                      else if (msg.proposal?.type === 'diet') onAcceptDiet(msg.proposal.data);
                    }}
                    className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest transition-all ${
                      msg.role === 'user'
                        ? 'bg-white text-blue-600'
                        : 'bg-blue-600 text-white shadow-md'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Aceitar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-[#181818] rounded-xl rounded-tl-none p-3 flex items-center gap-2 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Calculando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white dark:bg-[#121212] border-t border-slate-200 dark:border-slate-800">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 items-end"
        >
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Falar com a Treinadora..."
            rows={1}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-300 transition-all text-slate-700 min-h-[48px] max-h-32 resize-none"
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="w-12 h-12 bg-blue-600 text-white rounded-xl flex-none flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            <Send className="w-5 h-5 flex-none" />
          </button>
        </form>
      </div>
    </div>
  );
}
