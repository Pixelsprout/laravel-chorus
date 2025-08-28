import type { ChorusProviderProps } from '@pixelsprout/chorus-core';

/**
 * React-specific ChorusProvider props
 */
export interface ReactChorusProviderProps extends ChorusProviderProps {
  children: React.ReactNode;
}