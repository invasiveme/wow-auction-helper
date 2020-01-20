import generateUUID from './utils/uuid.util';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Router} from '@angular/router';
import {Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {SharedService} from './services/shared.service';
import {AuthService} from './modules/core/auth.service';

@Injectable()
export class AuthenticationInterceptor implements HttpInterceptor {

  constructor(private route: Router, private service: AuthService) {
  }

  intercept(r: HttpRequest<any>, handler: HttpHandler): Observable<HttpEvent<any>> {
    const token = AuthService.authTokenEvent.value;
    if (token) {
      return handler.handle(
        r.clone({
          headers: r.headers
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'application/json')
        }));
    }

    return handler.handle(r);
  }
}
