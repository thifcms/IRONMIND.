import { Youtube } from 'lucide-react';
import { usePiPLauncher } from '../hooks/usePiPLauncher';

/**
 * Botões de Netflix/YouTube com o mesmo "visor flutuante" (cronômetro em
 * Picture-in-Picture, com aviso de "toque pra voltar"). Abrem como página
 * do navegador (não o app nativo) de propósito -- assim o visor
 * flutuante continua visível por cima, já que os dois ficam no mesmo
 * navegador. Abrir o app nativo derruba o PiP quando o Android troca de
 * app (prioridade escolhida: visor sempre visível).
 */
export default function MediaQuickLaunch() {
  const { launch } = usePiPLauncher();

  return (
    <div className="p-3 pt-0">
      <div className="flex gap-2">
        <button
          onClick={() => launch(() => window.open('https://www.netflix.com', '_blank'))}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          NETFLIX
        </button>
        <button
          onClick={() => launch(() => window.open('https://www.youtube.com', '_blank'))}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center gap-1.5 font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          <Youtube className="w-3 h-3 text-[#FF0000]" /> YOUTUBE
        </button>
      </div>
    </div>
  );
}
