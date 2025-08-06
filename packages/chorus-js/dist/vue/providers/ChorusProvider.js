import { inject } from 'vue';
import { ChorusCoreKey, ChorusStateKey } from '../injection-keys';
// Composable to use Chorus in child components
export function useChorus() {
    // Use inject with explicit undefined as default to check if provided
    const chorusCore = inject(ChorusCoreKey, undefined);
    const chorusState = inject(ChorusStateKey, undefined);
    if (!chorusCore) {
        throw new Error('useChorus must be used within a ChorusProvider');
    }
    if (!chorusState) {
        throw new Error('useChorus must be used within a ChorusProvider');
    }
    return Object.assign({ chorusCore }, chorusState);
}
// Export the Vue component
// Note: This should be imported directly by the consuming Vue application:
// import ChorusProvider from '@pixelsprout/chorus-js/vue/providers/ChorusProvider.vue'
