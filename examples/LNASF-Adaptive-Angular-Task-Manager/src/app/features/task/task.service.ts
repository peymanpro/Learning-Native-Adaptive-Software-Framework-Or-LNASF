import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '@ngrx/store';
import { incrementActiveTasks, decrementActiveTasks, setActiveTasksCount } from './store/task.actions';
import { Task } from './task.model';
import { AdaptiveWorkflowService } from '../lnasf/adaptive-workflow.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  constructor(
    private store: Store,
    private adaptiveWorkflow: AdaptiveWorkflowService,
  ) {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem('tasks');
    if (saved) {
      const tasks = JSON.parse(saved);
      tasks.forEach((t: any) => t.createdAt = new Date(t.createdAt));
      this.tasksSubject.next(tasks);
      const activeCount = tasks.filter((t: Task) => !t.completed).length;
      this.store.dispatch(setActiveTasksCount(activeCount));
    }
  }

  addTask(title: string, description: string = '', priority: Task['priority'] = 'medium', dueDate?: string): void {
    const newTask: Task = {
      id: uuidv4(),
      title,
      description,
      completed: false,
      priority,
      dueDate,
      createdAt: new Date()
    };
    const current = this.tasksSubject.getValue();
    this.tasksSubject.next([newTask, ...current]);
    this.saveToLocalStorage();
    this.store.dispatch(incrementActiveTasks());
    this.adaptiveWorkflow.recordAction('task:add');
  }

  toggleComplete(id: string): void {
    const tasks = this.tasksSubject.getValue();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const wasCompleted = task.completed;
    task.completed = !task.completed;
    this.tasksSubject.next([...tasks]);
    this.saveToLocalStorage();
    this.adaptiveWorkflow.recordAction(wasCompleted ? 'task:reopen' : 'task:complete');

    if (wasCompleted) {
      this.store.dispatch(incrementActiveTasks());
    } else {
      this.store.dispatch(decrementActiveTasks());
    }
  }

  deleteTask(id: string): void {
    const tasks = this.tasksSubject.getValue();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const filtered = tasks.filter(t => t.id !== id);
    this.tasksSubject.next(filtered);
    this.saveToLocalStorage();
    this.adaptiveWorkflow.recordAction('task:delete');

    if (!task.completed) {
      this.store.dispatch(decrementActiveTasks());
    }
  }

  updateTask(id: string, updates: Partial<Task>): void {
    const tasks = this.tasksSubject.getValue();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const oldCompleted = task.completed;
    Object.assign(task, updates);
    this.tasksSubject.next([...tasks]);
    this.saveToLocalStorage();
    this.adaptiveWorkflow.recordAction('task:edit');

    if (updates.completed !== undefined && updates.completed !== oldCompleted) {
      if (updates.completed) {
        this.store.dispatch(decrementActiveTasks());
      } else {
        this.store.dispatch(incrementActiveTasks());
      }
    }
  }

  private saveToLocalStorage(): void {
    const tasks = this.tasksSubject.getValue().map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString()
    }));
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
}
