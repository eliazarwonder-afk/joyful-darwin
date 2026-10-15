import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { ExportRequestSchema, ExportJob } from '@collabflow/shared';
import { IStorageService } from '../storage/IStorageService';
import { IQueueService } from '../queue/IQueueService';
import { RoomManager } from '../realtime/RoomManager';
import { config } from '../config';

export function registerExportRoutes(
  app: FastifyInstance,
  storage: IStorageService,
  queue: IQueueService,
  roomManager: RoomManager
) {
  // POST /api/boards/:id/export
  app.post(
    '/api/boards/:id/export',
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: any }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      const parseResult = ExportRequestSchema.safeParse({
        ...((req.body as any) || {}),
        boardId: id,
      });

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid export request payload',
          details: parseResult.error.format(),
        });
      }

      const board = await storage.getBoard(id);
      if (!board) {
        return reply.status(404).send({ error: 'Board not found' });
      }

      // Fetch live nodes from active Yjs doc or snapshot
      const doc = await roomManager.getDoc(id);
      const nodes = doc.getNodes();

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const job: ExportJob = {
        id: jobId,
        boardId: id,
        format: parseResult.data.format,
        status: 'pending',
        requestedBy: 'user-demo-123',
        createdAt: Date.now(),
      };

      await queue.enqueueExportJob(job, nodes, board.title);

      return reply.status(202).send({
        message: 'Export job queued successfully',
        job,
      });
    }
  );

  // GET /api/exports/:jobId
  app.get(
    '/api/exports/:jobId',
    async (req: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const { jobId } = req.params;
      const job = await queue.getJob(jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Export job not found' });
      }
      return reply.send({ job });
    }
  );

  // GET /api/exports/download/:filename
  app.get(
    '/api/exports/download/:filename',
    async (req: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
      const { filename } = req.params;
      // Sanitize filename to prevent directory traversal
      const safeFilename = path.basename(filename);
      const filepath = path.join(config.exportsDir, safeFilename);

      try {
        const file = await fs.readFile(filepath);
        let contentType = 'application/octet-stream';
        if (safeFilename.endsWith('.svg')) contentType = 'image/svg+xml';
        else if (safeFilename.endsWith('.pdf')) contentType = 'application/pdf';
        else if (safeFilename.endsWith('.json')) contentType = 'application/json';

        reply.header('Content-Type', contentType);
        reply.header('Content-Disposition', `attachment; filename="${safeFilename}"`);
        return reply.send(file);
      } catch {
        return reply.status(404).send({ error: 'File not found or export expired' });
      }
    }
  );
}
