// carritoApi.ts — re-export hacia la implementación canónica (usa sesion_id)
export {
  getCarrito,
  agregarAlCarrito,
  actualizarItemCarrito,
  eliminarItemCarrito,
  vaciarCarrito,
} from '../app/services/carritoApi';