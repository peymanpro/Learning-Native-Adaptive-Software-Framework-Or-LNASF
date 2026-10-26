import { Button, Card } from '@/components/ui';
import {
  DASHBOARD_SECTION_LABELS,
  MIN_TRANSITION_CONFIDENCE,
  MIN_TRANSITION_SUPPORT,
  type DashboardPrediction,
  type DashboardSection,
} from '@/lib/lnasf/dashboard-learning';

interface DashboardLearningPanelProps {
  history: DashboardSection[];
  prediction: DashboardPrediction | null;
  currentOrder: DashboardSection[];
  onApplySuggestion: (section: DashboardSection) => void;
  onResetLearning: () => void;
  onResetLayout: () => void;
}

export default function DashboardLearningPanel({
  history,
  prediction,
  currentOrder,
  onApplySuggestion,
  onResetLearning,
  onResetLayout,
}: DashboardLearningPanelProps) {
  const recentHistory = history.slice(-8);

  return (
    <Card className="border border-primary-200 dark:border-gray-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
              LNASF reference demo
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Session-only · No remote telemetry
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
            Adaptive layout advisor
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Record the dashboard areas you use. A transparent transition-frequency
            model may suggest which area to place first. It never changes the
            layout without your approval.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onResetLearning}>
            Reset learning
          </Button>
          <Button variant="outline" size="sm" onClick={onResetLayout}>
            Restore default layout
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/60">
          <p className="text-sm text-gray-500 dark:text-gray-400">Session signals</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {history.length}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Maximum {100} distinct consecutive section changes
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/60">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current layout</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {currentOrder.map((section) => DASHBOARD_SECTION_LABELS[section]).join(' → ')}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/60">
          <p className="text-sm text-gray-500 dark:text-gray-400">Decision gate</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            At least {MIN_TRANSITION_SUPPORT} transitions and{' '}
            {Math.round(MIN_TRANSITION_CONFIDENCE * 100)}% confidence
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Prediction and adaptation approval are separate steps.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Recent section-use sequence
        </p>
        {recentHistory.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {recentHistory.map((section, index) => (
              <span
                key={`${section}-${index}`}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {DASHBOARD_SECTION_LABELS[section]}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No signals recorded yet. Use “Record use” on a dashboard section to begin.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700" aria-live="polite">
        {!prediction ? (
          <>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Waiting for a repeatable pattern
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Use at least two different sections, then repeat a section sequence to
              provide transition evidence. Weak evidence does not change the layout.
            </p>
          </>
        ) : (
          <>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Candidate next section: {DASHBOARD_SECTION_LABELS[prediction.to]}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              After {DASHBOARD_SECTION_LABELS[prediction.from]}, this section followed
              in {prediction.matches} of {prediction.support} observed transitions
              ({Math.round(prediction.confidence * 100)}% empirical confidence).
            </p>
            {prediction.gate === 'ready' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => onApplySuggestion(prediction.to)}
                >
                  Apply suggestion: move to top
                </Button>
                <span className="text-xs text-green-700 dark:text-green-300">
                  Evidence gate passed. Your approval is still required.
                </span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                Suggestion withheld: {prediction.gate === 'insufficient-support'
                  ? `at least ${MIN_TRANSITION_SUPPORT} transitions from the current section are required.`
                  : `confidence must reach ${Math.round(MIN_TRANSITION_CONFIDENCE * 100)}%.`}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
