/**
 * Salva no localStorage sem deixar o app quebrar se falhar (aba
 * anônima bloqueando storage, cota cheia, etc) -- mas, diferente de um
 * `catch {}` vazio, REGISTRA o erro no console em vez de engolir
 * silenciosamente. Sem isso, planos de treino/dieta podiam simplesmente
 * não salvar e ninguém saberia por quê (nem o usuário, nem quem for
 * depurar depois).
 *
 * Retorna true/false pra quem quiser reagir à falha (ex: avisar o
 * usuário), mas a maioria dos usos hoje só quer o log e segue em frente.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[safeStorage] Falha ao salvar '${key}' no localStorage:`, e);
    return false;
  }
}
