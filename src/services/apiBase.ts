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

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
