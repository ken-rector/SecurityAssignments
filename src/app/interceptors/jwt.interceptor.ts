import { HttpInterceptorFn } from '@angular/common/http';
import { API_CONFIG } from '../api.config';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const token = sessionStorage.getItem('token');
  const isApiRequest = request.url.startsWith(API_CONFIG.apiUrl);

  if (token && isApiRequest) {
    request = request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(request);
};
