# Configuração Estável da Gemini API (Ponto Seguro • 2026-05-09)

Esta é a configuração técnica que resolveu os problemas de conexão em maio de 2026.

## Back-end (server.ts)
- **SDK**: `@google/generative-ai` (oficial).
- **Iniciação**: `new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY)`.
- **Porta**: 3000.
- **Modelo**: `gemini-2.0-flash` (estável).

## Front-end (vite.config.ts)
- **Proxy**:
```typescript
proxy: {
  '/api': {
    target: 'http://0.0.0.0:3000',
    changeOrigin: true,
  },
}
```

## Serviço de Dados (geminiService.ts)
- **Endpoint**: `/api/chat` (absoluto ao proxy).

**NÃO ALTERAR ESTAS CONFIGURAÇÕES SEM TESTES DE REGRESSÃO COMPLETOS.**
