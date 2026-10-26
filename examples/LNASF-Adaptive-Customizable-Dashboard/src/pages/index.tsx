import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import ThemeCustomizer from '@/components/theme/ThemeCustomizer';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentOrdersTable from '@/components/dashboard/RecentOrdersTable';
import RevenueChart from '@/components/dashboard/RevenueChart';
import DashboardLearningPanel from '@/components/lnasf/DashboardLearningPanel';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDashboardLearning } from '@/hooks/useDashboardLearning';
import {
  DEFAULT_DASHBOARD_ORDER,
  moveSectionToFront,
  normalizeDashboardOrder,
  type DashboardSection,
} from '@/lib/lnasf/dashboard-learning';
import type { Order, Stat } from '@/types';

function downloadTextFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

function csvCell(value: string | number | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [savedLayout, setSavedLayout] = useLocalStorage<DashboardSection[]>(
    'lnasf-dashboard-layout-v1',
    DEFAULT_DASHBOARD_ORDER,
  );
  const layout = normalizeDashboardOrder(savedLayout);
  const {
    history,
    prediction,
    recordSectionUse,
    resetLearning,
  } = useDashboardLearning();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/recent-orders'),
        ]);

        if (!statsRes.ok || !ordersRes.ok) {
          throw new Error('The dashboard demo API returned an unsuccessful response.');
        }

        const [statsData, ordersData] = await Promise.all([
          statsRes.json(),
          ordersRes.json(),
        ]);

        setStats(statsData.stats || statsData);
        setOrders(ordersData.orders || ordersData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateReport = () => {
    const report = {
      title: 'LNASF Adaptive Dashboard Snapshot',
      generatedAt: new Date().toISOString(),
      note: 'Sample dashboard data; this is not a production business report.',
      metrics: stats,
      orders,
      adaptiveLayout: layout,
      learning: {
        observations: history.length,
        currentPrediction: prediction && {
          from: prediction.from,
          to: prediction.to,
          support: prediction.support,
          confidence: prediction.confidence,
          gate: prediction.gate,
        },
      },
    };

    downloadTextFile(
      'lnasf-dashboard-report.json',
      JSON.stringify(report, null, 2),
      'application/json;charset=utf-8',
    );
    recordSectionUse('quick-actions');
  };

  const handleExportData = () => {
    const rows: (string | number | undefined)[][] = [
      ['record_type', 'id', 'label_or_customer', 'value', 'change_percent', 'status', 'date'],
      ...stats.map((stat) => [
        'metric',
        stat.id,
        stat.label,
        stat.value,
        stat.change,
        '',
        '',
      ]),
      ...orders.map((order) => [
        'order',
        order.id,
        order.customer,
        order.total.toFixed(2),
        '',
        order.status,
        order.date,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

    downloadTextFile(
      'lnasf-dashboard-data.csv',
      `\uFEFF${csv}`,
      'text/csv;charset=utf-8',
    );
    recordSectionUse('quick-actions');
  };

  const handleApplySuggestion = (section: DashboardSection) => {
    setSavedLayout(moveSectionToFront(layout, section));
  };

  const handleResetLayout = () => {
    setSavedLayout([...DEFAULT_DASHBOARD_ORDER]);
  };

  const handleThemePanelChange = (open: boolean) => {
    setThemeCustomizerOpen(open);
    if (open) {
      recordSectionUse('quick-actions');
    }
  };

  const sectionClasses: Record<DashboardSection, string> = {
    metrics: 'lg:col-span-3',
    revenue: 'lg:col-span-2',
    'quick-actions': 'lg:col-span-1',
    orders: 'lg:col-span-3',
  };

  const renderSection = (section: DashboardSection) => {
    switch (section) {
      case 'metrics':
        return (
          <section id="dashboard-metrics" aria-labelledby="metrics-heading">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="metrics-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Key Metrics
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sample business indicators
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => recordSectionUse('metrics')}
                title="Record an explicit section-use signal for the demo"
              >
                Record use
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {loading ? (
                [...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="card h-32 animate-pulse bg-gray-200 dark:bg-gray-700"
                  />
                ))
              ) : stats.length > 0 ? (
                stats.map((stat) => <StatsCard key={stat.id} stat={stat} />)
              ) : (
                <Card className="md:col-span-2 xl:col-span-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Metrics could not be loaded. Start the development server to use the mock API.
                  </p>
                </Card>
              )}
            </div>
          </section>
        );

      case 'revenue':
        return (
          <section id="dashboard-revenue" aria-label="Revenue overview">
            <RevenueChart onRecordUse={() => recordSectionUse('revenue')} />
          </section>
        );

      case 'quick-actions':
        return (
          <section id="dashboard-quick-actions" aria-labelledby="quick-actions-heading">
            <Card className="h-full">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 id="quick-actions-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Quick Actions
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => recordSectionUse('quick-actions')}
                  title="Record an explicit section-use signal for the demo"
                >
                  Record use
                </Button>
              </div>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Export a snapshot or adjust the appearance of this workspace.
              </p>
              <div className="space-y-3">
                <Button variant="primary" className="w-full" onClick={handleCreateReport}>
                  Download Report JSON
                </Button>
                <Button variant="outline" className="w-full" onClick={handleExportData}>
                  Export CSV Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleThemePanelChange(true)}
                >
                  Theme Settings
                </Button>
              </div>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Downloads contain local demo data and the current layout/model summary.
              </p>
            </Card>
          </section>
        );

      case 'orders':
        return (
          <section id="dashboard-orders" aria-label="Recent orders">
            <RecentOrdersTable
              orders={orders}
              loading={loading}
              showAll={showAllOrders}
              onToggleShowAll={() => {
                setShowAllOrders((current) => !current);
                recordSectionUse('orders');
              }}
              onRecordUse={() => recordSectionUse('orders')}
            />
          </section>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-300">
              Learning-Native Adaptive Software Framework
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              Adaptive Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              A small, inspectable experiment in evidence-gated dashboard personalization.
            </p>
          </div>
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNotificationsOpen((current) => !current);
                recordSectionUse('quick-actions');
              }}
              aria-expanded={notificationsOpen}
            >
              <span className="mr-2" aria-hidden="true">🔔</span>
              Demo notifications
            </Button>
            {notificationsOpen && (
              <div
                className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                role="status"
              >
                <p className="font-medium text-gray-900 dark:text-white">No new notifications</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This demo uses generated sample data.
                </p>
              </div>
            )}
          </div>
        </header>

        <div className="mb-8">
          <DashboardLearningPanel
            history={history}
            prediction={prediction}
            currentOrder={layout}
            onApplySuggestion={handleApplySuggestion}
            onResetLearning={resetLearning}
            onResetLayout={handleResetLayout}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {layout.map((section) => (
            <div key={section} className={sectionClasses[section]}>
              {renderSection(section)}
            </div>
          ))}
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            LNASF Adaptive Dashboard · Next.js, React, TypeScript, and Tailwind CSS
          </p>
          <p className="mt-1">
            Session learning is local, bounded, and advisory; no performance gain is claimed.
          </p>
        </footer>
      </div>

      <ThemeCustomizer
        open={themeCustomizerOpen}
        onOpenChange={handleThemePanelChange}
      />
    </div>
  );
}
