# IronMind Specialized Agents

This document defines the architectural roles and responsibilities of the specialized agents involved in the development and maintenance of the IronMind application.

## 1. Agente: Arquiteto Backend (Iron-Core)
**Função:** Inteligência central e processamento de dados.
**Objetivo:** Gerenciar a lógica de treino, cálculos de carga e segurança dos dados.
**Especificações Técnicas:**
- Gerenciamento de banco de dados (Firestore para perfis e logs de treino).
- Implementação de lógica de IA para progressão de carga (Progressive Overload).
- Processamento assíncrono para garantir que a IA não trave a interface.
- Controle de autenticação de usuário e criptografia de dados biométricos via Firebase Auth.
- Gestão de WebSockets ou Real-time listeners para atualizações de treino em tempo real.

## 2. Agente: Especialista Frontier (Front-End & Overlay)
**Função:** Responsável pela camada visual e experiência do usuário (UX).
**Objetivo:** Criar a interface "flutuante" do IronMind sobre o streaming de vídeo.
**Especificações Técnicas:**
- Controle de renderização em camadas (Z-Index e Picture-in-Picture API) para manter a UI acima do vídeo.
- Implementação de design "Glassmorphism" (transparência e desfoque) para não obstruir o vídeo.
- Gestão de estados dinâmicos (mostrando tempo, séries e cargas de forma fluida).
- Otimização de consumo de GPU para manter o streaming de vídeo em 60 FPS.
- Interface responsiva para diferentes tamanhos de tela e orientação (vertical/horizontal).

## 3. Agente: Maestro de Mídia (Integration Specialist)
**Função:** Ponte entre o app e serviços externos (Spotify, YouTube, Music).
**Objetivo:** Garantir que o streaming de vídeo e música funcione integrado ao treino.
**Especificações Técnicas:**
- Integração via APIs e SDKs oficiais.
- Controle de áudio inteligente (reduzir volume da música quando a IA de voz der instruções).
- Sincronização de metadados (identificar a batida da música para sugerir ritmo de repetição).
- Gestão de tokens OAuth para manter o usuário logado nos serviços de terceiros.
- Estratégias de carregamento de mídia para evitar interrupções.

## Ponto seguro de restauração (IronMind • 2026-05-07)

Para evitar erros de "oscilação no servidor" ou falhas de conexão com a IA, as seguintes regras devem ser mantidas:

1. **Variáveis de Ambiente**: Sempre utilize `process.env.VITE_GEMINI_API_KEY` para o servidor. Esta é a chave configurada nos Secrets da aplicação.
2. **Configuração do Servidor**: O servidor Express deve rodar na **porta 3000** e aceitar requisições de `/api`.
3. **Vite Proxy**: O `vite.config.ts` deve manter o bloco de `proxy` apontando `/api` para `http://0.0.0.0:3000`. Isso permite que o front-end e o back-end se comuniquem corretamente no ambiente de preview.
4. **Modelo de IA**: O modelo preferencial é o `gemini-1.5-flash` usando a **API v1beta** para suportar nativamente instruções de sistema.
5. **Comunicação Front-End**: As chamadas de fetch no front-end devem ser relativas (ex: `fetch("/api/chat")`) para garantir que passem pelo proxy do Vite.
