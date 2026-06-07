export const projectId = import.meta.env.VITE_SUPABASE_URL?.split('.')?.[0]?.replace('https://', '') ?? '';
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';




