/**
 * Força uma URL a abrir dentro do PRÓPRIO Chrome, em vez de deixar o
 * Android decidir se abre o app nativo (Netflix, YouTube, etc).
 *
 * Como funciona: URLs no formato "intent://" são uma extensão específica
 * do Chrome para Android. Ao especificar "package=com.android.chrome",
 * a navegação fica travada nesse pacote -- o Android nem chega a
 * oferecer o "abrir com..." pro app nativo, porque o destino já foi
 * definido explicitamente. Isso evita completamente o hand-off pro app
 * nativo que fazia o visor (PiP) sumir.
 *
 * Em iOS/desktop isso não existe (é sintaxe exclusiva do Chrome no
 * Android), então nesses casos retorna a URL normal sem modificar nada.
 */
export function forceOpenInChrome(url: string): string {
  const isAndroidChrome = /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);
  if (!isAndroidChrome) return url;

  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(':', ''); // "https"
    const withoutScheme = url.replace(/^https?:\/\//, '');
    return `intent://${withoutScheme}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch {
    // URL malformada -- não arrisca quebrar, devolve como veio.
    return url;
  }
}
