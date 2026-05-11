# Configuração Estável da Gemini API (Ponto Seguro • 2026-05-10)

Esta é a configuração técnica simplificada para evitar timeouts em dispositivos móveis.

## Back-end (server.ts)
- **SDK**: `@google/generative-ai`.
- **Modelo**: `gemini-1.5-flash`.
- **Config**: `maxOutputTokens: 2048`.
- **Instrução**: Curta e direta no `systemPrompt`. Autorizada busca externa de exercícios se necessário.

## Front-end (vite.config.ts)
- **Proxy**: `/api` para `http://0.0.0.0:3000`.

## Serviço de Dados (geminiService.ts)
- **Endpoint**: `/api/chat` (absoluto ao proxy).

**NÃO ALTERAR ESTAS CONFIGURAÇÕES SEM TESTES DE REGRESSÃO COMPLETOS.**
