import { useUserRole } from "./useUserRole"

export function usePermissions() {
  const role = useUserRole()

  return {
    isAdmin: role === "admin",

    canEditCatalog: role === "admin",
    canDelete: role === "admin",
    canCreate: role === "admin",

    canViewAnalytics: role === "admin",

    canViewOrders: true,
  }
}




