import { createBrowserRouter, type RouteObject } from "react-router-dom";
import OddyStorefront          from "./public/OddyStorefront";
import CarritoPage             from "./public/CarritoPage";
import CheckoutPage            from "./public/CheckoutPage";
import OrdenPage               from "./public/OrdenPage";
import MensajePage             from "./public/MensajePage";
import SuccessPage             from "./public/SuccessPage";
import FailurePage             from "./public/FailurePage";
import PendingPage             from "./public/PendingPage";
import DashboardRedirect       from "./public/DashboardRedirect";
import AdminLayout             from "./admin/components/AdminLayout";
import AdminDashboard          from "./admin/pages/AdminDashboard";
import AdminOrders             from "./admin/pages/AdminOrders";
import AdminAnalytics          from "./admin/pages/AdminAnalytics";
import AdminML                 from "./admin/pages/AdminML";
import AdminCatalog            from "./admin/pages/AdminCatalog";
import AdminExport from "./admin/pages/AdminExport";
import AdminPublicaciones      from "./admin/pages/AdminPublicaciones";
import AdminProfile            from "./admin/pages/AdminProfile";
import AdminArticulos          from "./admin/pages/AdminArticulos";
import AdminBiblioteca         from "./admin/pages/AdminBiblioteca";
import AdminEditor             from "./admin/editor/EditorPage";


export const TODAS_LAS_RUTAS: (RouteObject & { id: string })[] = [
  { id: "storefront",          path: "/",           Component: OddyStorefront },
  { id: "tienda",              path: "/tienda",     Component: OddyStorefront },
  { id: "carrito",             path: "/carrito",    Component: CarritoPage },
  { id: "checkout",            path: "/checkout",   Component: CheckoutPage },
  { id: "orden",               path: "/orden/:id",  Component: OrdenPage },
  { id: "etiqueta-emotiva",    path: "/m/:token",   Component: MensajePage },
  { id: "success",             path: "/success",    Component: SuccessPage },
  { id: "failure",             path: "/failure",    Component: FailurePage },
  { id: "pending",             path: "/pending",    Component: PendingPage },
  { id: "dashboard-redirect",  path: "/dashboard",  Component: DashboardRedirect },
  { id: "dashboard-redirect2", path: "/dashboard/*",Component: DashboardRedirect },
  {
    id: "admin", path: "/admin", Component: AdminLayout,
    children: [
      { id: "admin-dashboard",      path: "",              Component: AdminDashboard },
      { id: "admin-orders",         path: "orders",        Component: AdminOrders },
      { id: "admin-publicaciones",  path: "publicaciones", Component: AdminPublicaciones },
      { id: "admin-export", path: "export", Component: AdminExport },
      { id: "admin-export", path: "export", Component: AdminExport },
      { id: "admin-profile",        path: "profile",       Component: AdminProfile },
      { id: "admin-catalog-articulos", path: "catalog/articulos", Component: AdminArticulos },
      { id: "admin-biblioteca", path: "biblioteca", Component: AdminBiblioteca },
      { id: "admin-editor", path: "editor", Component: AdminEditor },

      { id: "admin-catalog", path: "catalog", Component: AdminCatalog },
      { id: "admin-ml",             path: "ml",            Component: AdminML },
    ] as RouteObject[],
  },
];

export const router = createBrowserRouter(TODAS_LAS_RUTAS);
