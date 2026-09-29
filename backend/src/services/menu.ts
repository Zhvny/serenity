import type { ProductRepo } from "../repos/products.js";

export function menuService(repo: ProductRepo) {
  return {
    listProducts: (f: { category?: string; tag?: string }) => repo.list(f),
    getProduct: (id: string) => repo.getById(id),
    listCategories: () => repo.listCategories(),
  };
}
export type MenuService = ReturnType<typeof menuService>;
