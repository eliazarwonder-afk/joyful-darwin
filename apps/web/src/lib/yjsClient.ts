import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CanvasNode, UserPresence, USER_COLORS } from '@collabflow/shared';

export interface YjsClientOptions {
  boardId: string;
  wsUrl?: string;
  userName?: string;
  userColor?: string;
  onNodesChange?: (nodes: CanvasNode[]) => void;
  onAwarenessChange?: (users: UserPresence[]) => void;
  onStatusChange?: (status: 'connected' | 'syncing' | 'offline') => void;
}

export class YjsCanvasClient {
  public doc: Y.Doc;
  public provider: WebsocketProvider;
  public nodesMap: Y.Map<CanvasNode>;
  public undoManager: Y.UndoManager;
  public currentUser: UserPresence;

  private onNodesChangeCallback?: (nodes: CanvasNode[]) => void;
  private onAwarenessChangeCallback?: (users: UserPresence[]) => void;
  private onStatusChangeCallback?: (status: 'connected' | 'syncing' | 'offline') => void;

  constructor(options: YjsClientOptions) {
    this.doc = new Y.Doc();
    this.nodesMap = this.doc.getMap<CanvasNode>('nodes');
    this.undoManager = new Y.UndoManager(this.nodesMap);

    this.onNodesChangeCallback = options.onNodesChange;
    this.onAwarenessChangeCallback = options.onAwarenessChange;
    this.onStatusChangeCallback = options.onStatusChange;

    const wsUrl = options.wsUrl || 'ws://localhost:4000/ws';
    this.provider = new WebsocketProvider(wsUrl, options.boardId, this.doc);

    const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    const randomId = `usr_${Math.random().toString(36).substring(2, 8)}`;
    this.currentUser = {
      userId: randomId,
      name: options.userName || `Designer ${randomId.substring(4)}`,
      color: options.userColor || randomColor,
      cursor: null,
      selectedNodeIds: [],
      lastActive: Date.now(),
    };

    // Set initial awareness state
    this.provider.awareness.setLocalStateField('user', this.currentUser);

    // Listen to doc updates
    this.nodesMap.observe(() => {
      this.notifyNodesChange();
    });

    // Listen to awareness changes (cursors, presence)
    this.provider.awareness.on('change', () => {
      this.notifyAwarenessChange();
    });

    // Listen to connection status
    this.provider.on('status', (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
      if (event.status === 'connected') {
        this.onStatusChangeCallback?.('connected');
      } else if (event.status === 'connecting') {
        this.onStatusChangeCallback?.('syncing');
      } else {
        this.onStatusChangeCallback?.('offline');
      }
    });

    this.provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        this.onStatusChangeCallback?.('connected');
        this.notifyNodesChange();
      }
    });
  }

  public getNodes(): CanvasNode[] {
    const nodes: CanvasNode[] = [];
    this.nodesMap.forEach((node) => {
      nodes.push(node);
    });
    return nodes.sort((a, b) => a.zIndex - b.zIndex);
  }

  public addNode(node: CanvasNode): void {
    this.doc.transact(() => {
      this.nodesMap.set(node.id, node);
    });
  }

  public updateNode(id: string, updates: Partial<CanvasNode>): void {
    const current = this.nodesMap.get(id);
    if (!current) return;

    this.doc.transact(() => {
      this.nodesMap.set(id, {
        ...current,
        ...updates,
        updatedAt: Date.now(),
        updatedBy: this.currentUser.name,
      });
    });
  }

  public deleteNode(id: string): void {
    this.doc.transact(() => {
      this.nodesMap.delete(id);
    });
  }

  public deleteNodes(ids: string[]): void {
    this.doc.transact(() => {
      for (const id of ids) {
        this.nodesMap.delete(id);
      }
    });
  }

  public clearAllNodes(): void {
    this.doc.transact(() => {
      this.nodesMap.clear();
    });
  }

  public updateCursor(x: number, y: number): void {
    this.currentUser.cursor = { x, y };
    this.currentUser.lastActive = Date.now();
    this.provider.awareness.setLocalStateField('user', this.currentUser);
  }

  public updateSelectedNodes(ids: string[]): void {
    this.currentUser.selectedNodeIds = ids;
    this.provider.awareness.setLocalStateField('user', this.currentUser);
  }

  public undo(): void {
    this.undoManager.undo();
  }

  public redo(): void {
    this.undoManager.redo();
  }

  private notifyNodesChange(): void {
    if (this.onNodesChangeCallback) {
      this.onNodesChangeCallback(this.getNodes());
    }
  }

  private notifyAwarenessChange(): void {
    const states = this.provider.awareness.getStates();
    const users: UserPresence[] = [];

    states.forEach((state, clientId) => {
      // Exclude own client from remote presence list
      if (clientId !== this.provider.awareness.clientID && state.user) {
        users.push(state.user as UserPresence);
      }
    });

    if (this.onAwarenessChangeCallback) {
      this.onAwarenessChangeCallback(users);
    }
  }

  public destroy(): void {
    this.provider.awareness.destroy();
    this.provider.destroy();
    this.doc.destroy();
  }
}
