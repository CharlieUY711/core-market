import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error, info: any) {
    console.error({ context: "ErrorBoundary", error, info });
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", fontFamily: "DM Sans, sans-serif" }}>
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <h2 style={{ margin: 0, color: "#444" }}>Algo salió mal</h2>
        <p style={{ margin: 0, color: "#888", fontSize: "0.9rem" }}>Por favor recargá la página</p>
        <button onClick={() => window.location.reload()} style={{ padding: "0.75rem 1.5rem", background: "#FF6835", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>
          Recargar
        </button>
      </div>
    );
    return this.props.children;
  }
}

export function handleError(error: unknown, context: string) {
  console.error({ context, error, timestamp: new Date().toISOString() });
}

export function userMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("fetch")) return "No se pudo conectar con el servidor";
    if (error.message.includes("auth")) return "Sesión expirada, volvé a ingresar";
    if (error.message.includes("not found")) return "El recurso no fue encontrado";
  }
  return "Ocurrió un error inesperado";
}


