"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import type { Task, Column as ColumnType } from "@/types";
import type { WorkflowEvent } from "@/lib/lnasf/workflow-model";
import { Card } from "./ui/Card";

interface KanbanBoardProps {
  columns: ColumnType[];
  setColumns: (columns: ColumnType[]) => void;
  onWorkflowEvent?: (event: WorkflowEvent) => void;
}

export function KanbanBoard({ columns, setColumns, onWorkflowEvent }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { task?: Task; columnId?: string } | undefined;
    setActiveTask(data?.task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { task?: Task; columnId?: string } | undefined;
    const overData = over.data.current as { type?: string; columnId?: string } | undefined;
    const sourceColumnId = activeData?.columnId;
    const destinationColumnId =
      overData?.type === "column" ? String(over.id) : overData?.columnId;

    if (!sourceColumnId || !destinationColumnId) return;

    const source = columns.find((column) => column.id === sourceColumnId);
    const destination = columns.find((column) => column.id === destinationColumnId);
    const task = source?.tasks.find((item) => item.id === active.id);
    if (!source || !destination || !task) return;

    if (sourceColumnId === destinationColumnId) {
      const oldIndex = source.tasks.findIndex((item) => item.id === active.id);
      const newIndex = source.tasks.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      setColumns(columns.map((column) =>
        column.id === sourceColumnId
          ? { ...column, tasks: arrayMove(column.tasks, oldIndex, newIndex) }
          : column,
      ));
      onWorkflowEvent?.("task:reorder");
      return;
    }

    const remaining = source.tasks.filter((item) => item.id !== active.id);
    const destinationTasks = destination.tasks.filter((item) => item.id !== active.id);
    const overIndex = destinationTasks.findIndex((item) => item.id === over.id);
    const insertionIndex = overIndex < 0 ? destinationTasks.length : overIndex;

    const nextColumns = columns.map((column) => {
      if (column.id === sourceColumnId) return { ...column, tasks: remaining };
      if (column.id === destinationColumnId) {
        const nextTasks = [...destinationTasks];
        nextTasks.splice(insertionIndex, 0, task);
        return { ...column, tasks: nextTasks };
      }
      return column;
    });

    setColumns(nextColumns);
    onWorkflowEvent?.("task:move");
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.5" } },
    }),
  };

  return (
    <Card className="overflow-x-auto p-6">
      <h2 className="mb-4 text-xl font-bold text-gray-800">🎯 تخته کانبان</h2>
      <p className="mb-4 text-sm text-gray-500">تسک‌ها را بین ستون‌ها جابه‌جا کنید یا در هر ستون مرتب کنید.</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex gap-4 pb-4">
          {columns.map((column) => (
            <KanbanColumn key={column.id} column={column} tasks={column.tasks} />
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="rotate-3 rounded-lg border-2 border-blue-400 bg-white p-3 shadow-lg">
              <div className="text-sm font-medium text-gray-800">{activeTask.title}</div>
              {activeTask.description && <div className="mt-1 text-xs text-gray-500">{activeTask.description}</div>}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Card>
  );
}
