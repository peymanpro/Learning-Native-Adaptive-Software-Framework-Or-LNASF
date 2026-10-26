import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectActiveTasksCount } from '../../../features/task/store/task.selectors';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  activeTasksCount$: Observable<number>;

  constructor(private store: Store) {
    this.activeTasksCount$ = this.store.select(selectActiveTasksCount);
  }
}