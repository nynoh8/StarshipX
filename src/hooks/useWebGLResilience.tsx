import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { Socket } from 'socket.io-client';

// 1. Feature Detection (WebGL Support Check)
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// 2. Custom Hook for Context Loss and Socket sync (use inside Canvas)
export function useWebGLResilience(socket: Socket | null) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    if (!gl?.domElement) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault(); // Prevent default behavior to allow restore
      console.warn('WebGL context lost! Pausing game...');
      if (socket) {
        socket.emit('player_paused', { reason: 'webglcontextlost' });
      }
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored! Resuming game...');
      if (socket) {
        socket.emit('player_resumed', { reason: 'webglcontextrestored' });
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, socket]);
}

// Helper component to run the hook inside <Canvas>
export function WebGLResilienceHandler({ socket }: { socket: Socket | null }) {
  useWebGLResilience(socket);
  return null;
}

// Error Boundary for WebGL/Canvas crashes
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in WebGL Canvas:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-white p-6">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Aconteceu um erro gráfico!</h2>
          <p className="text-gray-300 mb-6 text-center max-w-md">
            Houve um problema ao renderizar o jogo. Isso pode ocorrer se o dispositivo estiver sem memória gráfica ou não suportar alguns recursos.
          </p>
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
            onClick={() => window.location.reload()}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
