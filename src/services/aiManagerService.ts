import { apiUrl } from './apiBase';
export async function checkAIHealth() {
  try {
    const res = await fetch(apiUrl(`/api/ai-status?t=${Date.now()}`));
    if (!res.ok) throw new Error('Falha na resposta do servidor');
    return await res.json();
  } catch (err) {
    return { status: 'error', message: 'Servidor Offline' };
  }
}
