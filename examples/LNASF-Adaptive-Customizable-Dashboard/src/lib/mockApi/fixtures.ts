import type { ChartData, Order, Stat } from '@/types';

export const demoStats: Stat[] = [
  { id: 'users', label: 'Total Users', value: '15,234', change: 12, icon: '👥' },
  { id: 'revenue', label: 'Revenue', value: '$89,234', change: 8.2, icon: '💰' },
  { id: 'conversion', label: 'Conversion Rate', value: '3.24%', change: -2, icon: '🎯' },
  { id: 'sessions', label: 'Active Sessions', value: '2,345', change: 5.3, icon: '⚡' },
  { id: 'bounce', label: 'Bounce Rate', value: '42.5%', change: -1.5, icon: '↘️' },
];

export const demoOrders: Order[] = [
  { id: 110, customer: 'Avery Morgan', total: 284.5, status: 'completed', date: '2026-10-11' },
  { id: 109, customer: 'Jordan Lee', total: 96.25, status: 'processing', date: '2026-10-10' },
  { id: 108, customer: 'Taylor Brooks', total: 412, status: 'pending', date: '2026-10-09' },
  { id: 107, customer: 'Riley Patel', total: 148.8, status: 'completed', date: '2026-10-08' },
  { id: 106, customer: 'Casey Rivera', total: 65.4, status: 'cancelled', date: '2026-10-07' },
  { id: 105, customer: 'Morgan Reed', total: 532.1, status: 'completed', date: '2026-10-06' },
  { id: 104, customer: 'Quinn Bennett', total: 184.99, status: 'processing', date: '2026-10-05' },
  { id: 103, customer: 'Cameron Brooks', total: 73.5, status: 'pending', date: '2026-10-04' },
  { id: 102, customer: 'Drew Parker', total: 249.75, status: 'completed', date: '2026-10-03' },
  { id: 101, customer: 'Skyler James', total: 118, status: 'completed', date: '2026-10-02' },
];

export const demoChartData: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Revenue 2026 (sample)',
      data: [30000, 45000, 58000, 72000, 89000, 105000],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      label: 'Revenue 2025 (sample)',
      data: [25000, 38000, 49000, 63000, 78000, 92000],
      borderColor: 'rgb(156, 163, 175)',
      backgroundColor: 'rgba(156, 163, 175, 0.1)',
    },
  ],
};
