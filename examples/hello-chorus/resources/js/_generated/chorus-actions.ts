// Auto-generated implementation for Chorus Actions
// Generated on 2025-08-13 22:21:17

import { ChorusActionsAPI } from '@pixelsprout/chorus-js/core';
import type { ChorusActionResponse, WritesProxy, ModelProxy } from './actions';

// Create the global ChorusActionsAPI instance
const chorusAPI = new ChorusActionsAPI('/api');

export async function deleteMessageAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'delete-message',
    callback,
    {
      optimistic: true,
      offline: true,
    }
  );
}

export async function createMessageWithActivityAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'create-message-with-activity',
    callback,
    {
      optimistic: true,
      offline: true,
    }
  );
}

export async function updateMessageAction(
  callback: (writes: WritesProxy) => void
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'update-message',
    callback,
    {
      optimistic: true,
      offline: true,
    }
  );
}

