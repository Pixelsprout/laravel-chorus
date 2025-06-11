import { useEcho } from '@laravel/echo-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/stores/db';

// Define the HarmonicEvent interface
export interface HarmonicEvent {
  id: string;
  table_name: string;
  data: string;
  operation: string;
  record_id: string | number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}

// Define the context state structure
interface ChorusContextState {
  isInitialized: boolean;
  tables: Record<string, TableState>;
}

interface TableState {
  lastUpdate: Date | null;
  isLoading: boolean;
  error: string | null;
}

// Create the context with default values
const ChorusContext = createContext<ChorusContextState>({
  isInitialized: false,
  tables: {},
});

// Storage key
const LATEST_HARMONIC_ID_KEY = 'chorus_latest_harmonic_id';

// Simple logging utility
const log = (message: string, data?: any) => {
  if (process.env.NODE_ENV !== 'production') {
    if (data === undefined) {
      console.log(`[Chorus] ${message}`);
    } else {
      console.log(`[Chorus] ${message}`, data);
    }
  }
};

// Custom error type
class SyncError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SyncError';
  }
}

// Helper functions
const getLatestHarmonicId = (): string | null => {
  return localStorage.getItem(LATEST_HARMONIC_ID_KEY);
};

const saveLatestHarmonicId = (id: string): void => {
  localStorage.setItem(LATEST_HARMONIC_ID_KEY, id);
};

// Process harmonics
async function processHarmonics(tableName: string, harmonics: HarmonicEvent[]) {
  if (!harmonics.length) return;

  // Group by operation type
  const creates: any[] = [];
  const updates: any[] = [];
  const deletes: (string | number)[] = [];
  const errors: Error[] = [];
  
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
  
  // Process batches
  try {
    const operations = [];
    
    if (creates.length) {
      log(`Batch adding ${creates.length} records to ${tableName}`);
      operations.push(db.table(tableName).bulkAdd(creates));
    }
    
    if (updates.length) {
      log(`Batch updating ${updates.length} records in ${tableName}`);
      operations.push(db.table(tableName).bulkPut(updates));
    }
    
    if (deletes.length) {
      log(`Batch deleting ${deletes.length} records from ${tableName}`);
      operations.push(db.table(tableName).bulkDelete(deletes));
    }
    
    if (operations.length) {
      await Promise.all(operations);
    }
    
    // Save latest harmonic ID
    saveLatestHarmonicId(harmonics[harmonics.length - 1].id);
    
    if (errors.length) {
      errors.forEach(error => console.error(error));
    }
    
    return true;
  } catch (err) {
    console.error(`Error during batch processing for ${tableName}:`, err);
    throw new SyncError(`Failed to process harmonics batch for ${tableName}`, 
      err instanceof Error ? err : new Error(String(err)));
  }
}

// Process a single harmonic
export async function processHarmonic(event: HarmonicEvent) {
  const tableName = event.table_name;
  try {
    const data = JSON.parse(event.data);

    switch (event.operation) {
      case 'create':
        log(`Adding new ${tableName} record`, data);
        await db.table(tableName).add(data);
        break;
      case 'update':
        log(`Updating ${tableName} record`, data);
        await db.table(tableName).put(data);
        break;
      case 'delete':
        log(`Deleting ${tableName} record with ID`, event.record_id);
        await db.table(tableName).delete(event.record_id);
        break;
      default:
        log(`Unknown operation type: ${event.operation}`);
    }
    
    // Save the latest harmonic ID
    saveLatestHarmonicId(event.id);
    return true;
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
    return false;
  }
}

// Global initialization flag to ensure we only initialize once across rerenders
let isGloballyInitialized = false;

// The Provider component
interface ChorusProviderProps {
  children: React.ReactNode;
  tables: string[];
}

