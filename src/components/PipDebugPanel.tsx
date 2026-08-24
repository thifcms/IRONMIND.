import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEntries(getPiPLog());
    const id = setInterval(() => setEntries(getPiPLog()), 1000);
    return () => clearInterval(id);
  }, [open]);

  const fullText = entries.map(e => formatPiPLogEntry(e)).join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = fullText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // sem sorte -- a pessoa vai precisar copiar manualmente mesmo
      }
      document.body.removeChild(ta);
    }
  };

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
        <div className="mt-1.5">
          {entries.length > 0 && (
            <div className="flex gap-2 mb-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md"
              >
                {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                {copied ? 'Copiado!' : 'Copiar tudo'}
              </button>
              <button
                type="button"
                onClick={() => { clearPiPLog(); setEntries([]); }}
                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md"
              >
                <Trash2 className="w-2.5 h-2.5" /> Limpar
              </button>
            </div>
          )}
          <div
            className="max-h-64 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] p-2 space-y-1"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            {entries.length === 0 && (
              <p className="text-[9px] text-slate-400 dark:text-slate-500">Nenhum evento registrado ainda. Toque em Netflix ou YouTube pra começar.</p>
            )}
            {entries.slice().reverse().map((e, i) => (
              <p key={i} className="text-[9px] font-mono text-slate-500 dark:text-slate-400 break-words leading-tight select-text">
                {formatPiPLogEntry(e)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
