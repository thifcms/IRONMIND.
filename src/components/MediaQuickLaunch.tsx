import { useState } from 'react';
import { Youtube } from 'lucide-react';
import { usePiPLauncher } from '../hooks/usePiPLauncher';

/**
 * Botões de Netflix/YouTube com o "visor flutuante" (cronômetro em
 * Picture-in-Picture). Mostra uma mensagem de diagnóstico na tela quando
 * o PiP falha ou demora -- temporário, pra facilitar identificar o
 * problema real sem precisar de computador/DevTools.
 */
export default function MediaQuickLaunch() {
  const { launch } = usePiPLauncher();
  const [debug, setDebug] = useState<string | null>(null);

  const open = (url: string) => {
    setDebug(null);
    launch(
      () => window.open(url, '_blank'),
      (msg) => setDebug(msg)
    );
  };

  return (
    <div className="p-3 pt-0">
      <div className="flex gap-2">
        <button
          onClick={() => open('https://www.netflix.com')}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          NETFLIX
        </button>
        <button
          onClick={() => open('https://www.youtube.com')}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center gap-1.5 font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          <Youtube className="w-3 h-3 text-[#FF0000]" /> YOUTUBE
        </button>
      </div>
      {debug && (
        <p className="mt-2 text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-2 break-words">
          {debug}
        </p>
      )}
    </div>
  );
}
