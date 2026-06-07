import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id:      string;
  message: string;
  type:    ToastType;
}

interface ToastCtx {
  toast:   (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error:   (message: string) => void;
  info:    (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error   = useCallback((m: string) => toast(m, "error"),   [toast]);
  const info    = useCallback((m: string) => toast(m, "info"),    [toast]);
  const warning = useCallback((m: string) => toast(m, "warning"), [toast]);

  const styles: Record<ToastType, { bg: string; color: string; icon: string }> = {
    success: { bg: "#f0fdf4", color: "#166534", icon: "✅" },
    error:   { bg: "#fef2f2", color: "#dc2626", icon: "❌" },
    info:    { bg: "#eff6ff", color: "#1d4ed8", icon: "ℹ️" },
    warning: { bg: "#fffbeb", color: "#92400e", icon: "⚠️" },
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast container */}
      <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", zIndex: 9999, pointerEvents: "none" }}>
        {toasts.map(t => {
          const s = styles[t.type];
          return (
            <div key={t.id} style={{
              background: s.bg, color: s.color, padding: "0.75rem 1.25rem",
              borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: "0.5rem",
              border: `1px solid ${s.color}22`, maxWidth: "320px",
              animation: "slideIn 0.2s ease",
              pointerEvents: "auto",
            }}>
              <span>{s.icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}


