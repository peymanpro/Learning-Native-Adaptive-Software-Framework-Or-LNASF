import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskState } from './task.reducer';

export const selectTaskState = createFeatureSelector<TaskState>('tasks');

export const selectActiveTasksCount = createSelector(
  selectTaskState,
  (state) => state.activeCount
);