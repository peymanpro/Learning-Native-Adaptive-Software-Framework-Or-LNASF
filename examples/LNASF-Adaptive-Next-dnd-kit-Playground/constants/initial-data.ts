// constants/initial-data.ts

import { Column, SortableItem } from "@/types";

export const initialColumns: Column[] = [
  {
    id: "todo",
    title: "📝 To Do",
    tasks: [
      { id: "task-1", title: "Learn @dnd-kit", description: "Study core concepts", priority: "high", createdAt: new Date() },
      { id: "task-2", title: "Build this project", description: "Create drag-drop playground", priority: "medium", createdAt: new Date() },
      { id: "task-3", title: "Write documentation", description: "Create README with demo", priority: "low", createdAt: new Date() },
    ],
  },
  {
    id: "in-progress",
    title: "⚡ In Progress",
    tasks: [
      { id: "task-4", title: "Setup project structure", description: "Organize folders", priority: "high", createdAt: new Date() },
    ],
  },
  {
    id: "done",
    title: "✅ Done",
    tasks: [
      { id: "task-5", title: "Initialize Next.js project", description: "Create app", priority: "medium", createdAt: new Date() },
    ],
  },
];

export const initialSortableItems: SortableItem[] = [
  { id: "item-1", title: "Complete project setup", order: 1 },
  { id: "item-2", title: "Implement drag-and-drop", order: 2 },
  { id: "item-3", title: "Add touch support", order: 3 },
  { id: "item-4", title: "Write tests", order: 4 },
  { id: "item-5", title: "Deploy to Vercel", order: 5 },
];