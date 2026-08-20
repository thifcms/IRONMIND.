import { Music2, Play, ExternalLink, Disc } from 'lucide-react';
import { usePiPLauncher } from '../hooks/usePiPLauncher';

export default function MusicTab() {
  const { launch } = usePiPLauncher();

  const openApp = (app: typeof apps[0]) => {
    launch(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const storeLink = isIOS ? app.appStore : app.playStore;
      const deepLink = app.deepLink;

      // Tentativa de abrir o app via Deep Link
      const start = Date.now();
      window.location.href = deepLink;

      // Se em 2 segundos a página ainda estiver em foco, 
      // assumimos que o app não abriu e redirecionamos para a loja
      setTimeout(() => {
        if (Date.now() - start < 2500) {
          window.open(storeLink, '_blank');
        }
      }, 2000);
    });
  };

  const apps = [
    { 
      name: 'Spotify', 
      color: 'text-[#1DB954]', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
      deepLink: 'spotify:open',
      playStore: 'https://play.google.com/store/apps/details?id=com.spotify.music',
      appStore: 'https://apps.apple.com/app/spotify-music/id324684580'
    },
    { 
      name: 'Deezer', 
      color: 'text-[#ff0092]', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Deezer_logo.svg',
      deepLink: 'deezer://www.deezer.com',
      playStore: 'https://play.google.com/store/apps/details?id=deezer.android.app',
      appStore: 'https://apps.apple.com/app/deezer-music-player-podcast/id292738169'
    },
    { 
      name: 'YouTube Music', 
      color: 'text-[#FF0000]', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Youtube_Music_icon.svg',
      deepLink: 'youtubemusic://',
      playStore: 'https://play.google.com/store/apps/details?id=com.google.android.apps.youtube.music',
      appStore: 'https://apps.apple.com/app/youtube-music/id1017492454'
    }
  ];

  return (
    <div className="p-4 pb-16 space-y-6 flex flex-col h-full bg-slate-50 dark:bg-[#0a0a0a] items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900/30 shadow-sm relative group">
          <Music2 className="w-7 h-7 text-blue-600 relative z-10" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-2xl font-[1000] text-slate-900 dark:text-slate-100 tracking-tighter leading-none italic uppercase">Som & Beat</h2>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sincronize sua energia</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {apps.map((app) => (
          <button
            key={app.name}
            onClick={() => openApp(app)}
            className="w-full group block bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm transition-all active:scale-[0.98] text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#181818] border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-inner`}>
                  <img src={app.logo} alt={app.name} className="w-5 h-5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">{app.name}</h3>
                </div>
              </div>
              <div className="w-8 h-8 bg-slate-50 dark:bg-[#181818] rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Play className="w-3 h-3 fill-current" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-slate-200 pt-2">
        <Disc className="w-4 h-4 animate-spin-slow" />
        <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">Engine Active</span>
      </div>
    </div>
  );
}
