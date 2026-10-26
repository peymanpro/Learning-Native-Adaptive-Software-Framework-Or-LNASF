"use client";

import { useState } from "react";
import { SortableList } from "@/components/SortableList";
import { KanbanBoard } from "@/components/KanbanBoard";
import { FileUploadZone } from "@/components/FileUploadZone";
import { LnasfWorkflowPanel } from "@/components/LnasfWorkflowPanel";
import { initialColumns, initialSortableItems } from "@/constants/initial-data";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Column, SortableItem } from "@/types";
import {
  emptyWorkflowSnapshot,
  observeWorkflowEvent,
  WorkflowEvent,
} from "@/lib/lnasf/workflow-model";

export default function Home() {
  const [columns, setColumns] = useLocalStorage<Column[]>("kanban-data", initialColumns);
  const [sortableItems, setSortableItems] = useLocalStorage<SortableItem[]>(
    "sortable-list-data",
    initialSortableItems,
  );
  const [workflow, setWorkflow] = useState(emptyWorkflowSnapshot);
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(true);

  const recordWorkflowEvent = (event: WorkflowEvent) => {
    setWorkflow((current) => observeWorkflowEvent(current, event));
  };

  const resetAllData = () => {
    if (!window.confirm("آیا مطمئنی؟ همه داده‌ها به حالت اولیه برمی‌گردد.")) return;
    setColumns(initialColumns);
    setSortableItems(initialSortableItems);
    setWorkflow(emptyWorkflowSnapshot);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-4xl font-bold text-transparent">
            🎯 Drag & Drop Playground
          </h1>
          <p className="text-gray-600">
            آزمایش تعاملی مرتب‌سازی و جابه‌جایی با dnd-kit و Next.js
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["React 19", "Next.js 16", "@dnd-kit", "TypeScript", "Tailwind CSS"].map((label) => (
              <span key={label} className="rounded-full bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
                {label}
              </span>
            ))}
          </div>
        </header>

        <div className="mb-6 flex justify-end">
          <button
            onClick={resetAllData}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-300"
          >
            بازنشانی داده‌ها
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SortableList
            items={sortableItems}
            setItems={setSortableItems}
            onReorder={() => recordWorkflowEvent("list:reorder")}
          />
          <FileUploadZone />
          <div className="lg:col-span-2">
            <KanbanBoard
              columns={columns}
              setColumns={setColumns}
              onWorkflowEvent={recordWorkflowEvent}
            />
          </div>
        </div>

        <LnasfWorkflowPanel
          snapshot={workflow}
          enabled={recommendationsEnabled}
          onEnabledChange={setRecommendationsEnabled}
          onClear={() => setWorkflow(emptyWorkflowSnapshot)}
        />

        <footer className="mt-12 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <a
            href="https://github.com/peymanpro/next-dnd-kit-playground"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            مشاهده کد منبع در GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}
