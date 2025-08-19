// Client-side writes collector for ChorusActions
import { uuidv7 } from "uuidv7";
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
        let dataWithId = Object.assign({ id: uuidv7() }, data);
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
/**
 * Create an ActionContext-like object that works with the callback API
 * This provides the same simplified API as the server-side ActionContext
 * Supports both property access and destructured access patterns
 */
export function createActionContext(collector) {
    const context = {
        create(table, data) {
            collector.getTableProxy(table).create(data);
        },
        update(table, data) {
            collector.getTableProxy(table).update(data);
        },
        delete(table, data) {
            collector.getTableProxy(table).delete(data);
        }
    };
    return context;
}
