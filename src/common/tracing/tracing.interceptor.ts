import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  trace,
  propagation,
  context,
  SpanStatusCode,
} from '@opentelemetry/api';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const tracer = trace.getTracer('platform-ai-gateway');
    const req = ctx.switchToHttp().getRequest();

    // Extract traceparent từ Go Gateway
    // Span này sẽ là child của root span bên Gateway
    const parentCtx = propagation.extract(context.active(), req.headers);

    const spanName = `${ctx.getClass().name}.${ctx.getHandler().name}`;
    const span = tracer.startSpan(spanName, undefined, parentCtx);

    span.setAttribute('http.method', req.method);
    span.setAttribute('http.url', req.url);
    span.setAttribute('controller', ctx.getClass().name);
    span.setAttribute('handler', ctx.getHandler().name);

    return next.handle().pipe(
      tap(() => {
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      }),
      catchError((err) => {
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        span.recordException(err);
        span.end();
        return throwError(() => err);
      }),
    );
  }
}
