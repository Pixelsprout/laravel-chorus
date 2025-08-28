import type { HarmonicEvent } from '../types';
/**
 * Common props interface for ChorusProvider components across Vue and React
 */
export interface ChorusProviderProps {
    /** User ID for scoping data and channels */
    userId?: number | string;
    /** Optional channel prefix for multi-tenant setups */
    channelPrefix?: string;
    /** Callback for when a harmonic is rejected by the server */
    onRejectedHarmonic?: (harmonic: HarmonicEvent) => void;
    /** Callback for schema version changes */
    onSchemaVersionChange?: (oldVersion: string | null, newVersion: string) => void;
    /** Callback for database version changes */
    onDatabaseVersionChange?: (oldVersion: string | null, newVersion: string) => void;
    /** Enable debug mode for verbose logging */
    debugMode?: boolean;
}
/**
 * Vue-specific ChorusProvider props (Vue slots don't need explicit children prop)
 */
export interface VueChorusProviderProps extends ChorusProviderProps {
}
