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

export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(HUB_API_KEY ? { "X-API-KEY": HUB_API_KEY } : {}),
    ...(extra || {}),
  };
}
