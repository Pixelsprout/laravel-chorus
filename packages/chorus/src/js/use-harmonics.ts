// chorus/js/use-harmonics.ts
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
}

// Local storage key for storing the latest harmonic ID
const LATEST_HARMONIC_ID_KEY = 'chorus_latest_harmonic_id';

export function useHarmonics<T = any>(tableName: string, db: ChorusDatabase) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Retrieve the latest harmonic ID from local storage
  const getLatestHarmonicId = (): string | null => {
    return localStorage.getItem(`${LATEST_HARMONIC_ID_KEY}_${tableName}`);
  };

  // Save the latest harmonic ID to local storage
  const saveLatestHarmonicId = (id: string): void => {
    localStorage.setItem(`${LATEST_HARMONIC_ID_KEY}_${tableName}`, id);
  };

  // Get data from IndexedDB with reactive updates
  const data = useLiveQuery<T[]>(() => {
    return db.table(tableName).toArray();
  }, [tableName]);

  // Handle real-time updates via WebSockets
  useEcho<HarmonicEvent>(`chorus.table.${tableName}`, '.harmonic.created', async (event) => {
    console.log(`Real-time update received for ${tableName}:`, event);
    await processHarmonic(event);
    // Save the latest harmonic ID
    saveLatestHarmonicId(event.id);
    setLastUpdate(new Date());
  });

  // Process a harmonic event by updating the IndexedDB
  async function processHarmonic(event: HarmonicEvent) {
    try {
      // Parse the JSON data from the event
      const data = JSON.parse(event.data);

      // Process based on operation type
      switch (event.operation) {
        case 'create':
          console.log(`Adding new ${tableName} record:`, data);
          await db.table(event.table_name).add(data);
          break;
        case 'update':
          console.log(`Updating ${tableName} record:`, data);
          await db.table(event.table_name).put(data);
          break;
        case 'delete':
          console.log(`Deleting ${tableName} record with ID:`, event.record_id);
          await db.table(event.table_name).delete(event.record_id);
          break;
        default:
          console.warn('Unknown operation type:', event.operation);
      }
    } catch (err) {
      console.error(`Error processing ${tableName} harmonic:`, err);
    }
  }

  // Load initial data
  useEffect(() => {
    const syncInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the latest harmonic ID from local storage
        const latestHarmonicId = getLatestHarmonicId();
        
        // Build the API URL with the latest harmonic ID if available
        let url = `/api/sync/${tableName}`;
        if (latestHarmonicId) {
          url += `?after=${latestHarmonicId}`;
        }

        // Fetch initial data from the API
        const response = await fetch(url);

        // Debug the response
        console.log('API Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers]),
        });

        // If not OK, try to read the response text for debugging
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response body:', errorText);
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        // Get the raw text first for debugging
        const responseText = await response.text();
        console.log('Response text:', responseText.substring(0, 200) + '...');

        try {
          // Try to parse the JSON
          const data = JSON.parse(responseText);

          if (data && Array.isArray(data)) {
            // Bulk add/update records in IndexedDB
            await db.table(tableName).bulkPut(data);
            console.log(`Initial sync completed for ${tableName}:`, data.length, 'records');
            
            // If we received data and the array isn't empty, save the latest harmonic ID
            if (data.length > 0 && data[data.length - 1].harmonic_id) {
              saveLatestHarmonicId(data[data.length - 1].harmonic_id);
            }
            
            setLastUpdate(new Date());
          } else {
            console.warn('Response is not an array:', data);
            setError('Invalid data format received');
          }
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          throw new Error('Invalid JSON response');
        }
      } catch (err) {
        console.error(`Failed to sync initial data for ${tableName}:`, err);
        setError(`Failed to sync ${tableName} data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    syncInitialData();
  }, [tableName]);

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    processHarmonic, // Expose this in case you need to manually process events
  };
}
