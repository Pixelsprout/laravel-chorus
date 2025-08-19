/**
 * Example demonstrating the simplified Action Context API
 * This shows how to use both the existing property-style API and the new simplified API
 */

import { getGlobalChorusActionsAPI } from '@pixelsprout/chorus-js';

// Get the global Chorus actions API instance
const chorusAPI = getGlobalChorusActionsAPI();

/**
 * Example 1: Using the existing property-style API (current approach)
 * This is the current API that works with the current ActionCollector
 */
export async function createMessageWithActivityExisting(messageData: {
  message: string;
  platformId: string;
}) {
  const auth = { user: { id: 'user-123', tenant_id: 1 } }; // Mock auth data
  
  const result = await chorusAPI.executeActionWithCallback('create-message-with-activity', (writes) => {
    // Create the message (UUID auto-generated)
    writes.messages.create({
      body: messageData.message,
      platform_id: messageData.platformId,
      user_id: auth.user.id,
      tenant_id: parseInt(auth.user.tenant_id.toString()), // Ensure it's a number
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Update user's last activity (handled automatically by the action)
    writes.users.update({
      id: auth.user.id,
      last_activity_at: new Date().toISOString(),
    });

    // Update platform metrics (handled automatically by the action)
    writes.platforms.update({
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
 * Example 2: Using the new simplified ActionContext API  
 * This provides the same simplified API as shown in the task description
 */
export async function createMessageWithActivitySimplified(messageData: {
  message: string;
  platformId: string;
}) {
  const auth = { user: { id: 'user-123', tenant_id: 1 } }; // Mock auth data
  
  const result = await chorusAPI.executeActionWithContext('create-message-with-activity-simplified', (context) => {
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
 * Example 3: Demonstrating both approaches side by side
 */
export function compareApproaches() {
  console.log(`
    
    // CURRENT API (Property-style):
    const result = await chorusAPI.executeActionWithCallback('action-name', (writes) => {
      writes.messages.create({ ... });
      writes.users.update({ ... });
      writes.platforms.update({ ... });
    });
    
    // NEW SIMPLIFIED API (ActionContext-style):
    const result = await chorusAPI.executeActionWithContext('action-name', (context) => {
      context.create('messages', { ... });
      context.update('users', { ... });
      context.update('platforms', { ... });
    });
    
    Both approaches provide the same functionality, but the simplified API:
    - Uses explicit method names (create, update, delete)
    - Table names are passed as first parameter
    - More closely matches server-side ActionContext API
    - Provides better IDE autocomplete and type safety
    
  `);
}