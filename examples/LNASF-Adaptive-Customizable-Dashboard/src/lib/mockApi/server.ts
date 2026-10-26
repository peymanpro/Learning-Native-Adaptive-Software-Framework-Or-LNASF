// src/lib/mockApi/server.ts
import { createServer, Response } from 'miragejs';
import { demoChartData, demoOrders, demoStats } from '@/lib/mockApi/fixtures';

export function makeServer({ environment = 'development' } = {}) {
  return createServer({
    environment,

    routes() {
      this.namespace = 'api';

      // Keep development behavior deterministic and visibly simulated.
      this.timing = 350;

      this.get('/stats', () => ({ stats: demoStats }));

      this.get('/recent-orders', () => ({
        orders: demoOrders,
        total: demoOrders.length,
      }));

      this.get('/chart-data', () => demoChartData);

      this.get('/error-test', () => (
        new Response(400, {}, { error: 'This is a test error' })
      ));
    },
  });
}
