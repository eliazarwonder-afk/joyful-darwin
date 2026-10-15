import { Board, AuthUser } from '@collabflow/shared';

export interface UserRecord extends AuthUser {
  passwordHash: string;
  createdAt: number;
}

export interface IStorageService {
  init(): Promise<void>;
  
  // User Management
  createUser(user: Omit<UserRecord, 'createdAt'>): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;

  // Board Management
  createBoard(board: Omit<Board, 'createdAt' | 'updatedAt'>): Promise<Board>;
  getBoard(id: string): Promise<Board | null>;
  listBoards(ownerId?: string): Promise<Board[]>;
  updateBoard(id: string, updates: Partial<Pick<Board, 'title' | 'description' | 'nodeCount'>>): Promise<Board | null>;
  deleteBoard(id: string): Promise<boolean>;

  // Snapshot Persistence (Yjs binary document snapshot)
  saveSnapshot(boardId: string, snapshot: Uint8Array): Promise<void>;
  getSnapshot(boardId: string): Promise<Uint8Array | null>;
}
