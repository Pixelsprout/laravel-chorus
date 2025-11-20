import { type HarmonicEvent } from "@pixelsprout/chorus-core";
import type { Alpine as AlpineType } from "alpinejs";
declare global {
    interface Window {
        Alpine?: AlpineType;
        chorusConfig?: ChorusAlpineConfig;
        Echo?: any;
        Livewire?: any;
        $wire?: any;
    }
}
interface ChorusAlpineConfig {
    userId?: string | number;
    channelPrefix?: string;
    onRejectedHarmonic?: (harmonic: HarmonicEvent) => void;
    onSchemaVersionChange?: (oldVersion: string | null, newVersion: string) => void;
    onDatabaseVersionChange?: (oldVersion: string | null, newVersion: string) => void;
    debugMode?: boolean;
}
/**
 * Chorus Alpine.js Plugin
 *
 * Usage:
 *   import Alpine from 'alpinejs'
 *   import chorus from '@pixelsprout/chorus-alpine'
 *
 *   Alpine.plugin(chorus)
 *   Alpine.start()
 *
 * Then access via magic properties:
 *   - $chorus - Access the Chorus core instance
 *   - $table('tableName') - Access reactive table data
 *
 * Configuration can be provided via:
 *   1. window.chorusConfig (set by Blade directive)
 *   2. await $chorus.init(config) - Manual initialization
 */
export default function chorusPlugin(Alpine: AlpineType): void;
export type { ChorusAlpineConfig };
export type { ChorusCore, HarmonicEvent, TableState, SyncError, } from "@pixelsprout/chorus-core";
