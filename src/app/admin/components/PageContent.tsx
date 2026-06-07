import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

// Wrapper estándar para todas las páginas admin.
// NO incluir título aquí — el título ya está en el TopBar del AdminLayout.
export default function PageContent({ children }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {children}
    </div>
  );
}


