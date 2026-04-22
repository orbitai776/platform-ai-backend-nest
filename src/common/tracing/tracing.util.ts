import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer('platform-ai-gateway');

  // context.active() lấy đúng context đang chạy
  // Span này là child của span controller phía trên
  const span = tracer.startSpan(name, undefined, context.active());

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message,
      });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}
