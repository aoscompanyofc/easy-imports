export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export type SidebarMode = 'expanded' | 'collapsed';

export interface AppState {
  sidebarMode: SidebarMode;
}

export interface MetricData {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: string;
  color?: string;
}

export interface ChartData {
  date: string;
  value: number;
}

export interface Sale {
  id: string;
  customerName: string;
  productName: string;
  value: number;
  timestamp: string;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  salesCount: number;
}
