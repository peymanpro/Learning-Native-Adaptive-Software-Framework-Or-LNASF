export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  createdAt: Date;
}

export type Priority = 'low' | 'medium' | 'high';