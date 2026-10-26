import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../atoms/button/button.component';
import { Task } from '../../../features/task/task.model';



@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './task-item.component.html',
  styleUrls: ['./task-item.component.css']
})
export class TaskItemComponent {
  @Input() task!: Task;
  @Output() toggle = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() edit = new EventEmitter<Task>();

  onToggle() {
    this.toggle.emit(this.task.id);
  }

  onDelete() {
    this.delete.emit(this.task.id);
  }

  onEdit() {
    this.edit.emit(this.task);
  }

  getPriorityClass(): string {
    return this.task.priority;
  }
}