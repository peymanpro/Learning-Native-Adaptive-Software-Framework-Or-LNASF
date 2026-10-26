/**
 * SortableItem Component
 * 
 * A draggable and sortable list item component for use with sortable lists.
 * 
 * @description This component represents an individual item in a sortable list that:
 * - Uses @dnd-kit/sortable's useSortable hook for drag-and-drop reordering
 * - Provides visual feedback during drag operations (opacity: 0.5, ring, shadow)
 * - Displays item title with index number (1-based) for positional awareness
 * - Uses CSS transforms for smooth drag animations without layout thrashing
 * - Includes grab cursor styling (grab/grabbing) for better UX
 * - Features gradient background (blue to indigo) for visual appeal
 * - Shows a drag handle indicator (⋮⋮) on the right side
 * 
 * @dependencies
 * - @dnd-kit/sortable for sortable functionality
 * - @dnd-kit/utilities for CSS transform handling
 * 
 * @props
 * - id: Unique identifier for the sortable item (string)
 * - title: Display text content for the item
 * - index: Zero-based position index (used to display 1-based number)
 * 
 * @drag-and-drop behavior
 * - useSortable hook requires only id for basic functionality
 * - transform and transition styles from CSS utilities enable smooth movement
 * - isDragging state controls opacity and additional styling during active drag
 * - All drag listeners and attributes are spread onto the root div
 * - Entire item acts as drag handle (no separate grab area needed)
 * 
 * @styling
 * - Gradient background: from-blue-50 to-indigo-50
 * - Border: blue-200 with rounded-lg corners
 * - Hover effect: shadow-md
 * - Active drag: shadow-lg + ring-2 ring-blue-400
 * - Index number displayed as #{index + 1} (e.g., #1, #2, #3)
 * - Drag hint icon (⋮⋮) provides clear affordance for draggability
 * 
 * @performance
 * - CSS transforms use GPU acceleration for smooth 60fps animations
 * - No unnecessary re-renders during drag operations
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  id: string;
  title: string;
  index: number;
}

export function SortableItem({ id, title, index }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm mb-3 hover:shadow-md transition-all duration-200 ${
        isDragging ? "shadow-lg ring-2 ring-blue-400" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">#{index + 1}</span>
        <span className="flex-1 text-gray-700 font-medium">{title}</span>
        <span className="text-gray-300 text-sm">⋮⋮</span>
      </div>
    </div>
  );
}