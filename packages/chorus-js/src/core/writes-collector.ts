// Client-side writes collector for ChorusActions
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
    this.collector.addOperation(this.tableName, 'create', data);
  }

  update(data: Record<string, any>): void {
    this.collector.addOperation(this.tableName, 'update', data);
  }

  delete(data: Record<string, any>): void {
    this.collector.addOperation(this.tableName, 'delete', data);
  }
}

// Create a proxy-based writes object for the callback API
export function createWritesProxy(collector: ClientWritesCollector): Record<string, ModelProxy> {
  return new Proxy({}, {
    get(target, tableName: string) {
      return collector.getTableProxy(tableName);
    }
  });
}