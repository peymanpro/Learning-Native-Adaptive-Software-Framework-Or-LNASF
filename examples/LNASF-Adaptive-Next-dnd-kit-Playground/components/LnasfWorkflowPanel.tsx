"use client";

import { WorkflowEvent, WorkflowSnapshot, recommendNextEvent } from "@/lib/lnasf/workflow-model";
import { Card } from "@/components/ui/Card";

const labels: Record<WorkflowEvent, string> = {
  "list:reorder": "مرتب‌سازی لیست",
  "task:reorder": "مرتب‌سازی تسک",
  "task:move": "انتقال تسک بین ستون‌ها",
};

interface LnasfWorkflowPanelProps {
  snapshot: WorkflowSnapshot;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onClear: () => void;
}

export function LnasfWorkflowPanel({
  snapshot,
  enabled,
  onEnabledChange,
  onClear,
}: LnasfWorkflowPanelProps) {
  const recommendation = enabled ? recommendNextEvent(snapshot) : null;
  const transitions = Object.entries(snapshot.transitionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <Card className="mt-6 border border-indigo-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">LNASF · یادگیری گردش‌کار</h2>
          <p className="mt-1 text-sm text-gray-500">
            مشاهده رویدادها، یادگیری گذارها و پیشنهاد اختیاری؛ بدون اجرای خودکار عملیات.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          نمایش پیشنهادها
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">رویدادهای ثبت‌شده</div>
          <div className="text-2xl font-semibold text-gray-800">{snapshot.observations.length}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">گذارهای آموخته‌شده</div>
          <div className="text-2xl font-semibold text-gray-800">{Object.keys(snapshot.transitionCounts).length}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-500">حافظه</div>
          <div className="text-sm font-medium text-gray-800">فقط نشست جاری</div>
        </div>
      </div>

      {recommendation && (
        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-950">
          <strong>پیشنهاد گردش‌کار:</strong> احتمال دارد گام بعدی «{labels[recommendation.nextEvent]}» باشد.
          <div className="mt-1 text-xs text-indigo-800">
            اطمینان تجربی: {Math.round(recommendation.confidence * 100)}٪ · پشتیبانی: {recommendation.support} مشاهده
          </div>
        </div>
      )}
      {enabled && !recommendation && (
        <p className="mt-4 text-sm text-gray-500">
          هنوز دادهٔ کافی برای پیشنهاد قابل اتکا وجود ندارد. حداقل ۳ مشاهده و اطمینان ۶۵٪ لازم است.
        </p>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700">گذارهای پرتکرار</h3>
        {transitions.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">با انجام عملیات مرتب‌سازی یا جابه‌جایی، مدل شروع به یادگیری می‌کند.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {transitions.map(([transition, count]) => (
              <li key={transition} className="flex justify-between gap-3">
                <span>{transition.split(" -> ").map((event) => labels[event as WorkflowEvent] ?? event).join(" ← ")}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">داده‌ها به سرور ارسال نمی‌شوند و با بارگذاری مجدد صفحه پاک می‌شوند.</p>
        <button onClick={onClear} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
          پاک‌کردن داده‌های یادگیری
        </button>
      </div>
    </Card>
  );
}
