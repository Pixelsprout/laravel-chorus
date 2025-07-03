// Core types used across all implementations
// Custom error type
export class SyncError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'SyncError';
    }
}
