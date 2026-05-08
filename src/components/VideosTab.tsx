import { TrainingPlan, Exercise } from '../types';
import { Play, Video, Info, Sparkles, X, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { EXERCISE_LIBRARY } from '../constants/exercises';
import { getExerciseGuide } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface AIExerciseGuide {
  name: string;
  muscle: string;
  setup: string[];
  execution: string[];
  commonMistakes: string[];
  proTip: string;
}

export default function VideosTab({ plan }: { plan: TrainingPlan }) {
  const allExercises = plan.days.flatMap(day => day.exercises);
  // Agrupar por nome para evitar duplicados na aba de vídeos
  const uniqueExercises = Array.from(new Map(allExercises.map(ex => [ex.name, ex])).values());
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  
  const [guideLoading, setGuideLoading] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<AIExerciseGuide | null>(null);

  const resolveVideoUrl = (ex: Exercise) => {
    // 1. Prioridade: Vídeo já no objeto do exercício
    if (ex.videoUrl) return ex.videoUrl;

    // 2. Segunda opção: Buscar na biblioteca estática
    const libraryMatch = EXERCISE_LIBRARY.find(
      libEx => libEx.name.toLowerCase() === ex.name.toLowerCase()
    );
    if (libraryMatch?.videoUrl) return libraryMatch.videoUrl;

    return null;
  };

  const handleGenerateGuide = async (name: string) => {
    setGuideLoading(name);
    try {
      const guide = await getExerciseGuide(name);
      setSelectedGuide(guide);
    } catch (error) {
      console.error("Failed to generate guide:", error);
    } finally {
      setGuideLoading(null);
    }
  };

  const formatVideoUrl = (rawUrl: string | null) => {
    if (!rawUrl) return null;
    
    let url = rawUrl;
    if (url.includes('youtube.com/watch?v=')) {
      url = url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
      const id = url.split('/').pop()?.split('?')[0];
      url = `https://www.youtube.com/embed/${id}`;
    }
    const connector = url.includes('?') ? '&' : '?';
    return `${url}${connector}autoplay=1&mute=1`;
  };

  const getYouTubeSearchUrl = (name: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent('execução técnica ' + name)}`;
  };

  return (
    <div className="p-6 pb-20 space-y-6 bg-slate-50 overflow-y-auto h-full transition-colors duration-300">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
          <Video className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Biblioteca Técnica</p>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Execução</h2>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {uniqueExercises.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 italic text-slate-400 text-sm">
            Nenhum exercício encontrado no seu plano atual.
          </div>
        ) : uniqueExercises.map((ex) => {
          const videoUrl = resolveVideoUrl(ex);
          
          return (
            <div key={ex.name} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden hover:border-blue-200 transition-all shadow-sm group">
              <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
                {activeVideo === ex.name ? (
                  videoUrl ? (
                    <iframe
                      src={formatVideoUrl(videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      referrerPolicy="no-referrer"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold uppercase tracking-tight">Vídeo não disponível no acervo</p>
                        <p className="text-slate-400 text-[10px] mt-1 italic">Deseja buscar demonstrações externas?</p>
                      </div>
                      <a 
                        href={getYouTubeSearchUrl(ex.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-900/20 hover:bg-red-700 transition-all flex items-center gap-2"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Pesquisar no YouTube
                      </a>
                      <button 
                        onClick={() => setActiveVideo(null)}
                        className="text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-white"
                      >
                        Voltar
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    <div className="text-center p-6 transition-all duration-500 group-hover:scale-110">
                      <Play className="w-16 h-16 text-slate-700 mb-2 mx-auto" />
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Toque para Iniciar</p>
                    </div>
                    
                    <button 
                      onClick={() => setActiveVideo(ex.name)}
                      className="absolute inset-0 flex items-center justify-center bg-blue-600/5 hover:bg-blue-600/10 transition-colors"
                    >
                      <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {videoUrl ? 'Carregar Demonstração' : 'Buscar no YouTube'}
                      </div>
                    </button>

                    {!videoUrl && (
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        <span>Link Indisponível</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl text-slate-900 uppercase tracking-tight">{ex.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                        Foco Técnico
                      </span>
                      {videoUrl ? (
                        <span className="px-2.5 py-1 bg-green-50 rounded-lg text-[9px] font-black text-green-600 uppercase tracking-widest border border-green-100">
                          HD Oficial
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 italic">
                          Sugestão Web
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-2xl font-black text-slate-900 leading-none">{ex.sets}x{ex.reps}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocolo</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      Observe atentamente a cadência e a amplitude do movimento. Mantenha o core ativado durante toda a execução.
                    </p>
                    
                    <button 
                      onClick={() => handleGenerateGuide(ex.name)}
                      disabled={guideLoading === ex.name}
                      className="mt-3 text-blue-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 hover:translate-x-1 transition-transform disabled:opacity-50"
                    >
                      {guideLoading === ex.name ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Gerando Inteligência...</span>
                        </>
                      ) : (
                        <>
                          <span>Ver Guia Técnico Gerado por IA</span>
                          <Sparkles className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Guia de IA */}
      <AnimatePresence>
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGuide(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                <div>
                  <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">IA Technical Breakdown</p>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">{selectedGuide.name}</h3>
                </div>
                <button onClick={() => setSelectedGuide(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h4 className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-[11px] mb-3">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                    Setup & Posicionamento
                  </h4>
                  <ul className="space-y-2">
                    {selectedGuide.setup.map((item, i) => (
                      <li key={i} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                        <ChevronRight className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-[11px] mb-3">
                    <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                    Execução Técnica
                  </h4>
                  <ul className="space-y-2">
                    {selectedGuide.execution.map((item, i) => (
                      <li key={i} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                        <ChevronRight className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <h4 className="flex items-center gap-2 text-red-900 font-black uppercase tracking-widest text-[10px] mb-3">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Erros Comuns (Evite!)
                  </h4>
                  <ul className="space-y-2">
                    {selectedGuide.commonMistakes.map((item, i) => (
                      <li key={i} className="flex gap-2 text-xs text-red-700/80 leading-relaxed">
                        <div className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg ring-4 ring-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Pro Tip (Coach IronMind)</span>
                  </div>
                  <p className="text-sm font-medium italic leading-relaxed">
                    "{selectedGuide.proTip}"
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 italic text-[10px] text-slate-400 text-center">
                Instruções geradas dinamicamente com foco em biomecânica aplicada.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}



