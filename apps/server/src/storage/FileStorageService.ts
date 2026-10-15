import fs from 'fs/promises';
import path from 'path';
import { Board } from '@collabflow/shared';
import { IStorageService, UserRecord } from './IStorageService';
import { config } from '../config';

interface DatabaseSchema {
  users: Record<string, UserRecord>;
  boards: Record<string, Board>;
}

export class FileStorageService implements IStorageService {
  private dbPath: string;
  private snapshotsDir: string;
  private db: DatabaseSchema = {
    users: {},
    boards: {},
  };
  private isLoaded = false;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.dbPath = path.join(config.dataDir, 'database.json');
    this.snapshotsDir = path.join(config.dataDir, 'snapshots');
  }

  async init(): Promise<void> {
    if (this.isLoaded) return;
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.mkdir(this.snapshotsDir, { recursive: true });
    await fs.mkdir(config.exportsDir, { recursive: true });

    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      this.db = JSON.parse(data);
    } catch {
      // Create fresh default db
      this.db = { users: {}, boards: {} };
      await this.persist();
    }
    this.isLoaded = true;
  }

  private async persist(): Promise<void> {
    const tempPath = `${this.dbPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(this.db, null, 2), 'utf-8');
    await fs.rename(tempPath, this.dbPath);
  }

  private schedulePersist(): void {
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(async () => {
      this.saveDebounceTimer = null;
      await this.persist();
    }, 200);
  }

  async createUser(user: Omit<UserRecord, 'createdAt'>): Promise<UserRecord> {
    const record: UserRecord = {
      ...user,
      createdAt: Date.now(),
    };
    this.db.users[record.id] = record;
    this.schedulePersist();
    return record;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of Object.values(this.db.users)) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.db.users[id] || null;
  }

  async createBoard(board: Omit<Board, 'createdAt' | 'updatedAt'>): Promise<Board> {
    const now = Date.now();
    const record: Board = {
      ...board,
      createdAt: now,
      updatedAt: now,
      nodeCount: 0,
    };
    this.db.boards[record.id] = record;
    this.schedulePersist();
    return record;
  }

  async getBoard(id: string): Promise<Board | null> {
    return this.db.boards[id] || null;
  }

  async listBoards(ownerId?: string): Promise<Board[]> {
    const all = Object.values(this.db.boards);
    if (!ownerId) {
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return all
      .filter((b) => b.ownerId === ownerId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async updateBoard(
    id: string,
    updates: Partial<Pick<Board, 'title' | 'description' | 'nodeCount'>>
  ): Promise<Board | null> {
    const board = this.db.boards[id];
    if (!board) return null;
    const updated: Board = {
      ...board,
      ...updates,
      updatedAt: Date.now(),
    };
    this.db.boards[id] = updated;
    this.schedulePersist();
    return updated;
  }

  async deleteBoard(id: string): Promise<boolean> {
    if (!this.db.boards[id]) return false;
    delete this.db.boards[id];
    this.schedulePersist();
    try {
      await fs.unlink(path.join(this.snapshotsDir, `${id}.bin`));
    } catch {
      // Snapshot might not exist
    }
    return true;
  }

  async saveSnapshot(boardId: string, snapshot: Uint8Array): Promise<void> {
    const snapshotPath = path.join(this.snapshotsDir, `${boardId}.bin`);
    const tempPath = `${snapshotPath}.tmp`;
    await fs.writeFile(tempPath, Buffer.from(snapshot));
    await fs.rename(tempPath, snapshotPath);
  }

  async getSnapshot(boardId: string): Promise<Uint8Array | null> {
    const snapshotPath = path.join(this.snapshotsDir, `${boardId}.bin`);
    try {
      const buffer = await fs.readFile(snapshotPath);
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }
}
