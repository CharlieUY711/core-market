import { useUserRole } from "../hooks/useUserRole"

export default function Sidebar() {
  const role = useUserRole()

  const common = [
    { name: "Inicio", path: "/dashboard" },
    { name: "Órdenes", path: "/dashboard/orders" }
  ]

  const admin = [
    { name: "Productos", path: "/dashboard/products" },
    { name: "Catálogo", path: "/dashboard/catalog" },
    { name: "ML Sync", path: "/dashboard/ml" },
    { name: "Analytics", path: "/dashboard/analytics" }
  ]

  const menu = role === "admin" ? [...common, ...admin] : common

  return (
    <div style={{
      width: 250,
      background: 'var(--color-bg-sidebar)',
      color: 'var(--color-primary)',
      height: "100vh",
      padding: 20
    }}>
      <h2>CORE</h2>

      {menu.map(item => (
        <div key={item.name} style={{ margin: "10px 0" }}>
          <a href={item.path} style={{ color: 'var(--color-primary)',
            {item.name}
          </a>
        </div>
      ))}
    </div>
  )
}


