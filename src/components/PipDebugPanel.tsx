import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getPiPLog, clearPiPLog, formatPiPLogEntry } from '../lib/pipDebugLog';

/**
 * Painel de histórico do visor (PiP). Diferente da mensagem de debug de
 * uma tentativa só (que se perde ao trocar de app), este painel lê do
 * localStorage -- então mesmo que o visor suma e a pessoa volte pro
 * IronMind depois, dá pra abrir esse painel e ver a sequência completa
 * de eventos que aconteceu, incluindo se a aba foi ocultada e se o
 * evento "saiu do PiP" chegou a disparar ou não.
 */
export default function PipDebugPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(getPiPLog());

  useEffect(() => {
    if (!open) return;
    setEntries(getPiPLog());
    // Atualiza a cada segundo enquanto o painel estiver aberto, pra
    // capturar eventos que cheguem logo depois de voltar pro app.
    const id = setInterval(() => setEntries(getPiPLog()), 1000);
    return () => clearInterval(id);
  }, [open]);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Histórico do visor ({entries.length})
      </button>
      {open && (
        <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] p-2 space-y-1">
          {entries.length === 0 && (
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Nenhum evento registrado ainda. Toque em Netflix ou YouTube pra começar.</p>
          )}
          {entries.slice().reverse().map((e, i) => (
            <p key={i} className="text-[9px] font-mono text-slate-500 dark:text-slate-400 break-words leading-tight">
              {formatPiPLogEntry(e)}
            </p>
          ))}
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => { clearPiPLog(); setEntries([]); }}
              className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-500 mt-1"
            >
              <Trash2 className="w-2.5 h-2.5" /> Limpar histórico
            </button>
          )}
        </div>
      )}
    </div>
  );
}
