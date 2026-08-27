import { useState } from 'react';
import { Youtube, Rows3, X } from 'lucide-react';
import { usePiPLauncher } from '../hooks/usePiPLauncher';
import PipDebugPanel from './PipDebugPanel';

const SPLIT_TIP_DISMISSED_KEY = 'ironmind_split_tip_dismissed';

/**
 * Botões de Netflix/YouTube com o "visor flutuante" (cronômetro em
 * Picture-in-Picture). Mostra uma mensagem de diagnóstico na tela quando
 * o PiP falha ou demora -- temporário, pra facilitar identificar o
 * problema real sem precisar de computador/DevTools.
 *
 * O visor flutuante nem sempre sobrevive à troca pro Netflix/YouTube
 * (limitação da plataforma, não do app -- testado e confirmado até
 * contra a versão de código que funcionava meses atrás, e falha
 * igual). A Tela Dividida nativa do Android é a alternativa que
 * realmente funciona pra assistir e treinar ao mesmo tempo -- por isso
 * a dica abaixo.
 */
export default function MediaQuickLaunch() {
  const { launch } = usePiPLauncher();
  const [debug, setDebug] = useState<string | null>(null);
  const [showSplitTip, setShowSplitTip] = useState(() => localStorage.getItem(SPLIT_TIP_DISMISSED_KEY) !== 'true');

  const open = (url: string) => {
    setDebug(null);
    launch(url, (msg) => setDebug(msg));
  };

  const dismissTip = () => {
    localStorage.setItem(SPLIT_TIP_DISMISSED_KEY, 'true');
    setShowSplitTip(false);
  };

  return (
    <div className="p-3 pt-0">
      {showSplitTip && (
        <div className="mb-2 flex items-start gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-2.5">
          <Rows3 className="w-4 h-4 text-blue-500 flex-none mt-0.5" />
          <p className="text-[9px] text-blue-700 dark:text-blue-300 leading-relaxed flex-1">
            Pra assistir e treinar ao mesmo tempo, use a <strong>Tela Dividida</strong> do seu celular (segura o botão de apps recentes ou desliza com 2 dedos) em vez do botão abaixo -- funciona melhor que o visor flutuante.
          </p>
          <button onClick={dismissTip} className="flex-none text-blue-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
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
      <PipDebugPanel />
    </div>
  );
}
