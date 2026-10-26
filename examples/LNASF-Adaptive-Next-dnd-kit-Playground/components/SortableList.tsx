"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import type { SortableItem as SortableItemType } from "@/types";
import { Card } from "./ui/Card";

interface SortableListProps {
  items: SortableItemType[];
  setItems: (items: SortableItemType[]) => void;
  onReorder?: () => void;
}

export function SortableList({ items, setItems, onReorder }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    setItems(arrayMove(items, oldIndex, newIndex));
    onReorder?.();
  };

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-bold text-gray-800">📋 مرتب‌سازی لیست</h2>
      <p className="mb-4 text-sm text-gray-500">آیتم‌ها را برای تغییر ترتیب بکشید.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableItem key={item.id} id={item.id} title={item.title} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Card>
  );
}
