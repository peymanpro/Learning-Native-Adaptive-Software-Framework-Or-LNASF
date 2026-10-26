import { createReducer, on } from '@ngrx/store';
import { incrementActiveTasks, decrementActiveTasks, setActiveTasksCount } from './task.actions';

export interface TaskState {
  activeCount: number;
}

export const initialState: TaskState = {
  activeCount: 0
};

export const taskReducer = createReducer(
  initialState,
  on(incrementActiveTasks, (state) => ({
    ...state,
    activeCount: state.activeCount + 1
  })),
  on(decrementActiveTasks, (state) => ({
    ...state,
    activeCount: Math.max(0, state.activeCount - 1)
  })),
  on(setActiveTasksCount, (state, { count }) => ({
    ...state,
    activeCount: count
  }))
);