// chorus/resources/js/use-harmonics.ts
import { useEcho } from '@laravel/echo-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { ChorusDatabase } from './db';

export interface HarmonicEvent {
  id: string; // uuid
  table_name: string;
  data: string;
  operation: string;
  record_id: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}

// Local storage key for storing the latest harmonic ID
const LATEST_HARMONIC_ID_KEY = 'chorus_latest_harmonic_id';

// Simple environment-aware logging utility
const log = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data === undefined) {
      console.log(message);
    } else {
      console.log(message, data);
    }
  }
};

// Custom error type for sync operations
class SyncError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SyncError';
  }
}

export function useHarmonics<T = any>(tableName: string, db: ChorusDatabase) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Retrieve the latest harmonic ID from local storage
  const getLatestHarmonicId = (): string | null => {
    return localStorage.getItem(LATEST_HARMONIC_ID_KEY);
  };

  // Save the latest harmonic ID to local storage
  const saveLatestHarmonicId = (id: string): void => {
    localStorage.setItem(LATEST_HARMONIC_ID_KEY, id);
  };

  // Get data from IndexedDB with reactive updates
  const data = useLiveQuery<T[]>(() => {
    return db.table(tableName).toArray();
  }, [tableName]);

  // Process a collection of harmonics in sequence
  async function processHarmonics(harmonics: HarmonicEvent[]) {
    if (!harmonics.length) return;

    // Group harmonics by operation type for batch processing
    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: number[] = [];
    
    // Track any processing errors
    const errors: Error[] = [];
    
    // Group operations by type
    for (const harmonic of harmonics) {
      try {
        const data = JSON.parse(harmonic.data);
        
        switch (harmonic.operation) {
          case 'create':
            creates.push(data);
            break;
          case 'update':
            updates.push(data);
            break;
          case 'delete':
            deletes.push(harmonic.record_id);
            break;
          default:
            log(`Unknown operation type: ${harmonic.operation}`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push(new SyncError(`Error processing harmonic ${harmonic.id}`, error));
      }
    }
    
    // Process in batches
    try {
      // Use Promise.all to process batches in parallel where possible
      const operations = [];
      
      if (creates.length) {
        log(`Batch adding ${creates.length} records`);
        operations.push(db.table(tableName).bulkAdd(creates));
      }
      
      if (updates.length) {
        log(`Batch updating ${updates.length} records`);
        operations.push(db.table(tableName).bulkPut(updates));
      }
      
      if (deletes.length) {
        log(`Batch deleting ${deletes.length} records`);
        operations.push(db.table(tableName).bulkDelete(deletes));
      }
      
      // Execute operations in parallel
      if (operations.length) {
        await Promise.all(operations);
      }
      
      // Save the latest harmonic ID from the last successfully processed harmonic
      saveLatestHarmonicId(harmonics[harmonics.length - 1].id);
      
      // If we had some errors, log them but don't fail the entire batch
      if (errors.length) {
        errors.forEach(error => console.error(error));
      }
    } catch (err) {
      console.error('Error during batch processing:', err);
      throw new SyncError('Failed to process harmonics batch', 
        err instanceof Error ? err : new Error(String(err)));
    }
  }

  // Process a single harmonic event by updating the IndexedDB
  async function processHarmonic(event: HarmonicEvent) {
    try {
      // Parse the JSON data from the event
      const data = JSON.parse(event.data);

      // Process based on operation type
      switch (event.operation) {
        case 'create':
          log(`Adding new ${tableName} record`, data);
          await db.table(event.table_name).add(data);
          break;
        case 'update':
          log(`Updating ${tableName} record`, data);
          await db.table(event.table_name).put(data);
          break;
        case 'delete':
          log(`Deleting ${tableName} record with ID`, event.record_id);
          await db.table(event.table_name).delete(event.record_id);
          break;
        default:
          log(`Unknown operation type: ${event.operation}`);
      }
    } catch (err) {
      const enhancedError = new SyncError(
        `Error processing ${tableName} harmonic ID ${event.id}`, 
        err instanceof Error ? err : new Error(String(err))
      );
      console.error(enhancedError);
      
      // Store failed events for potential retry
      const failedEvents = JSON.parse(localStorage.getItem('chorus_failed_events') || '[]');
      failedEvents.push(event);
      localStorage.setItem('chorus_failed_events', JSON.stringify(failedEvents.slice(-100))); // Keep last 100
    }
  }

  // Handle real-time updates via WebSockets
  useEcho<HarmonicEvent>(`chorus.table.${tableName}`, '.harmonic.created', async (event) => {
    log(`Real-time update received for ${tableName}`, event);
    await processHarmonic(event);
    // Save the latest harmonic ID
    saveLatestHarmonicId(event.id);
    setLastUpdate(new Date());
  });

  // Load initial data and/or sync harmonics
  useEffect(() => {
    const syncData = async (retryCount = 0) => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the latest harmonic ID from local storage
        const latestHarmonicId = getLatestHarmonicId();
        
        // Check if we have any data in IndexedDB
        const count = await db.table(tableName).count();
        const isInitialSync = count === 0;
        
        // Build the API URL based on whether this is an initial sync or not
        let url = `/api/sync/${tableName}`;
        if (isInitialSync) {
          url += '?initial=true';
        } else if (latestHarmonicId) {
          url += `?after=${latestHarmonicId}`;
        }

        log(`Syncing ${tableName}: ${isInitialSync ? 'Initial sync' : 'Incremental sync'}`);
        
        // Fetch from the API
        const response = await fetch(url);

        // If not OK, try to read the response text for debugging
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response body:', errorText);
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        // Parse the JSON response
        const responseData = await response.json();
        
        // Save the latest harmonic ID
        if (responseData.latest_harmonic_id) {
          saveLatestHarmonicId(responseData.latest_harmonic_id);
        }
        
        if (isInitialSync && responseData.records) {
          // Initial sync: bulk add all records
          log(`Initial sync: received ${responseData.records.length} records`);
          await db.table(tableName).bulkPut(responseData.records);
        } else if (responseData.harmonics && responseData.harmonics.length > 0) {
          // Incremental sync: process each harmonic
          log(`Incremental sync: received ${responseData.harmonics.length} harmonics`);
          await processHarmonics(responseData.harmonics);
        } else {
          log('No changes to sync');
        }
        
        setLastUpdate(new Date());
      } catch (err) {
        console.error(`Failed to sync data for ${tableName}:`, err);
        
        // Add retry logic (max 3 retries with exponential backoff)
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`Retrying in ${delay}ms...`);
          setTimeout(() => syncData(retryCount + 1), delay);
          return;
        }
        
        setError(`Failed to sync ${tableName} data: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };

    syncData();
  }, [tableName, db]);

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    processHarmonic, // Expose this in case you need to manually process events
  };
}