/**
 * Base da URL da API. Quando o frontend e o backend estão no mesmo
 * domínio (Render, ou Netlify servindo os dois juntos), fica vazio e as
 * chamadas continuam relativas (/api/...), como sempre foram.
 *
 * Quando o frontend é hospedado separado do backend (ex: GitHub Pages
 * servindo os arquivos estáticos, Netlify só com as funções de API),
 * defina VITE_API_BASE_URL no build (ex: no GitHub Actions) apontando
 * pro domínio do backend, sem barra no final:
 *   VITE_API_BASE_URL=https://ironmind-treinador.netlify.app
 */
export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE_URL || '';

// Chave compartilhada exigida pelo backend do IronMind AI (X-API-KEY).
// Antes disso ficava só no backend do app (que fazia o repasse); agora
// que o frontend chama o IronMind AI direto, precisa mandar junto.
export const HUB_API_KEY: string = (import.meta as any).env?.VITE_HUB_API_KEY || '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/**
 * Monta os headers pra chamar o backend do IronMind AI. Prioriza mandar
 * o ID Token do usuário logado (Authorization: Bearer ...) -- o backend
 * confere esse token direto com o Firebase, então não existe mais um
 * segredo fixo pra alguém "roubar" abrindo o DevTools no navegador.
 * A HUB_API_KEY continua indo junto só como fallback, pra não quebrar
 * na hora enquanto o backend novo não estiver 100% confirmado no ar
 * (ver isAuthenticated() no apiApp.ts do repo Ironmind-ai-funcionando).
 */
export async function apiHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(HUB_API_KEY ? { "X-API-KEY": HUB_API_KEY } : {}),
    ...(extra || {}),
  };

  try {
    const { auth } = await import('../lib/firebase');
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
  } catch {
    // Sem usuário logado via Firebase Auth ainda (ex: conta antiga não
    // migrada) -- segue só com a X-API-KEY de fallback, sem travar a
    // chamada por causa disso.
  }

  return headers;
}
