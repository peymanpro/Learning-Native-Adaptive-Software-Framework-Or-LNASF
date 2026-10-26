import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { TaskManagerComponent } from './pages/task-manager/task-manager.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'tasks', component: TaskManagerComponent },
  { path: '**', redirectTo: '' }
];