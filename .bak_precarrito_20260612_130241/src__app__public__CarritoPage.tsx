/* =====================================================
   Carrito Page — Página de Carrito de Compras
   Charlie Marketplace Builder v1.5
   ===================================================== */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { getCarrito, actualizarItemCarrito, eliminarItemCarrito, vaciarCarrito, type CarritoItem } from '../services/carritoApi';
import { fetchProductoMarketById, fetchProductoSecondHandById, type ProductoMarket, type ProductoSecondHand } from '../services/productosApi';
import '../../styles/core-storefront.css';

interface CarritoItemCompleto extends CarritoItem {
  producto?: ProductoMarket | ProductoSecondHand;
  loading?: boolean;
}

const fmtNum = (n: number) => '$ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function CarritoPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CarritoItemCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarCarrito = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Si no hay sesión, mostrar carrito vacío
      const sesionId = localStorage.getItem('sesion_id');
      if (!sesionId) {
        setItems([]);
        setLoading(false);
        return;
      }
      
      const carritoItems = await getCarrito();
      
      // Si el carrito está vacío, no intentar cargar productos
      if (carritoItems.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      
      // Cargar información completa de cada producto
      const itemsCompletos = await Promise.all(
        carritoItems.map(async (item) => {
          try {
            const producto = item.producto_tipo === 'market'
              ? await fetchProductoMarketById(item.producto_id)
              : await fetchProductoSecondHandById(item.producto_id);
            
            return { ...item, producto: producto || undefined };
          } catch (err) {
            console.error(`Error cargando producto ${item.producto_id}:`, err);
            return { ...item, producto: undefined };
          }
        })
      );
      
      setItems(itemsCompletos);
    } catch (err) {
      console.error('Error cargando carrito:', err);
      // Si es un error de CORS o de red, mostrar mensaje más amigable
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('No se pudo conectar con el servidor. La función de Supabase puede no estar desplegada.');
      } else if (err instanceof Error && err.message.includes('JSON')) {
        setError('El servidor devolvió una respuesta inválida. Verifica que la función de Supabase esté desplegada.');
      } else {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
      // En caso de error, mostrar carrito vacío en lugar de error
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCarrito();
  }, []);

  const handleActualizarCantidad = async (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    
    try {
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, loading: true } : item
      ));
      
      await actualizarItemCarrito(itemId, nuevaCantidad);
      await cargarCarrito();
    } catch (err) {
      console.error('Error actualizando cantidad:', err);
      alert('Error al actualizar la cantidad. Intenta nuevamente.');
    }
  };

  const handleEliminar = async (itemId: string) => {
    if (!confirm('¿Eliminar este producto del carrito?')) return;
    
    try {
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, loading: true } : item
      ));
      
      await eliminarItemCarrito(itemId);
      await cargarCarrito();
    } catch (err) {
      console.error('Error eliminando item:', err);
      alert('Error al eliminar el producto. Intenta nuevamente.');
    }
  };

  const handleVaciar = async () => {
    if (!confirm('¿Vaciar todo el carrito?')) return;
    
    try {
      await vaciarCarrito();
      setItems([]);
    } catch (err) {
      console.error('Error vaciando carrito:', err);
      alert('Error al vaciar el carrito. Intenta nuevamente.');
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);
  const impuestos = subtotal * 0.22; // IVA 22%
  const envio = 0; // Por ahora sin envío
  const total = subtotal + impuestos + envio;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Cargando carrito...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#EF4444' }}>Error</div>
          <div style={{ marginBottom: '1rem' }}>{error}</div>
          <button
            onClick={cargarCarrito}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#FF6835',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
        <header style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #E5E7EB' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#222', fontSize: '1.2rem', fontWeight: '600' }}>
            ← Volver a la tienda
          </Link>
        </header>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#222' }}>Tu carrito está vacío</h1>
          <p style={{ color: '#6B7280', marginBottom: '2rem' }}>Agrega productos para comenzar tu compra</p>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: '#FF6835',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
            }}
          >
            Ir a la tienda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#222', fontSize: '1.2rem', fontWeight: '600' }}>
            ← Volver a la tienda
          </Link>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#222' }}>Carrito de Compras</h1>
          <div style={{ width: '120px' }}></div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
        {/* Lista de items */}
        <div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#222' }}>
                {items.length} {items.length === 1 ? 'producto' : 'productos'}
              </h2>
              {items.length > 0 && (
                <button
                  onClick={handleVaciar}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    color: '#EF4444',
                    border: '1px solid #EF4444',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Vaciar carrito
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item) => {
                const producto = item.producto;
                const imagen = producto?.imagen_principal || 'https://via.placeholder.com/150';
                const nombre = producto?.nombre || 'Producto no disponible';
                const precioTotal = item.precio_unitario * item.cantidad;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '1rem',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      opacity: item.loading ? 0.6 : 1,
                    }}
                  >
                    <img
                      src={imagen}
                      alt={nombre}
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#222' }}>{nombre}</h3>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            background: item.producto_tipo === 'market' ? '#FF6835' : '#6BB87A',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                          }}
                        >
                          {item.producto_tipo === 'market' ? 'Market' : 'Second Hand'}
                        </span>
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#222', marginBottom: '0.75rem' }}>
                        {fmtNum(precioTotal)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '0.25rem' }}>
                          <button
                            onClick={() => handleActualizarCantidad(item.id, item.cantidad - 1)}
                            disabled={item.loading || item.cantidad <= 1}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              background: 'transparent',
                              cursor: item.loading || item.cantidad <= 1 ? 'not-allowed' : 'pointer',
                              fontSize: '1.25rem',
                              color: item.loading || item.cantidad <= 1 ? '#D1D5DB' : '#222',
                            }}
                          >
                            −
                          </button>
                          <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: '600' }}>
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => handleActualizarCantidad(item.id, item.cantidad + 1)}
                            disabled={item.loading}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              background: 'transparent',
                              cursor: item.loading ? 'not-allowed' : 'pointer',
                              fontSize: '1.25rem',
                              color: item.loading ? '#D1D5DB' : '#222',
                            }}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleEliminar(item.id)}
                          disabled={item.loading}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            color: '#EF4444',
                            border: '1px solid #EF4444',
                            borderRadius: '6px',
                            cursor: item.loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', color: '#222' }}>Resumen</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
                <span>Subtotal</span>
                <span>{fmtNum(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
                <span>IVA (22%)</span>
                <span>{fmtNum(impuestos)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}>
                <span>Envío</span>
                <span>{envio === 0 ? 'Gratis' : fmtNum(envio)}</span>
              </div>
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700', color: '#222' }}>
                  <span>Total</span>
                  <span>{fmtNum(total)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              style={{
                width: '100%',
                padding: '1rem',
                background: '#FF6835',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
            >
              Proceder al Checkout
            </button>

            <Link
              to="/"
              style={{
                display: 'block',
                textAlign: 'center',
                color: '#6B7280',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              ← Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}




