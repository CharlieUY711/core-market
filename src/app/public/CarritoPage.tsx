// apps/core-market/src/app/public/CarritoPage.tsx
// Reemplaza la implementación anterior por el package @core/carrito.
// Esta página solo configura el módulo; toda la lógica vive en el package.
import CarritoModule from '@core/carrito';

export default function CarritoPage() {
  return (
    <CarritoModule
      mode="page"
      apiUrl={import.meta.env.VITE_API_URL}
    />
  );
}
