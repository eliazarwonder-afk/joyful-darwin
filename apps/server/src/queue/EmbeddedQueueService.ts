import EventEmitter from 'events';
import { ExportJob, CanvasNode } from '@collabflow/shared';
import { IQueueService, ExportJobData } from './IQueueService';
import { ExportEngine } from '../export/exportEngine';

export class EmbeddedQueueService implements IQueueService {
  private jobs: Map<string, ExportJob> = new Map();
  private emitter: EventEmitter = new EventEmitter();
  private activeCount = 0;
  private completedCount = 0;
  private failedCount = 0;

  async init(): Promise<void> {
    // In-memory queue ready
  }

  async enqueueExportJob(job: ExportJob, nodes: CanvasNode[], boardTitle: string): Promise<void> {
    this.jobs.set(job.id, { ...job });
    this.emitter.emit('status', job);

    // Asynchronously process job in next tick to simulate background worker execution
    setImmediate(async () => {
      await this.processJob({ job, nodes, boardTitle });
    });
  }

  private async processJob(data: ExportJobData): Promise<void> {
    const { job, nodes, boardTitle } = data;
    this.activeCount++;

    // Mark as processing
    job.status = 'processing';
    this.jobs.set(job.id, { ...job });
    this.emitter.emit('status', job);

    try {
      // Simulate real-world rendering time (e.g. 800ms)
      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = await ExportEngine.processExport(
        job.boardId,
        boardTitle,
        job.format,
        nodes
      );

      job.status = 'completed';
      job.downloadUrl = `/api/exports/download/${result.filename}`;
      job.completedAt = Date.now();
      this.completedCount++;
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || 'Unknown export processing error';
      job.completedAt = Date.now();
      this.failedCount++;
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.jobs.set(job.id, { ...job });
      this.emitter.emit('status', job);
    }
  }

  async getJob(jobId: string): Promise<ExportJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getQueueMetrics(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    let waiting = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'pending') waiting++;
    }
    return {
      waiting,
      active: this.activeCount,
      completed: this.completedCount,
      failed: this.failedCount,
    };
  }

  onJobStatusChange(listener: (job: ExportJob) => void): void {
    this.emitter.on('status', listener);
  }
}
