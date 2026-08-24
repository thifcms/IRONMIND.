import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Reconhecimento de voz via Web Speech API (SpeechRecognition), nativa
 * do Chrome -- sem precisar de nenhum serviço externo. Funciona bem no
 * Chrome Android, que já é o navegador-alvo do resto do app (PiP, etc).
 *
 * Uso: const { listening, start, stop, supported } = useSpeechInput(text => ...)
 */
export function useSpeechInput(onResult: (transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const supported = typeof window !== 'undefined' && !!(window as any).webkitSpeechRecognition;

  useEffect(() => {
    if (!supported) return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onResult(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch {}
    };
  }, [supported, onResult]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      console.warn('Falha ao iniciar reconhecimento de voz:', e);
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch {}
    setListening(false);
  }, []);

  return { listening, start, stop, supported };
}
