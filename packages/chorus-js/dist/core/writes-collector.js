// Client-side writes collector for ChorusActions
// Simple UUID v4 generator (fallback if no UUID library is available)
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
export class ClientWritesCollector {
    constructor() {
        this.operations = [];
        this.modelProxies = new Map();
        this.collecting = false;
    }
    startCollecting() {
        this.collecting = true;
        this.operations = [];
        this.modelProxies.clear();
    }
    stopCollecting() {
        this.collecting = false;
    }
    isCollecting() {
        return this.collecting;
    }
    getOperations() {
        return [...this.operations];
    }
    // Dynamic property access for table proxies
    getTableProxy(tableName) {
        if (!this.collecting) {
            throw new Error('WritesCollector is not currently collecting operations');
        }
        if (!this.modelProxies.has(tableName)) {
            this.modelProxies.set(tableName, new ClientModelProxy(this, tableName));
        }
        return this.modelProxies.get(tableName);
    }
    addOperation(tableName, operation, data) {
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
class ClientModelProxy {
    constructor(collector, tableName) {
        this.collector = collector;
        this.tableName = tableName;
    }
    create(data) {
        // Automatically add UUID if id field is missing
        const dataWithId = Object.assign(Object.assign({}, data), { id: data.id || generateUUID() });
        this.collector.addOperation(this.tableName, 'create', dataWithId);
    }
    update(data) {
        this.collector.addOperation(this.tableName, 'update', data);
    }
    delete(data) {
        this.collector.addOperation(this.tableName, 'delete', data);
    }
}
// Create a proxy-based writes object for the callback API
export function createWritesProxy(collector) {
    return new Proxy({}, {
        get(target, tableName) {
            return collector.getTableProxy(tableName);
        }
    });
}
