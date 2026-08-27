import { useState } from 'react';
import { Youtube, Rows3, X } from 'lucide-react';
import { startStreamingReminder } from '../services/streamingReminder';

const SPLIT_TIP_DISMISSED_KEY = 'ironmind_split_tip_dismissed';

/**
 * Botões de Netflix/YouTube -- abrem direto, sem tentar nenhum "visor
 * flutuante" (Picture-in-Picture). O PiP foi removido depois de uma
 * investigação extensa: testamos até o código exato de uma versão
 * antiga confirmada funcionando, isolado, e o resultado foi o mesmo --
 * o visor não sobrevive à troca pro Netflix/YouTube neste
 * Chrome/Android atual. Não é mais algo corrigível pelo código do
 * app, então a dica de Tela Dividida abaixo é a alternativa real.
 */
export default function MediaQuickLaunch() {
  const [showSplitTip, setShowSplitTip] = useState(() => localStorage.getItem(SPLIT_TIP_DISMISSED_KEY) !== 'true');

  const open = (url: string) => {
    startStreamingReminder();
    window.open(url, '_blank');
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
            Pra assistir e treinar ao mesmo tempo, use a <strong>Tela Dividida</strong> do seu celular (segura o botão de apps recentes ou desliza com 2 dedos).
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
    </div>
  );
}
