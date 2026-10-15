import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { FileStorageService } from '../storage/FileStorageService';
import { EmbeddedQueueService } from '../queue/EmbeddedQueueService';
import { RoomManager } from '../realtime/RoomManager';
import { registerAuthRoutes } from './authRoutes';
import { registerBoardRoutes } from './boardRoutes';
import { registerExportRoutes } from './exportRoutes';
import { registerMetricsRoutes } from './metricsRoutes';

describe('Server API Endpoints Integration Tests', () => {
  let app: FastifyInstance;
  let storage: FileStorageService;
  let queue: EmbeddedQueueService;
  let roomManager: RoomManager;

  beforeAll(async () => {
    app = fastify({ logger: false });
    await app.register(cors);

    storage = new FileStorageService();
    await storage.init();

    queue = new EmbeddedQueueService();
    await queue.init();

    roomManager = new RoomManager(storage);

    registerAuthRoutes(app, storage);
    registerBoardRoutes(app, storage, roomManager);
    registerExportRoutes(app, storage, queue, roomManager);
    registerMetricsRoutes(app, queue, roomManager);

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /healthz returns 200 with healthy status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
    expect(body).toHaveProperty('uptimeSeconds');
  });

  it('GET /api/metrics returns system metrics and queue health', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/metrics',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('server');
    expect(body).toHaveProperty('realtime');
    expect(body).toHaveProperty('queue');
  });

  it('GET /api/boards returns an array of boards', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/boards',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.boards)).toBe(true);
  });

  it('POST /api/boards creates a new board', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/boards',
      payload: {
        title: 'Integration Test Canvas',
        description: 'Automated test suite canvas',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.board.title).toBe('Integration Test Canvas');
    expect(body.board).toHaveProperty('id');
  });

  it('POST /api/auth/register registers a new user with JWT', async () => {
    const randomEmail = `test_${Date.now()}@collabflow.dev`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: randomEmail,
        password: 'password123',
        name: 'Integration Test Engineer',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe(randomEmail);
    expect(body).toHaveProperty('token');
  });
});
