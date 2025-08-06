import { inject } from 'vue';
import { ChorusCoreKey, ChorusStateKey, type ChorusState } from '../injection-keys';

// Composable to use Chorus in child components
export function useChorus() {
  console.log('[useChorus] Looking for injection keys:', { ChorusCoreKey, ChorusStateKey });
  console.log('[useChorus] Key descriptions:', { 
    coreDesc: ChorusCoreKey.description, 
    stateDesc: ChorusStateKey.description,
    coreString: ChorusCoreKey.toString(),
    stateString: ChorusStateKey.toString()
  });
  
  // Use inject with explicit undefined as default to check if provided
  const chorusCore = inject(ChorusCoreKey, undefined);
  const chorusState = inject(ChorusStateKey, undefined);
  
  console.log('[useChorus] Injected values:', { chorusCore, chorusState });
  
  if (!chorusCore) {
    console.error('[useChorus] ChorusCore not provided. Make sure useChorus is called within a ChorusProvider.');
    throw new Error('useChorus must be used within a ChorusProvider');
  }
  
  if (!chorusState) {
    console.error('[useChorus] ChorusState not provided. Make sure useChorus is called within a ChorusProvider.');
    throw new Error('useChorus must be used within a ChorusProvider');
  }

  console.log('[useChorus] Successfully injected both values');
  return {
    chorusCore,
    ...chorusState
  };
}

// Export the Vue component
// Note: This should be imported directly by the consuming Vue application:
// import ChorusProvider from '@pixelsprout/chorus-js/vue/providers/ChorusProvider.vue'