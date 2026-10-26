import { Component, inject, OnInit } from '@angular/core';

import { ApiService } from '../../core/http/services/api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { LoadingComponent } from '../../shared/ui/loading/loading.component';
import { User, UsersResponse } from './models/user.model';
import {
  UserFilterChange,
  UserFiltersComponent,
} from './components/user-filters/user-filters.component';
import { UserPaginationComponent } from './components/user-pagination/user-pagination.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [EmptyStateComponent, LoadingComponent, UserFiltersComponent, UserPaginationComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected users: User[] = [];
  protected filteredUsers: User[] = [];

  protected isLoading = true;
  protected errorMessage = '';

  protected currentPage = 1;
  protected pageSize = 10;
  protected totalUsers = 0;

  ngOnInit(): void {
    this.loadUsers();
  }

  protected onFilterChange(filters: UserFilterChange): void {
    const search = filters.search.trim().toLowerCase();

    this.filteredUsers = this.users.filter((user) => {
      const matchesSearch =
        !search ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search);

      const matchesGender = !filters.gender || user.gender === filters.gender;

      const matchesRole = !filters.role || user.role === filters.role;

      return matchesSearch && matchesGender && matchesRole;
    });

    this.totalUsers = this.filteredUsers.length;
    this.currentPage = 1;
  }

  protected onPageChange(page: number): void {
    this.currentPage = page;
  }

  protected get paginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;

    return this.filteredUsers.slice(startIndex, startIndex + this.pageSize);
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.get<UsersResponse>('/users').subscribe({
      next: (response) => {
        this.users = response.users;
        this.filteredUsers = response.users;
        this.totalUsers = response.users.length;
        this.currentPage = 1;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load users.';
        this.isLoading = false;
      },
    });
  }
}
