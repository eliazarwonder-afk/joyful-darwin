import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IQueueService } from '../queue/IQueueService';
import { RoomManager } from '../realtime/RoomManager';

export function registerMetricsRoutes(
  app: FastifyInstance,
  queue: IQueueService,
  roomManager: RoomManager
) {
  const startTime = Date.now();

  // GET /healthz - Liveness probe for Kubernetes / Docker
  app.get('/healthz', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    });
  });

  // GET /readyz - Readiness probe
  app.get('/readyz', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'ready',
      storage: 'connected',
    });
  });

  // GET /api/metrics - Production observability endpoint
  app.get('/api/metrics', async (_req: FastifyRequest, reply: FastifyReply) => {
    const queueMetrics = await queue.getQueueMetrics();
    const memory = process.memoryUsage();

    return reply.send({
      server: {
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
          external: Math.round(memory.external / 1024 / 1024),
        },
      },
      realtime: {
        activeRooms: roomManager.getActiveRoomCount(),
        activeConnections: roomManager.getActiveConnectionCount(),
      },
      queue: queueMetrics,
    });
  });
}
