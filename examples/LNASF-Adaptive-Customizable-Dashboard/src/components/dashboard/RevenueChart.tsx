// src/components/dashboard/RevenueChart.tsx
import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

interface RevenueChartProps {
  onRecordUse?: () => void;
}

export default function RevenueChart({ onRecordUse }: RevenueChartProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chart-data')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load chart data.');
        }
        return response.json();
      })
      .then((data: ChartData) => {
        setChartData(data);
      })
      .catch((error: unknown) => {
        console.error('Error fetching chart data:', error);
        setChartData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Card className="h-80 animate-pulse bg-gray-200 dark:bg-gray-700" padding="none" />;
  }

  const values = chartData?.datasets[0]?.data ?? [];
  const maxValue = Math.max(1, ...values);

  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Revenue Overview
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRecordUse}
          title="Record an explicit section-use signal for the demo"
        >
          Record use
        </Button>
      </div>

      {!chartData || values.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No chart data available. The chart uses generated development data.
          </p>
        </div>
      ) : (
        <>
          <div className="flex h-64 items-end justify-between gap-2">
            {chartData.labels.map((label, index) => {
              const value = values[index] ?? 0;
              const height = (value / maxValue) * 100;

              return (
                <div key={label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="group relative w-full rounded-t bg-primary-500 transition-colors duration-300 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
                    style={{ height: `${height}%` }}
                    aria-label={`${label}: ${value}`}
                  >
                    <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      ${value}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="mr-2 inline-block h-3 w-3 rounded-full bg-primary-500" />
            {chartData.datasets[0].label}
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Generated sample values; not connected to a production analytics system.
          </p>
        </>
      )}
    </Card>
  );
}
