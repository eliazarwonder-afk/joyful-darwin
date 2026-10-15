import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocket } from 'ws';
import { CanvasNode } from '@collabflow/shared';
import { IStorageService } from '../storage/IStorageService';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>> = new Map();
  awareness: awarenessProtocol.Awareness;
  private storage: IStorageService;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor(name: string, storage: IStorageService) {
    super({ gc: true });
    this.name = name;
    this.storage = storage;
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    // Broadcast awareness updates to all connected clients
    const awarenessChangeHandler = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      _origin: any
    ) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, conn) => {
        this.send(conn, buff);
      });
    };
    this.awareness.on('update', awarenessChangeHandler);

    // Listen for doc updates: broadcast and schedule debounced persistence
    this.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);

      this.conns.forEach((_, conn) => {
        if (conn !== origin) {
          this.send(conn, buff);
        }
      });

      this.scheduleSave();
    });
  }

  async loadInitialState(): Promise<void> {
    const snapshot = await this.storage.getSnapshot(this.name);
    if (snapshot) {
      Y.applyUpdate(this, snapshot);
    }
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(async () => {
      this.saveDebounceTimer = null;
      try {
        const state = Y.encodeStateAsUpdate(this);
        await this.storage.saveSnapshot(this.name, state);
        
        // Update node count in board record
        const nodesMap = this.getMap<CanvasNode>('nodes');
        await this.storage.updateBoard(this.name, {
          nodeCount: nodesMap.size,
        });
      } catch (err) {
        console.error(`Failed to persist snapshot for room ${this.name}:`, err);
      }
    }, 2000); // 2-second debounce
  }

  async forceSave(): Promise<void> {
    const state = Y.encodeStateAsUpdate(this);
    await this.storage.saveSnapshot(this.name, state);
  }

  getNodes(): CanvasNode[] {
    const nodesMap = this.getMap<CanvasNode>('nodes');
    const nodes: CanvasNode[] = [];
    nodesMap.forEach((node) => {
      nodes.push(node);
    });
    return nodes;
  }

  private send(conn: WebSocket, m: Uint8Array): void {
    if (conn.readyState === WebSocket.OPEN) {
      try {
        conn.send(m);
      } catch (e) {
        // Handle socket send error
      }
    }
  }

  destroy(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    super.destroy();
  }
}

export class RoomManager {
  private docs: Map<string, WSSharedDoc> = new Map();
  private storage: IStorageService;

  constructor(storage: IStorageService) {
    this.storage = storage;
  }

  async getDoc(name: string): Promise<WSSharedDoc> {
    let doc = this.docs.get(name);
    if (!doc) {
      doc = new WSSharedDoc(name, this.storage);
      await doc.loadInitialState();
      this.docs.set(name, doc);
    }
    return doc;
  }

  async handleConnection(conn: WebSocket, boardId: string): Promise<void> {
    const doc = await this.getDoc(boardId);
    doc.conns.set(conn, new Set());

    // Listen for incoming messages
    conn.on('message', (message: ArrayBuffer | Buffer) => {
      try {
        const uint8 = new Uint8Array(message as any);
        const decoder = decoding.createDecoder(uint8);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case MESSAGE_SYNC: {
            const syncEncoder = encoding.createEncoder();
            encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
            syncProtocol.readSyncMessage(decoder, syncEncoder, doc, conn);
            if (encoding.length(syncEncoder) > 1) {
              this.send(conn, encoding.toUint8Array(syncEncoder));
            }
            break;
          }
          case MESSAGE_AWARENESS: {
            awarenessProtocol.applyAwarenessUpdate(
              doc.awareness,
              decoding.readVarUint8Array(decoder),
              conn
            );
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    this.send(conn, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      this.send(conn, encoding.toUint8Array(awarenessEncoder));
    }

    conn.on('close', () => {
      this.closeConnection(doc, conn);
    });
  }

  private closeConnection(doc: WSSharedDoc, conn: WebSocket): void {
    if (doc.conns.has(conn)) {
      const controlledIds = doc.conns.get(conn);
      doc.conns.delete(conn);
      if (controlledIds) {
        awarenessProtocol.removeAwarenessStates(
          doc.awareness,
          Array.from(controlledIds),
          null
        );
      }
      if (doc.conns.size === 0) {
        // Persist immediately on last connection close
        doc.forceSave().catch((err) => console.error(err));
      }
    }
  }

  private send(conn: WebSocket, m: Uint8Array): void {
    if (conn.readyState === WebSocket.OPEN) {
      try {
        conn.send(m);
      } catch (e) {
        // Send error
      }
    }
  }

  getActiveRoomCount(): number {
    return this.docs.size;
  }

  getActiveConnectionCount(): number {
    let total = 0;
    for (const doc of this.docs.values()) {
      total += doc.conns.size;
    }
    return total;
  }
}
