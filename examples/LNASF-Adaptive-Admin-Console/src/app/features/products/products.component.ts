import { Component, inject, OnInit } from '@angular/core';

import { ApiService } from '../../core/http/services/api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { LoadingComponent } from '../../shared/ui/loading/loading.component';
import { Product, ProductsResponse } from './models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [EmptyStateComponent, LoadingComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected products: Product[] = [];
  protected isLoading = true;
  protected errorMessage = '';

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.get<ProductsResponse>('/products').subscribe({
      next: (response) => {
        this.products = response.products;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load products.';
        this.isLoading = false;
      },
    });
  }
}
