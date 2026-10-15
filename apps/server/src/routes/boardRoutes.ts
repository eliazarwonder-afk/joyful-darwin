import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateBoardSchema, UpdateBoardSchema } from '@collabflow/shared';
import { IStorageService } from '../storage/IStorageService';
import { RoomManager } from '../realtime/RoomManager';

export function registerBoardRoutes(
  app: FastifyInstance,
  storage: IStorageService,
  roomManager: RoomManager
) {
  // Pre-seed demo board if no boards exist
  storage.listBoards().then(async (boards) => {
    if (boards.length === 0) {
      const demoBoardId = 'demo-roadmap-board';
      await storage.createBoard({
        id: demoBoardId,
        title: 'System Architecture & Launch Sprint',
        description: 'Collaborative real-time planning canvas powered by CRDTs and WebSockets',
        ownerId: 'user-demo-123',
      });

      // Populate demo board with starter nodes
      const doc = await roomManager.getDoc(demoBoardId);
      const nodesMap = doc.getMap('nodes');

      nodesMap.set('node-1', {
        id: 'node-1',
        type: 'sticky',
        x: 120,
        y: 120,
        width: 200,
        height: 180,
        fill: '#FEF08A',
        stroke: '#EAB308',
        strokeWidth: 2,
        text: '🚀 Phase 1: CRDT State Sync\nYjs WebSockets for sub-50ms conflict resolution.',
        zIndex: 1,
        updatedBy: 'Alex Rivera',
        updatedAt: Date.now(),
      });

      nodesMap.set('node-2', {
        id: 'node-2',
        type: 'sticky',
        x: 360,
        y: 120,
        width: 200,
        height: 180,
        fill: '#BFDBFE',
        stroke: '#3B82F6',
        strokeWidth: 2,
        text: '⚙️ Phase 2: Background Jobs\nBullMQ + Headless export for PDF/PNG generation.',
        zIndex: 2,
        updatedBy: 'Alex Rivera',
        updatedAt: Date.now(),
      });

      nodesMap.set('node-3', {
        id: 'node-3',
        type: 'sticky',
        x: 600,
        y: 120,
        width: 200,
        height: 180,
        fill: '#BAF7D0',
        stroke: '#22C55E',
        strokeWidth: 2,
        text: '📊 Phase 3: Observability\nStructured pino JSON logging & health check probes.',
        zIndex: 3,
        updatedBy: 'Alex Rivera',
        updatedAt: Date.now(),
      });

      await doc.forceSave();
    }
  });

  // GET /api/boards
  app.get('/api/boards', async (_req: FastifyRequest, reply: FastifyReply) => {
    const boards = await storage.listBoards();
    return reply.send({ boards });
  });

  // POST /api/boards
  app.post('/api/boards', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CreateBoardSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const { title, description } = parseResult.data;
    const boardId = `brd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const board = await storage.createBoard({
      id: boardId,
      title,
      description: description || '',
      ownerId: 'user-demo-123',
    });

    // Initialize document with a welcome sticky note
    const doc = await roomManager.getDoc(boardId);
    const nodesMap = doc.getMap('nodes');
    const firstNodeId = `node_${Date.now()}`;
    nodesMap.set(firstNodeId, {
      id: firstNodeId,
      type: 'sticky',
      x: 150,
      y: 150,
      width: 220,
      height: 180,
      fill: '#FEF08A',
      stroke: '#EAB308',
      strokeWidth: 2,
      text: '✨ Welcome to your new board!\nDrag to move, click to edit, or invite teammates to collaborate in real-time.',
      zIndex: 1,
      updatedBy: 'You',
      updatedAt: Date.now(),
    });
    await doc.forceSave();

    return reply.status(201).send({ board });
  });

  // GET /api/boards/:id
  app.get('/api/boards/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const board = await storage.getBoard(id);
    if (!board) {
      return reply.status(404).send({ error: 'Board not found' });
    }
    return reply.send({ board });
  });

  // PATCH /api/boards/:id
  app.patch(
    '/api/boards/:id',
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: any }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      const parseResult = UpdateBoardSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: 'Invalid update payload' });
      }

      const updated = await storage.updateBoard(id, parseResult.data);
      if (!updated) {
        return reply.status(404).send({ error: 'Board not found' });
      }

      return reply.send({ board: updated });
    }
  );

  // DELETE /api/boards/:id
  app.delete('/api/boards/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const deleted = await storage.deleteBoard(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Board not found' });
    }
    return reply.send({ success: true, message: 'Board deleted successfully' });
  });
}
