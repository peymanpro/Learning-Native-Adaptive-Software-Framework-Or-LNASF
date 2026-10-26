import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { AdaptiveWorkflowService } from './adaptive-workflow.service';
import type { WorkflowMode } from './workflow-decision-policy';
import type { WorkflowAction } from './workflow-transition-model';

@Component({
  selector: 'app-adaptive-workflow-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adaptive-workflow-panel.component.html',
  styleUrls: ['./adaptive-workflow-panel.component.css'],
})
export class AdaptiveWorkflowPanelComponent {
  @Output() actionRequested = new EventEmitter<WorkflowAction>();

  get state() {
    return this.workflow.state;
  }

  constructor(private readonly workflow: AdaptiveWorkflowService) {}

  setMode(event: Event): void {
    const mode = (event.target as HTMLSelectElement).value as WorkflowMode;
    if (mode === 'passive' || mode === 'advisory' || mode === 'adaptive') {
      this.workflow.setMode(mode);
    }
  }

  resetLearning(): void {
    this.workflow.resetLearning();
  }

  describeAction(action: WorkflowAction): string {
    const descriptions: Record<WorkflowAction, string> = {
      'task:add': 'Add a task',
      'task:complete': 'Complete a task',
      'task:reopen': 'Reopen a completed task',
      'task:edit': 'Edit a task',
      'task:delete': 'Delete a task',
      'filter:all': 'Show all tasks',
      'filter:active': 'Show active tasks',
      'filter:completed': 'Show completed tasks',
    };
    return descriptions[action];
  }

  canApplySuggestion(action: WorkflowAction): boolean {
    return action === 'task:add' ||
      action === 'filter:all' ||
      action === 'filter:active' ||
      action === 'filter:completed';
  }

  requestSuggestion(action: WorkflowAction): void {
    if (this.canApplySuggestion(action)) this.actionRequested.emit(action);
  }
}
