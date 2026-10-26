
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface SortableItem {
  id: string;
  title: string;
  order: number;
}

export interface FileWithPreview extends File {
  preview?: string;
}