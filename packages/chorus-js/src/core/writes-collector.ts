// Client-side writes collector for ChorusActions

import { uuidv7 } from "uuidv7";

export interface WriteOperation {
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: number;
}

export interface ModelProxy {
  create(data: Record<string, any>): void;
  update(data: Record<string, any>): void;
  delete(data: Record<string, any>): void;
}

export type WritesProxy = Record<string, ModelProxy>;

export class ClientWritesCollector {
  private operations: WriteOperation[] = [];
  private modelProxies: Map<string, ModelProxy> = new Map();
  private collecting = false;

  startCollecting(): void {
    this.collecting = true;
    this.operations = [];
    this.modelProxies.clear();
  }

  stopCollecting(): void {
    this.collecting = false;
  }

  isCollecting(): boolean {
    return this.collecting;
  }

  getOperations(): WriteOperation[] {
    return [...this.operations];
  }

  // Dynamic property access for table proxies
  getTableProxy(tableName: string): ModelProxy {
    if (!this.collecting) {
      throw new Error('WritesCollector is not currently collecting operations');
    }

    if (!this.modelProxies.has(tableName)) {
      this.modelProxies.set(tableName, new ClientModelProxy(this, tableName));
    }

    return this.modelProxies.get(tableName)!;
  }

  addOperation(tableName: string, operation: 'create' | 'update' | 'delete', data: Record<string, any>): void {
    if (!this.collecting) {
      throw new Error('WritesCollector is not currently collecting operations');
    }

    this.operations.push({
      table: tableName,
      operation,
      data,
      timestamp: Date.now(),
    });
  }
}

class ClientModelProxy implements ModelProxy {
  constructor(
    private collector: ClientWritesCollector,
    private tableName: string
  ) {}

  create(data: Record<string, any>): void {
    // Automatically add UUID if id field is missing
    let dataWithId = {
      id: uuidv7(),
      ...data,
    };
    
    this.collector.addOperation(this.tableName, 'create', dataWithId);
  }

  update(data: Record<string, any>): void {
    this.collector.addOperation(this.tableName, 'update', data);
  }

  delete(data: Record<string, any>): void {
    this.collector.addOperation(this.tableName, 'delete', data);
  }
}

// Create a proxy-based writes object for the callback API
export function createWritesProxy(collector: ClientWritesCollector): WritesProxy {
  return new Proxy({}, {
    get(target, tableName: string) {
      return collector.getTableProxy(tableName);
    }
  });
}

/**
 * Enhanced ActionContext-like interface for client-side operations
 */
export interface ActionContextLike {
  create(table: string, data: Record<string, any>): void;
  update(table: string, data: Record<string, any>): void;  
  remove(table: string, data: Record<string, any>): void;
}

/**
 * Create an ActionContext-like object that works with the callback API
 * This provides the same simplified API as the server-side ActionContext
 * Supports both property access and destructured access patterns
 */
export function createActionContext(collector: ClientWritesCollector): ActionContextLike {
  const context = {
    create(table: string, data: Record<string, any>): void {
      collector.getTableProxy(table).create(data);
    },

    update(table: string, data: Record<string, any>): void {
      collector.getTableProxy(table).update(data);
    },

    remove(table: string, data: Record<string, any>): void {
      collector.getTableProxy(table).delete(data);
    }
  };

  return context;
}