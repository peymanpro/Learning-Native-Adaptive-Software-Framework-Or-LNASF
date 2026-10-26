/**
 * KanbanColumn Component
 * 
 * A single column component in the Kanban board that serves as a droppable container for tasks.
 * 
 * @description This component represents a vertical column (e.g., "Todo", "In Progress", "Done") that:
 * - Acts as a droppable area for receiving tasks from other columns via @dnd-kit's useDroppable hook
 * - Provides visual feedback (ring and shadow) when a task is being dragged over it
 * - Contains a SortableContext for enabling drag-and-drop reordering of tasks within the column
 * - Displays column title with a count badge showing total number of tasks
 * - Uses different background colors based on column type (todo, in-progress, done)
 * - Includes a scrollable task list area with minimum/maximum height constraints
 * 
 * @dependencies
 * - @dnd-kit/core for droppable functionality
 * - @dnd-kit/sortable for task sorting capability
 * - KanbanTask component for rendering individual tasks
 * 
 * @props
 * - column: Column object containing id, title, and tasks array
 * - tasks: Array of tasks belonging to this column
 * 
 * @drag-and-drop behavior
 * - Droppable area uses column.id as the droppable identifier
 * - isOver state triggers visual styling (blue ring + shadow)
 * - Custom data payload includes type: "column" and columnId for drag detection
 * - SortableContext uses verticalListSortingStrategy for natural list ordering
 * 
 * @styling
 * - Fixed width (w-80) for consistent column sizing
 * - Color mapping: todo (gray), in-progress (blue), done (green)
*/

"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanTask } from "./KanbanTask";
import { Column } from "@/types";

interface KanbanColumnProps {
  column: Column;
  tasks: Column["tasks"];
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  const taskIds = tasks.map((task) => task.id);

  const columnColors = {
    todo: "bg-gray-50",
    "in-progress": "bg-blue-50",
    done: "bg-green-50",
  };

  const columnColor = columnColors[column.id as keyof typeof columnColors] || "bg-gray-50";

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 rounded-lg transition-colors ${columnColor} ${
        isOver ? "ring-2 ring-blue-400 shadow-lg" : ""
      }`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">{column.title}</h3>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">
            {tasks.length}
          </span>
        </div>
        <div className="min-h-[300px] max-h-[calc(100vh-300px)] overflow-y-auto">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <KanbanTask key={task.id} task={task} columnId={column.id} />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}