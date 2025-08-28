/**
 * Example demonstrating the simplified Action Context API
 * This shows how to use both the existing property-style API and the new simplified API
 */

import { getGlobalChorusActionsAPI, type WritesProxy, type ActionContextLike } from '@pixelsprout/chorus-core';

// Get the global Chorus actions API instance
const chorusAPI = getGlobalChorusActionsAPI();

/**
 * Example 1: Using the ActionContext API with executeActionWithCallback
 * Both methods now use ActionContextLike for consistency
 */
export async function createMessageWithActivityExisting(messageData: {
  message: string;
  platformId: string;
}) {
  const auth = { user: { id: 'user-123', tenant_id: 1 } }; // Mock auth data
  
  const result = await chorusAPI.executeActionWithCallback('create-message-with-activity', (context: ActionContextLike) => {
    // Create the message (UUID auto-generated)
    context.create('messages', {
      body: messageData.message,
      platform_id: messageData.platformId,
      user_id: auth.user.id,
      tenant_id: parseInt(auth.user.tenant_id.toString()), // Ensure it's a number
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Update user's last activity (handled automatically by the action)
    context.update('users', {
      id: auth.user.id,
      last_activity_at: new Date().toISOString(),
    });

    // Update platform metrics (handled automatically by the action)
    context.update('platforms', {
      id: messageData.platformId,
      last_message_at: new Date().toISOString(),
    });

    return {
      test_item: 'test message',
    };
  });
  
  return result;
}

/**
 * Example 2: Using the ActionContext API with executeActionWithContext
 * Both methods now use ActionContextLike for consistency
 */
export async function createMessageWithActivitySimplified(messageData: {
  message: string;
  platformId: string;
}) {
  const auth = { user: { id: 'user-123', tenant_id: 1 } }; // Mock auth data
  
  const result = await chorusAPI.executeActionWithContext('create-message-with-activity-simplified', (context: ActionContextLike) => {
    // Create the message (UUID auto-generated)
    context.create('messages', {
      body: messageData.message,
      platform_id: messageData.platformId,
      user_id: auth.user.id,
      tenant_id: parseInt(auth.user.tenant_id.toString()), // Ensure it's a number
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Update user's last activity (handled automatically by the action)
    context.update('users', {
      id: auth.user.id,
      last_activity_at: new Date().toISOString(),
    });

    // Update platform metrics (handled automatically by the action)
    context.update('platforms', {
      id: messageData.platformId,
      last_message_at: new Date().toISOString(),
    });

    return {
      test_item: 'test message',
    };
  });
  
  return result;
}

/**
 * Example 3: Demonstrating both methods side by side
 */
export function compareApproaches() {
  console.log(`
    
    // Both methods now use ActionContext API:
    
    // executeActionWithCallback:
    const result = await chorusAPI.executeActionWithCallback('action-name', (context) => {
      context.create('messages', { ... });
      context.update('users', { ... });
      context.update('platforms', { ... });
    });
    
    // executeActionWithContext:
    const result = await chorusAPI.executeActionWithContext('action-name', (context) => {
      context.create('messages', { ... });
      context.update('users', { ... });
      context.update('platforms', { ... });
    });
    
    Both methods provide the same ActionContext API:
    - Uses explicit method names (create, update, remove)
    - Table names are passed as first parameter
    - Matches server-side ActionContext API
    - Provides better IDE autocomplete and type safety
    
  `);
}