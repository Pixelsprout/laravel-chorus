// Auto-generated implementation for Chorus Actions
// Generated on 2025-08-16 09:14:51

import { getGlobalChorusActionsAPI } from '@pixelsprout/chorus-js';
import type { ChorusActionResponse, WritesProxy, ModelProxy, ValidationUtils, ValidationResult, ActionContextLike } from './actions';
import { SimpleCreateMessageValidationSchema, DeleteMessageValidationSchema, CreateMessageWithActivityValidationSchema, UpdateMessageValidationSchema } from './actions';

// Use the global ChorusActionsAPI instance for optimistic updates integration
const chorusAPI = getGlobalChorusActionsAPI();

export async function simpleCreateMessageAction(
  callback: (writes: WritesProxy) => any,
  options: { validate?: boolean } = { validate: true }
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'simple-create-message',
    callback,
    {
      optimistic: true,
      offline: true,
      validate: options.validate,
      validationSchema: options.validate ? SimpleCreateMessageValidationSchema : undefined,
    }
  );
}

export async function deleteMessageAction(
  callback: (writes: WritesProxy) => any,
  options: { validate?: boolean } = { validate: true }
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'delete-message',
    callback,
    {
      optimistic: true,
      offline: true,
      validate: options.validate,
      validationSchema: options.validate ? DeleteMessageValidationSchema : undefined,
    }
  );
}

export async function createMessageWithActivityAction(
  callback: (context: ActionContextLike) => any,
  options: { validate?: boolean } = { validate: true }
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithContext(
    'create-message-with-activity',
    callback,
    {
      optimistic: true,
      offline: true,
      validate: options.validate,
      validationSchema: options.validate ? CreateMessageWithActivityValidationSchema : undefined,
    }
  );
}

export async function updateMessageAction(
  callback: (writes: WritesProxy) => any,
  options: { validate?: boolean } = { validate: true }
): Promise<ChorusActionResponse> {
  return await chorusAPI.executeActionWithCallback(
    'update-message',
    callback,
    {
      optimistic: true,
      offline: true,
      validate: options.validate,
      validationSchema: options.validate ? UpdateMessageValidationSchema : undefined,
    }
  );
}

