// src/components/dashboard/StatsCard.tsx
import { Stat } from '@/types';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  stat: Stat;
}

export default function StatsCard({ stat }: StatsCardProps) {
  const isPositive = stat.change > 0;
  
  return (
    <Card variant="interactive" className="group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {stat.label}
          </p>
          <p className="text-2xl font-semibold mt-2 text-gray-900 dark:text-white">
            {stat.value}
          </p>
        </div>
        {stat.icon && (
          <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
            {stat.icon}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center">
        <span className={cn(
          "text-sm font-medium",
          isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {isPositive ? '↑' : '↓'} {Math.abs(stat.change)}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
          vs last month
        </span>
      </div>
    </Card>
  );
}