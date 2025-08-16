// Auto-generated implementation for Chorus Actions
// Generated on 2025-08-14 21:26:28

import { getGlobalChorusActionsAPI } from '@pixelsprout/chorus-js/core';
import type { ChorusActionResponse, WritesProxy, ModelProxy } from './actions';

// Use the global ChorusActionsAPI instance for optimistic updates integration
const chorusAPI = getGlobalChorusActionsAPI();

export async function simpleCreateMessageAction(
  callback: (writes: WritesProxy) => any
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'simple-create-message',
    callback,
    {
      optimistic: true,
      offline: true,
    }
  );
}

export async function deleteMessageAction(
  callback: (writes: WritesProxy) => any
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
  callback: (writes: WritesProxy) => any
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
  callback: (writes: WritesProxy) => any
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

