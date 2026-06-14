# Configuração Estável da Gemini API (Ponto Seguro • 2026-05-17)

Esta é a configuração técnica atualizada para máxima estabilidade e conformidade com os padrões do AI Studio (V10.0).

## Backend (server.ts)
- **Papel**: Núcleo de Processamento Neural e Proxy de API.
- **SDK**: `@google/genai` (V2) - Integrado no lado do servidor para segurança total.
- **Segurança**: Chave `GEMINI_API_KEY` mantida exclusivamente no ambiente do servidor.
- **Endpoints**: `/api/chat`, `/api/generate-proposal`, `/api/analyze-image`.
- **Fallback**: Rodízio inteligente entre `gemini-2.0-flash`, `gemini-3-flash-preview` e `gemini-3.1-flash-lite`.

## Frontend (geminiService.ts)
- **Papel**: Abstração de consumo da API e Persistência Local.
- **Lógica**: Consome os endpoints do servidor via `fetch`, garantindo funcionamento universal (mesmo fora do IFRAME).
- **Estabilidade**: Recuperação automática de falhas e mensagens de erro amigáveis ao usuário.

**ESTA CONFIGURAÇÃO (V10.0) É A MAIS ESTÁVEL E SEGURA PARA O AMBIENTE IRONMIND.**
