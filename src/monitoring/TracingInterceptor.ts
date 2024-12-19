import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  type ContextType,
} from '@nestjs/common';
import { context as otelContext, trace } from '@opentelemetry/api';
import { finalize, Observable } from 'rxjs';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly tracer = trace.getTracer('TracingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // check graphql or http => pass ( because auto instrumentation is already done)
    const contextType = context.getType<ContextType>();
    if (contextType === 'http') {
      return next.handle();
    }

    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    const span = this.tracer.startSpan(`${className}.${handlerName}`);
    const ctx = trace.setSpan(otelContext.active(), span);

    return otelContext.with(ctx, () =>
      next.handle().pipe(
        finalize(() => {
          span.end();
        }),
      ),
    );
  }
}
