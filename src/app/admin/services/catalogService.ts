import { supabase } from "../../../utils/supabase/client";

export const catalogService = {
  // Departments
  getDepartments: () => supabase.from("admin_departments").select("*").order("name"),
  createDepartment: (name: string, slug: string) => supabase.rpc("admin_create_department", { p_name: name, p_slug: slug }),
  updateDepartment: (id: string, fields: any) => supabase.rpc("admin_update_department", { p_id: id, ...fields }),
  deleteDepartment: (id: string) => supabase.rpc("admin_delete_department", { p_id: id }),

  // Categories
  getCategories: () => supabase.from("admin_categories").select("*").order("name"),
  createCategory: (department_id: string, name: string, slug: string) =>
    supabase.rpc("admin_create_category", { p_department_id: department_id, p_name: name, p_slug: slug }),
  updateCategory: (id: string, fields: any) => supabase.rpc("admin_update_category", { p_id: id, ...fields }),
  deleteCategory: (id: string) => supabase.rpc("admin_delete_category", { p_id: id }),

  // Subcategories
  getSubcategories: () => supabase.from("admin_subcategories").select("*").order("name"),
  createSubcategory: (category_id: string, name: string, slug: string) =>
    supabase.rpc("admin_create_subcategory", { p_category_id: category_id, p_name: name, p_slug: slug }),
  updateSubcategory: (id: string, fields: any) => supabase.rpc("admin_update_subcategory", { p_id: id, ...fields }),
  deleteSubcategory: (id: string) => supabase.rpc("admin_delete_subcategory", { p_id: id }),
};

export function toSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const NODE_ICONS: Record<string, string> = {
  department:  "🏢",
  category:    "📂",
  subcategory: "📁",
  node:        "📌",
  product:     "📦",
};

export const NODE_LABELS: Record<string, string> = {
  department:  "Departamento",
  category:    "Categoría",
  subcategory: "Subcategoría",
  node:        "Nodo",
  product:     "Producto",
};




