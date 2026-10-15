export type NodeType = 'rectangle' | 'circle' | 'sticky' | 'text' | 'arrow';

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
  rotation?: number;
  zIndex: number;
  updatedBy: string;
  updatedAt: number;
}

export interface UserPresence {
  userId: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeIds: string[];
  lastActive: number;
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  nodeCount?: number;
}

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportJob {
  id: string;
  boardId: string;
  format: ExportFormat;
  status: ExportStatus;
  requestedBy: string;
  downloadUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

export interface ServerMetrics {
  activeConnections: number;
  activeRooms: number;
  queuedJobs: number;
  uptimeSeconds: number;
  memoryUsageMb: number;
}
