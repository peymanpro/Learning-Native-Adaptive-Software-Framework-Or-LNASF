import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from '../../shared/organisms/task-list/task-list.component';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  imports: [CommonModule, TaskListComponent],
  templateUrl: './task-manager.component.html',
  styleUrls: ['./task-manager.component.css']
})
export class TaskManagerComponent {}