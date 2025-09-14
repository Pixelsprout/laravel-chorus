// Auto-generated implementation for Chorus Actions
// Generated on 2025-09-14 01:15:13

import { getGlobalChorusActionsAPI } from '@pixelsprout/chorus-core';
import type { ChorusActionResponse, WritesProxy } from './action-types';
import { CreateUserValidationSchema } from './action-types';

// Use the global ChorusActionsAPI instance for optimistic updates integration
const chorusAPI = getGlobalChorusActionsAPI();

export async function createUserAction(
  callback: (writes: WritesProxy) => any,
  options: { validate?: boolean } = { validate: true }
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'create-user',
    callback,
    {
      optimistic: true,
      offline: true,
      validate: options.validate,
      validationSchema: options.validate ? CreateUserValidationSchema : undefined,
    }
  );
}

