import { Youtube } from 'lucide-react';
import { usePiPLauncher } from '../hooks/usePiPLauncher';

/**
 * Botões de Netflix/YouTube com o mesmo "visor flutuante" (cronômetro em
 * Picture-in-Picture, com aviso de "toque pra voltar") usado em toda a
 * abertura de apps externos no IronMind.
 */
export default function MediaQuickLaunch() {
  const { launch } = usePiPLauncher();

  // No Android, usa URI de Intent explícita (nomeando o pacote do app) --
  // é o Android quem decide abrir o app se estiver instalado, ou usar o
  // fallback_url se não. Muito mais confiável que só tentar um esquema
  // customizado (nflx://) e adivinhar por timeout se funcionou.
  // No iOS não existe esse mecanismo, então mantemos o esquema + timeout.
  const openMediaApp = (webUrl: string, androidPackage: string, iosScheme: string) => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua);

    if (isAndroid) {
      const urlNoScheme = webUrl.replace(/^https?:\/\//, '');
      const intentUrl = `intent://${urlNoScheme}#Intent;scheme=https;package=${androidPackage};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
      window.location.href = intentUrl;
    } else if (isIOS) {
      const start = Date.now();
      window.location.href = iosScheme;
      setTimeout(() => {
        if (Date.now() - start < 2500) {
          window.open(webUrl, '_blank');
        }
      }, 2000);
    } else {
      window.open(webUrl, '_blank');
    }
  };

  return (
    <div className="p-3 pt-0">
      <div className="flex gap-2">
        <button
          onClick={() => launch(() => openMediaApp('https://www.netflix.com/browse', 'com.netflix.mediaclient', 'nflx://www.netflix.com/browse'))}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          NETFLIX
        </button>
        <button
          onClick={() => launch(() => openMediaApp('https://www.youtube.com', 'com.google.android.youtube', 'youtube://'))}
          className="flex-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 py-3 rounded-lg flex items-center justify-center gap-1.5 font-black text-[8px] tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          <Youtube className="w-3 h-3 text-[#FF0000]" /> YOUTUBE
        </button>
      </div>
    </div>
  );
}
