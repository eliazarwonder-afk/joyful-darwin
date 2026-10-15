import { ExportJob, CanvasNode } from '@collabflow/shared';

export interface ExportJobData {
  job: ExportJob;
  nodes: CanvasNode[];
  boardTitle: string;
}

export interface IQueueService {
  init(): Promise<void>;
  enqueueExportJob(job: ExportJob, nodes: CanvasNode[], boardTitle: string): Promise<void>;
  getJob(jobId: string): Promise<ExportJob | null>;
  getQueueMetrics(): Promise<{ waiting: number; active: number; completed: number; failed: number }>;
  onJobStatusChange(listener: (job: ExportJob) => void): void;
}
