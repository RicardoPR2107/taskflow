import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen } from './ErrorScreen';

interface State {
  hasError: boolean;
}

/**
 * Atrapa errores inesperados de React y muestra una pantalla de fallo
 * en vez de dejar la aplicación en blanco.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de interfaz:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          message="Ocurrió un error inesperado en la aplicación. Recarga la página para continuar."
          actionLabel="Recargar página"
          onAction={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
