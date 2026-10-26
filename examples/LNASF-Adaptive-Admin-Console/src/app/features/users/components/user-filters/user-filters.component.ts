import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface UserFilterChange {
  search: string;
  gender: string;
  role: string;
}

@Component({
  selector: 'app-user-filters',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-filters.component.html',
  styleUrl: './user-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFiltersComponent {
  readonly filtersChange = output<UserFilterChange>();

  protected search = '';
  protected gender = '';
  protected role = '';

  protected onSearchChange(value: string): void {
    this.search = value;
    this.emitFilters();
  }

  protected onGenderChange(value: string): void {
    this.gender = value;
    this.emitFilters();
  }

  protected onRoleChange(value: string): void {
    this.role = value;
    this.emitFilters();
  }

  protected clearFilters(): void {
    this.search = '';
    this.gender = '';
    this.role = '';

    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChange.emit({
      search: this.search.trim(),
      gender: this.gender,
      role: this.role,
    });
  }
}
