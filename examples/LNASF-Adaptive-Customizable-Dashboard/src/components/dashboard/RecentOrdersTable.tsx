// src/components/dashboard/RecentOrdersTable.tsx
import { Order } from '@/types';
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
} from '@/components/ui';

interface RecentOrdersTableProps {
  orders: Order[];
  loading: boolean;
  showAll: boolean;
  onToggleShowAll: () => void;
  onRecordUse: () => void;
}

const statusColors = {
  completed: 'success',
  pending: 'warning',
  cancelled: 'error',
  processing: 'info',
} as const;

export default function RecentOrdersTable({
  orders,
  loading,
  showAll,
  onToggleShowAll,
  onRecordUse,
}: RecentOrdersTableProps) {
  if (loading) {
    return (
      <Card>
        <div className="h-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </Card>
    );
  }

  if (!orders.length) {
    return (
      <Card className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No orders found</p>
      </Card>
    );
  }

  const visibleOrders = showAll ? orders : orders.slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Orders
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {visibleOrders.length} of {orders.length} sample orders
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onRecordUse}>
            Record use
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onToggleShowAll();
              onRecordUse();
            }}
            aria-expanded={showAll}
          >
            {showAll ? 'Show recent' : 'View all'} →
          </Button>
        </div>
      </div>

      <div className="-mx-6 overflow-x-auto px-6">
        <Table hoverable>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.customer}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell className="font-medium">
                  ${order.total.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[order.status]}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        Customer and order details are generated mock data for this demo.
      </p>
    </Card>
  );
}
