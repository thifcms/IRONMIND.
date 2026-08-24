import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Rede de segurança pro app inteiro: sem isso, QUALQUER erro de JS não
 * tratado em qualquer componente (ex: acessar propriedade de undefined,
 * uma resposta de API com formato inesperado) derruba a árvore do React
 * inteira e vira uma tela branca, sem nenhuma pista do que aconteceu.
 *
 * Com o ErrorBoundary, o erro fica contido, a pessoa vê uma tela
 * explicando que algo deu errado (com botão de recarregar), e o erro
 * completo vai pro console -- muito mais fácil de diagnosticar depois
 * (inclusive dá pra pedir print do console pro usuário, igual já
 * fazemos com o histórico do visor).
 *
 * Só funciona como classe (é a única forma que o React oferece pra
 * capturar erros de renderização -- não existe hook equivalente).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Erro não tratado capturado:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-[#0a0a0a] px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-lg font-black text-slate-800 dark:text-white mb-2">Ops, algo deu errado</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 max-w-xs">
            O IronMind encontrou um erro inesperado nessa tela. Seus dados estão salvos.
          </p>
          {this.state.error && (
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-600 mb-6 max-w-xs break-words">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 bg-blue-600 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4" /> Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
