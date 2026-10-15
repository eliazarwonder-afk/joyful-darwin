import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { config } from './config';
import { FileStorageService } from './storage/FileStorageService';
import { EmbeddedQueueService } from './queue/EmbeddedQueueService';
import { RoomManager } from './realtime/RoomManager';
import { registerAuthRoutes } from './routes/authRoutes';
import { registerBoardRoutes } from './routes/boardRoutes';
import { registerExportRoutes } from './routes/exportRoutes';
import { registerMetricsRoutes } from './routes/metricsRoutes';

async function bootstrap() {
  const app = fastify({
    logger: {
      level: config.env === 'development' ? 'info' : 'warn',
      transport:
        config.env === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // CORS configuration
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });

  // Initialize Core Services
  const storage = new FileStorageService();
  await storage.init();

  const queue = new EmbeddedQueueService();
  await queue.init();

  const roomManager = new RoomManager(storage);

  // Register REST API Routes
  registerAuthRoutes(app, storage);
  registerBoardRoutes(app, storage, roomManager);
  registerExportRoutes(app, storage, queue, roomManager);
  registerMetricsRoutes(app, queue, roomManager);

  // Start HTTP Server
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`⚡ CollabFlow Server running on http://${config.host}:${config.port}`);

  // Attach WebSocket Server to the underlying HTTP server
  const wss = new WebSocketServer({
    server: app.server,
  });

  wss.on('connection', async (ws: WebSocket, req) => {
    try {
      const parsed = parseUrl(req.url || '', true);
      const pathname = parsed.pathname || '';

      // Pattern: /ws/:boardId or /ws?boardId=xyz
      let boardId = '';
      if (pathname.startsWith('/ws/')) {
        boardId = pathname.replace('/ws/', '').split('/')[0];
      } else if (parsed.query.boardId) {
        boardId = parsed.query.boardId as string;
      }

      if (!boardId) {
        boardId = 'demo-roadmap-board';
      }

      app.log.info(`[WebSocket] Client connected to room: ${boardId}`);
      await roomManager.handleConnection(ws, boardId);
    } catch (err) {
      app.log.error(err, '[WebSocket] Connection setup error');
      ws.close(1011, 'Internal connection error');
    }
  });

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const sig of signals) {
    process.on(sig, async () => {
      app.log.info(`Received ${sig}, shutting down gracefully...`);
      wss.close();
      await app.close();
      process.exit(0);
    });
  }
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
