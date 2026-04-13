import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export function createOtelSDK(serviceName: string) {
  const rawAuth = process.env.OLTP_AUTH || '';
  let authHeader = '';
  if (!rawAuth) {
    throw new Error('OTEL: missing OLTP_AUTH');
  } else if (rawAuth.toLowerCase().startsWith('basic ')) {
    authHeader = rawAuth;
  } else if (rawAuth.includes(':')) {
    authHeader = 'Basic ' + Buffer.from(rawAuth).toString('base64');
  } else {
    // Hỗ trợ truyền trực tiếp chuỗi base64
    authHeader = 'Basic ' + rawAuth;
  }

  const exporter = new OTLPTraceExporter({
    url: `https://${process.env.OLTP_URL}/otlp/v1/traces`,
    headers: {
      Authorization: authHeader,
    },
  });

  return new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': serviceName,
      'service.version': '1.0.0',
      'deployment.environment': 'dev',
      'service.instance.id': process.pid.toString(),
    }),

    traceExporter: exporter,

    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
      }),
    ],
  });
}