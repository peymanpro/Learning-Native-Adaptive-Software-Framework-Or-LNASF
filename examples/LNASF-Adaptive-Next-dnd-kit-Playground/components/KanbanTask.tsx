/**
 * KanbanTask Component
 * 
 * An individual sortable task card within a Kanban column that can be dragged and reordered.
 * 
 * @description This component represents a single task card that:
 * - Is sortable within its column using @dnd-kit/sortable's useSortable hook
 * - Can be dragged between different columns (cross-column drag-and-drop)
 * - Provides visual feedback during drag operations (opacity reduction, shadow, ring)
 * - Displays task title, optional description, and priority badge
 * - Uses CSS transforms for smooth drag animations (no layout thrashing)
 * - Includes cursor styling (cursor-grab / cursor-grabbing) for better UX
 * 
 * @dependencies
 * - @dnd-kit/sortable for sortable drag-and-drop functionality
 * - @dnd-kit/utilities for CSS transform handling
 * 
 * @props
 * - task: Task object containing id, title, description, and priority
 * - columnId: ID of the parent column (used for drag detection and cross-column movement)
 * 
 * @drag-and-drop behavior
 * - useSortable hook makes the task draggable and sortable
 * - Custom data payload includes task object, columnId, and type: "task"
 * - transform and transition styles from CSS utilities for smooth animation
 * - isDragging state controls opacity (0.5) during active drag
 * - Drag handle is the entire card (attributes/listeners spread on root div)
 * 
 * @styling
 * - Priority badge with color mapping:
 *   - low: green background
 *   - medium: yellow background
 *   - high: red background
 * - Persian text labels (کم/متوسط/زیاد) with emoji icons 🟢/🟡/🔴
 * - Hover effect (shadow-md) and active grabbing cursor
 * - Visual distinction when dragging (shadow-lg + ring-2 ring-blue-400)
 */


"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types";

interface KanbanTaskProps {
  task: Task;
  columnId: string;
}

export function KanbanTask({ task, columnId }: KanbanTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      columnId,
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 mb-2 bg-gray-50 rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-blue-400" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 flex-1">{task.title}</p>
        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority === "low" ? "🟢 کم" : task.priority === "medium" ? "🟡 متوسط" : "🔴 زیاد"}
        </span>
      </div>
      {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
    </div>
  );
}