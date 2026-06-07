import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export function useUserRole() {
  const [role, setRole] = useState("user")

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser()

      if (!user?.user) return

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.user.id)
        .single()

      if (data?.role) setRole(data.role)
    }

    load()
  }, [])

  return role
}




