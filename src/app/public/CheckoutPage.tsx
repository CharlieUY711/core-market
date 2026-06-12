// apps/core-market/src/app/public/CheckoutPage.tsx
// El flujo de checkout ahora vive dentro de CarritoModule (pasos 2 y 3).
// Esta página redirige a /carrito para evitar URLs huérfanas.
// Si alguien llega directo a /checkout (bookmark, email) llega al módulo completo.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/carrito', { replace: true });
  }, [navigate]);
  return null;
}
