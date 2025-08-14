// Client-side writes collector for ChorusActions

// Simple UUID v4 generator (fallback if no UUID library is available)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    const dataWithId = {
      ...data,
      id: data.id || generateUUID(),
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