import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

export default function DashboardLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={{ flex: 1 }}>
        <Topbar />

        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}