export function ChorusProvider({ children, tables }: ChorusProviderProps) {
  // State to track syncing status across tables
  const [state, setState] = useState<ChorusContextState>({
    isInitialized: isGloballyInitialized, // Start with global flag
    tables: {},
  });

  // Setup Echo listeners for each table
  const setupEchoListeners = () => {
    // For each table, set up a separate useEcho hook
    tables.forEach(tableName => {
      useEcho<HarmonicEvent>(
        `chorus.table.${tableName}`,
        '.harmonic.created',
        async (event) => {
          if (isGloballyInitialized) { // Only process events after initialization
            log(`Real-time update received for ${tableName}`, event);
            
            // Process the harmonic
            await processHarmonic(event);
            
            // Update the last update time
            setState(prev => ({
              ...prev,
              tables: {
                ...prev.tables,
                [tableName]: {
                  ...prev.tables[tableName],
                  lastUpdate: new Date()
                }
              }
            }));
          }
        }
      );
    });
  };
  
  // Call the setup function to establish listeners
  setupEchoListeners();
  
  // Initialize the data sync
  useEffect(() => {
    // Skip if already initialized globally
    if (isGloballyInitialized) {
      return;
    }

    const initializeTables = async () => {
      // Set up initial state for all tables
      const initialTableState: Record<string, TableState> = {};
      tables.forEach(tableName => {
        initialTableState[tableName] = {
          lastUpdate: null,
          isLoading: true,
          error: null
        };
      });
      
      setState(prev => ({
        ...prev,
        tables: initialTableState
      }));
      
      // Initialize each table
      // Get the latest harmonic ID once for all tables
      const latestHarmonicId = getLatestHarmonicId();
      
      for (const tableName of tables) {
        try {
          // Check if we have data already
          const count = await db.table(tableName).count();
          const isInitialSync = count === 0;
          
          // Build the API URL
          let url = `/api/sync/${tableName}`;
          if (isInitialSync) {
            url += '?initial=true';
          } else if (latestHarmonicId) {
            url += `?after=${latestHarmonicId}`;
          }
  
          log(`Syncing ${tableName}: ${isInitialSync ? 'Initial sync' : 'Incremental sync'}`);
          
          // Fetch data
          const response = await fetch(url);
  
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
          }
  
          const responseData = await response.json();
          
          // Save latest harmonic ID - only update if it's newer than our current one
          if (responseData.latest_harmonic_id) {
            const currentId = getLatestHarmonicId();
            // Save if we don't have an ID yet or if the new one is greater
            if (!currentId || responseData.latest_harmonic_id > currentId) {
              saveLatestHarmonicId(responseData.latest_harmonic_id);
            }
          }
          
          // Process the data
          if (isInitialSync && responseData.records) {
            log(`Initial sync: received ${responseData.records.length} records for ${tableName}`);
            await db.table(tableName).bulkPut(responseData.records);
          } else if (responseData.harmonics && responseData.harmonics.length > 0) {
            log(`Incremental sync: received ${responseData.harmonics.length} harmonics for ${tableName}`);
            await processHarmonics(tableName, responseData.harmonics);
          } else {
            log(`No changes to sync for ${tableName}`);
          }
          
          // Update state for this table
          setState(prev => ({
            ...prev,
            tables: {
              ...prev.tables,
              [tableName]: {
                lastUpdate: new Date(),
                isLoading: false,
                error: null
              }
            }
          }));
        } catch (err) {
          console.error(`Failed to sync data for ${tableName}:`, err);
          
          // Update state with error
          setState(prev => ({
            ...prev,
            tables: {
              ...prev.tables,
              [tableName]: {
                ...prev.tables[tableName],
                isLoading: false,
                error: `Failed to sync ${tableName} data: ${err instanceof Error ? err.message : String(err)}`
              }
            }
          }));
        }
      }
      
      // Mark as initialized both locally and globally
      isGloballyInitialized = true;
      setState(prev => ({
        ...prev,
        isInitialized: true
      }));
      
      log('Chorus initialization complete');
    };

    // Only initialize if not already initialized
    if (!isGloballyInitialized) {
      initializeTables();
    }
  }, []); // Empty dependency array means this runs once

  return (
    <ChorusContext.Provider value={state}>
      {children}
    </ChorusContext.Provider>
  );
}

// Custom hook to access the Chorus context
export function useChorus() {
  return useContext(ChorusContext);
}

// Custom hook to access harmonized data
export function useHarmonics<T = any>(tableName: string) {
  // Get data from IndexedDB with reactive updates
  const data = useLiveQuery<T[]>(() => {
    return db.table(tableName).toArray();
  }, [tableName]);
  
  // Get status from the Chorus context
  const chorusState = useContext(ChorusContext);
  const tableState = chorusState.tables[tableName] || {
    lastUpdate: null,
    isLoading: false,
    error: null
  };
  
  return {
    data,
    isLoading: tableState.isLoading,
    error: tableState.error,
    lastUpdate: tableState.lastUpdate,
  };
}