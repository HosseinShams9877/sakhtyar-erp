// ─── سیستم مانیتورینگ و متریک‌ها ───

interface ApiMetric { endpoint: string; method: string; statusCode: number; duration: number; userId?: string; timestamp: number; }
interface DbMetric { operation: string; table: string; duration: number; timestamp: number; }
interface ErrorMetric { error: string; stack?: string; context?: Record<string, any>; timestamp: number; }

const apiMetrics: ApiMetric[] = [];
const dbMetrics: DbMetric[] = [];
const errorMetrics: ErrorMetric[] = [];
let activeConnections = 0;
const MAX_HISTORY = 10000;
const HOUR = 60 * 60 * 1000;

function cleanOld() {
  const cutoff = Date.now() - HOUR;
  while (apiMetrics.length > MAX_HISTORY) apiMetrics.shift();
  while (dbMetrics.length > MAX_HISTORY) dbMetrics.shift();
  while (errorMetrics.length > MAX_HISTORY) errorMetrics.shift();
  // حذف رکوردهای قدیمی‌تر از یک ساعت
  while (apiMetrics.length > 0 && apiMetrics[0].timestamp < cutoff) apiMetrics.shift();
  while (dbMetrics.length > 0 && dbMetrics[0].timestamp < cutoff) dbMetrics.shift();
  while (errorMetrics.length > 0 && errorMetrics[0].timestamp < cutoff) errorMetrics.shift();
}

export function trackApiCall(endpoint: string, method: string, duration: number, statusCode: number, userId?: string) {
  apiMetrics.push({ endpoint, method, duration, statusCode, userId, timestamp: Date.now() });
  if (duration > 5000) console.warn(`[MONITOR] Slow API: ${method} ${endpoint} took ${duration}ms`);
  cleanOld();
}

export function trackDatabaseQuery(operation: string, table: string, duration: number) {
  dbMetrics.push({ operation, table, duration, timestamp: Date.now() });
  if (duration > 2000) console.warn(`[MONITOR] Slow DB: ${operation} ${table} took ${duration}ms`);
  cleanOld();
}

export function trackError(error: Error | string, context?: Record<string, any>) {
  errorMetrics.push({
    error: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    context,
    timestamp: Date.now(),
  });
  cleanOld();
}

export function incrementActiveConnections() { activeConnections++; }
export function decrementActiveConnections() { activeConnections = Math.max(0, activeConnections - 1); }

export function getSystemMetrics() {
  const mem = process.memoryUsage();
  const recentApi = apiMetrics.filter(m => m.timestamp > Date.now() - HOUR);
  const recentDb = dbMetrics.filter(m => m.timestamp > Date.now() - HOUR);
  const durations = recentApi.map(m => m.duration).sort((a, b) => a - b);
  const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] : 0;
  const dbDurations = recentDb.map(m => m.duration).sort((a, b) => a - b);
  const dbP95 = dbDurations.length ? dbDurations[Math.floor(dbDurations.length * 0.95)] : 0;
  const errors = recentApi.filter(m => m.statusCode >= 400).length;

  return {
    memory: { rss: Math.round(mem.rss / 1024 / 1024), heapUsed: Math.round(mem.heapUsed / 1024 / 1024), heapTotal: Math.round(mem.heapTotal / 1024 / 1024) },
    uptime: Math.round(process.uptime()),
    activeConnections,
    api: { total: apiMetrics.length, lastHour: recentApi.length, avgResponseTime: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0, p95ResponseTime: Math.round(p95), errorRate: recentApi.length ? Math.round((errors / recentApi.length) * 100) : 0 },
    database: { total: dbMetrics.length, lastHour: recentDb.length, avgQueryTime: dbDurations.length ? Math.round(dbDurations.reduce((a, b) => a + b, 0) / dbDurations.length) : 0, p95QueryTime: Math.round(dbP95), slowQueries: recentDb.filter(m => m.duration > 2000).length },
    errors: { total: errorMetrics.length, lastHour: errorMetrics.filter(m => m.timestamp > Date.now() - HOUR).length },
  };
}

export function alertIfThreshold(message: string, metric: string, value: number, threshold: number): boolean {
  if (value > threshold) {
    console.warn(`[ALERT] ${message}: ${metric}=${value} > threshold=${threshold}`);
    return true;
  }
  return false;
}

export function exportPrometheusMetrics(): string {
  const m = getSystemMetrics();
  return [
    '# HELP erp_uptime_seconds Process uptime',
    '# TYPE erp_uptime_seconds gauge',
    `erp_uptime_seconds ${m.uptime}`,
    '# HELP erp_memory_rss_megabytes RSS memory',
    '# TYPE erp_memory_rss_megabytes gauge',
    `erp_memory_rss_megabytes ${m.memory.rss}`,
    '# HELP erp_api_requests_total Total API requests',
    '# TYPE erp_api_requests_total counter',
    `erp_api_requests_total ${m.api.total}`,
    '# HELP erp_api_avg_response_ms Average API response time',
    '# TYPE erp_api_avg_response_ms gauge',
    `erp_api_avg_response_ms ${m.api.avgResponseTime}`,
    '# HELP erp_active_connections Active connections',
    '# TYPE erp_active_connections gauge',
    `erp_active_connections ${m.activeConnections}`,
  ].join('\n');
}
