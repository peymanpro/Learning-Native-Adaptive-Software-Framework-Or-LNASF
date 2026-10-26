import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const startedAt = performance.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const duration = Math.round(performance.now() - startedAt);

          console.debug(
            `[HTTP] ${req.method} ${req.urlWithParams} → ${event.status} (${duration}ms)`,
          );
        }
      },
      error: (error: unknown) => {
        const duration = Math.round(performance.now() - startedAt);

        console.error(`[HTTP] ${req.method} ${req.urlWithParams} → ERROR (${duration}ms)`, error);
      },
    }),
  );
};
