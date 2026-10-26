import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-pagination',
  standalone: true,
  templateUrl: './user-pagination.component.html',
  styleUrl: './user-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPaginationComponent {
  readonly currentPage = input(1);
  readonly pageSize = input(10);
  readonly totalItems = input(0);

  readonly pageChange = output<number>();

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems() / this.pageSize()));
  }

  protected get pages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, 6, total];
    }

    if (current >= total - 3) {
      return [1, total - 5, total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, current - 1, current, current + 1, total];
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage()) {
      return;
    }

    this.pageChange.emit(page);
  }

  protected previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  protected nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  protected isCurrentPage(page: number): boolean {
    return page === this.currentPage();
  }
}
