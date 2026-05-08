import { TrainingPlan, Exercise } from '../types';
import { Play, Video, Info } from 'lucide-react';
import { useState } from 'react';

export default function VideosTab({ plan }: { plan: TrainingPlan }) {
  const allExercises = plan.days.flatMap(day => day.exercises);
  // Agrupar por nome para evitar duplicados na aba de vídeos
  const uniqueExercises = Array.from(new Map(allExercises.map(ex => [ex.name, ex])).values());
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const formatVideoUrl = (ex: Exercise) => {
    if (ex.videoUrl) {
      // Converte URLs do YouTube para o formato embed se necessário
      let url = ex.videoUrl;
      if (url.includes('youtube.com/watch?v=')) {
        url = url.replace('watch?v=', 'embed/');
      } else if (url.includes('youtu.be/')) {
        const id = url.split('/').pop()?.split('?')[0];
        url = `https://www.youtube.com/embed/${id}`;
      }
      
      // Adiciona parâmetros de autoplay e mute
      const connector = url.includes('?') ? '&' : '?';
      return `${url}${connector}autoplay=1&mute=1`;
    }
    
    // Fallback: busca no YouTube pelo nome do exercício
    return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent('execução técnica ' + ex.name)}&autoplay=1&mute=1`;
  };

  return (
    <div className="p-6 pb-20 space-y-6 bg-slate-50 overflow-y-auto h-full">
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
        ) : uniqueExercises.map((ex) => (
          <div key={ex.name} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden hover:border-blue-200 transition-all shadow-sm group">
            <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
              {activeVideo === ex.name ? (
                <iframe
                  src={formatVideoUrl(ex)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  referrerPolicy="no-referrer"
                  allowFullScreen
                ></iframe>
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
                      Carregar Demonstração
                    </div>
                  </button>
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
                    {ex.videoUrl && (
                      <span className="px-2.5 py-1 bg-green-50 rounded-lg text-[9px] font-black text-green-600 uppercase tracking-widest border border-green-100">
                        HD Oficial
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
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  Observe atentamente a cadência e a amplitude do movimento. Mantenha o core ativado durante toda a execução.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

