import { createAction } from '@ngrx/store';

export const incrementActiveTasks = createAction(
  '[Task] Increment Active Tasks'
);

export const decrementActiveTasks = createAction(
  '[Task] Decrement Active Tasks'
);

export const setActiveTasksCount = createAction(
  '[Task] Set Active Tasks Count',
  (count: number) => ({ count })
);