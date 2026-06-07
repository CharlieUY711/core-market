import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export function useRequireAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const redirected = useRef(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !redirected.current) {
        redirected.current = true;
        navigate("/?login=true&redirect=" + encodeURIComponent(location.pathname), { replace: true });
      } else {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !redirected.current) {
        redirected.current = true;
        navigate("/?login=true&redirect=" + encodeURIComponent(location.pathname), { replace: true });
      } else {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { loading, user };
}





