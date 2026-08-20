import { useState } from 'react';
import { usePiPLauncher } from '../hooks/usePiPLauncher';

/**
 * Botão do "visor flutuante" (cronômetro em Picture-in-Picture). Só ativa
 * o PiP -- não abre mais Netflix/Youtube sozinho. Abrir uma URL logo
 * depois de pedir o PiP tira o navegador de primeiro plano de forma
 * brusca (mais ainda se o Android redirecionar pro app nativo) e podia
 * derrubar o PiP antes dele se firmar. Agora a pessoa abre o Netflix ou
 * o Youtube manualmente, com o visor já estável na tela.
 */
export default function MediaQuickLaunch() {
  const { launch } = usePiPLauncher();
  const [hint, setHint] = useState<string | null>(null);

  const handleClick = () => {
    launch();
    setHint('Visor ativado! Agora abra o Netflix ou o Youtube.');
    setTimeout(() => setHint(null), 4000);
  };

  return (
    <div className="p-3 pt-0">
      <button
        onClick={handleClick}
        className="w-full bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
      >
        ATIVAR VISOR FLUTUANTE
      </button>
      {hint && (
        <p className="text-center text-[9px] font-bold text-blue-600 dark:text-blue-400 pt-2 animate-pulse">
          {hint}
        </p>
      )}
    </div>
  );
}
