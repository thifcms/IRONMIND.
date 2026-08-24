import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { getPushSupport, getPushStatus, subscribeToPush, unsubscribeFromPush, type PushStatus } from '../lib/pushNotifications';

interface Props {
  userId?: string;
}

/**
 * Ativa/desativa lembretes push (ex: "faz dias que você não treina").
 * Some sozinho se o navegador não suportar (ex: Safari/iOS) -- não tem
 * sentido mostrar um botão que nunca vai funcionar.
 */
export default function PushNotificationToggle({ userId }: Props) {
  const [status, setStatus] = useState<PushStatus>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getPushSupport()) { setStatus('unsupported'); return; }
    getPushStatus().then(setStatus);
  }, []);

  if (status === 'unsupported' || !userId) return null;

  const handleToggle = async () => {
    setError(null);
    setLoading(true);
    if (status === 'subscribed') {
      await unsubscribeFromPush(userId);
      setStatus('granted');
    } else {
      const result = await subscribeToPush(userId);
      if (result.ok) {
        setStatus('subscribed');
      } else {
        setError(result.reason || 'Não foi possível ativar.');
        setStatus(await getPushStatus());
      }
    }
    setLoading(false);
  };

  const isOn = status === 'subscribed';
  const isBlocked = status === 'denied';

  return (
    <div className="mx-3 mb-1 shrink-0">
      <button
        type="button"
        onClick={isBlocked ? undefined : handleToggle}
        disabled={loading || isBlocked}
        className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
          isOn ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-slate-50 dark:bg-[#1a1a1a]'
        } ${isBlocked ? 'opacity-60' : 'active:scale-[0.98]'}`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 flex-none animate-spin text-slate-400" />
        ) : isOn ? (
          <BellRing className="w-5 h-5 flex-none text-blue-500" />
        ) : isBlocked ? (
          <BellOff className="w-5 h-5 flex-none text-slate-400" />
        ) : (
          <Bell className="w-5 h-5 flex-none text-slate-400" />
        )}
        <div className="flex-1 text-left">
          <p className={`text-xs font-black uppercase tracking-widest ${isOn ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {isOn ? 'Lembretes ativados' : isBlocked ? 'Notificações bloqueadas' : 'Ativar lembretes'}
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">
            {isBlocked
              ? 'Permita nas configurações do navegador pra ativar.'
              : isOn
              ? 'Avisamos se você ficar alguns dias sem treinar.'
              : 'Um toque pra não perder a sequência.'}
          </p>
        </div>
      </button>
      {error && <p className="text-[9px] text-red-500 mt-1 px-1">{error}</p>}
    </div>
  );
}
