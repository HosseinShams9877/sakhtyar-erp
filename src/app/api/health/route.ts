// ─── Health Check Endpoint ───
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    const detailed = req.nextUrl.searchParams.get('detailed') === 'true';

    const base = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      version: '1.0.0',
      database: 'connected',
    };

    if (!detailed) return NextResponse.json(base);

    const mem = process.memoryUsage();
    return NextResponse.json({
      ...base,
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      heapUsagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      database: 'disconnected',
      error: process.env.NODE_ENV === 'production' ? 'Connection failed' : error.message,
    }, { status: 503 });
  }
}
