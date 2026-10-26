import { Component, inject, OnInit } from '@angular/core';

import { ApiService } from '../../core/http/services/api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { LoadingComponent } from '../../shared/ui/loading/loading.component';
import { DashboardProduct, DashboardProductsResponse } from './models/dashboard-product.model';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, EmptyStateComponent, LoadingComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected products: DashboardProduct[] = [];
  protected isLoading = true;
  protected errorMessage = '';

  protected get productCount(): number {
    return this.products.length;
  }

  protected get averageRating(): string {
    if (!this.products.length) {
      return '0.0';
    }

    const total = this.products.reduce((sum, product) => sum + product.rating, 0);

    return (total / this.products.length).toFixed(1);
  }

  protected get totalStock(): number {
    return this.products.reduce((sum, product) => sum + product.stock, 0);
  }

  protected get inventoryValue(): number {
    return this.products.reduce((sum, product) => sum + product.price * product.stock, 0);
  }

  protected get lowStockProducts(): DashboardProduct[] {
    return this.products
      .filter((product) => product.stock < 20)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);
  }

  protected get topRatedProducts(): DashboardProduct[] {
    return [...this.products].sort((a, b) => b.rating - a.rating).slice(0, 5);
  }

  protected get recentProducts(): DashboardProduct[] {
    return [...this.products].sort((a, b) => b.id - a.id).slice(0, 5);
  }

  protected get categoryCount(): number {
    return new Set(this.products.map((product) => product.category)).size;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected getStockStatus(stock: number): 'healthy' | 'warning' | 'critical' {
    if (stock < 10) {
      return 'critical';
    }

    if (stock < 20) {
      return 'warning';
    }

    return 'healthy';
  }

  protected getStockPercentage(stock: number): number {
    return Math.min((stock / 100) * 100, 100);
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.get<DashboardProductsResponse>('/products').subscribe({
      next: (response) => {
        this.products = response.products;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load dashboard data.';
        this.isLoading = false;
      },
    });
  }
}
