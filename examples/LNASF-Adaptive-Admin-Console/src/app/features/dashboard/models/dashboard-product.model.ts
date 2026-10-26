export interface DashboardProduct {
  id: number;
  title: string;
  price: number;
  rating: number;
  stock: number;
  category: string;
  brand?: string;
  thumbnail: string;
}

export interface DashboardProductsResponse {
  products: DashboardProduct[];
  total: number;
  skip: number;
  limit: number;
}
