import { Component, type ReactNode } from "react";

interface Props {
  children:  ReactNode;
  title?:    string;
  fallback?: ReactNode;
}

interface State { hasError: boolean; error: string | null; }

export class SectionErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("[SectionErrorBoundary]", this.props.title, error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "10px", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
          <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: "0.25rem" }}>
            {this.props.title || "Error en esta sección"}
          </div>
          <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "1rem" }}>{this.state.error}</div>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: "0.5rem 1.25rem", background: "#EF4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


