<template>
  <div class="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg space-y-4">
    <h2 class="text-xl font-bold text-gray-900">
      New ChorusActions API Example
    </h2>
    
    <div class="space-y-4">
      <!-- Message form -->
      <form @submit.prevent="createMessage" class="space-y-3">
        <div>
          <label for="message" class="block text-sm font-medium text-gray-700">
            Message
          </label>
          <input
            id="message"
            v-model="messageForm.message"
            type="text"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter your message..."
          />
        </div>
        
        <div>
          <label for="platform" class="block text-sm font-medium text-gray-700">
            Platform
          </label>
          <select
            id="platform"
            v-model="messageForm.platformId"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select platform...</option>
            <option value="platform-1">Platform 1</option>
            <option value="platform-2">Platform 2</option>
          </select>
        </div>
        
        <button
          type="submit"
          :disabled="isCreatingMessage || !canSubmit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <span v-if="isCreatingMessage">Creating...</span>
          <span v-else>Create Message with Activity Update</span>
        </button>
      </form>

      <!-- User status -->
      <div v-if="user" class="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm">
        👤 Logged in as: {{ user.name }} ({{ user.email }})
      </div>
      
      <div v-else class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
        ❌ Not authenticated - please log in
      </div>

      <!-- Status display -->
      <div class="space-y-2">
        <div v-if="!isOnline" class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded">
          <div class="flex">
            <div class="flex-shrink-0">⚠️</div>
            <div class="ml-3">
              <p class="text-sm">You're offline. Actions will be queued for sync.</p>
            </div>
          </div>
        </div>

        <div v-if="syncInProgress" class="bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded">
          <div class="flex">
            <div class="flex-shrink-0">🔄</div>
            <div class="ml-3">
              <p class="text-sm">Syncing offline actions...</p>
            </div>
          </div>
        </div>

        <div v-if="actionErrors.length > 0" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
          <div class="flex">
            <div class="flex-shrink-0">❌</div>
            <div class="ml-3">
              <p class="text-sm font-medium">Action Errors:</p>
              <ul class="list-disc list-inside text-sm">
                <li v-for="error in actionErrors" :key="error.action">
                  {{ error.action }}: {{ error.error }}
                </li>
              </ul>
              <button 
                @click="clearAllErrors"
                class="mt-2 text-sm underline"
              >
                Clear errors
              </button>
            </div>
          </div>
        </div>

        <div v-if="lastResponse" class="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded">
          <div class="flex">
            <div class="flex-shrink-0">✅</div>
            <div class="ml-3">
              <p class="text-sm font-medium">Last Action Result:</p>
              <p class="text-sm">
                Success: {{ lastResponse.success ? 'Yes' : 'No' }}
              </p>
              <p v-if="lastResponse.summary" class="text-sm">
                Operations: {{ lastResponse.summary.successful }}/{{ lastResponse.summary.total }} successful
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action state debugging -->
      <details class="text-sm">
        <summary class="cursor-pointer text-gray-600">Debug Info</summary>
        <pre class="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">{{ JSON.stringify({
          actionStates,
          isOnline,
          syncInProgress,
          actionErrors,
        }, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { createMessageWithActivityAction } from '../_generated/chorus-actions';
import type { ChorusActionResponse } from '../_generated/actions';

// Get auth context from Inertia page props
const page = usePage();
const user = computed(() => page.props.auth?.user);

// Form state
const messageForm = ref({
  message: '',
  platformId: '',
});

// Action state
const isCreatingMessage = ref(false);
const lastResponse = ref<ChorusActionResponse | null>(null);
const actionError = ref<string | null>(null);

// Network status (simplified for demo)
const isOnline = ref(navigator.onLine);
const syncInProgress = ref(false);

// Form validation
const canSubmit = computed(() => {
  return messageForm.value.message.trim() && 
         messageForm.value.platformId && 
         user.value; // Ensure user is authenticated
});

// Actions
async function createMessage() {
  if (!canSubmit.value) return;

  isCreatingMessage.value = true;
  actionError.value = null;

  try {
    if (!user.value) {
      throw new Error('User not authenticated');
    }

    const response = await createMessageWithActivityAction((writes) => {
      // Create the message
      writes.messages.create({
        body: messageForm.value.message,
        platform_id: messageForm.value.platformId,
        user_id: user.value.id,
        tenant_id: user.value.tenant_id,
      });

      // Update user's last activity
      writes.users.update({
        id: user.value.id,
        last_activity_at: new Date().toISOString(),
      });

      // Update platform metrics
      writes.platforms.update({
        id: messageForm.value.platformId,
        last_message_at: new Date().toISOString(),
      });
    });

    lastResponse.value = response;

    if (response.success) {
      // Reset form on success
      messageForm.value = {
        message: '',
        platformId: '',
      };
    }
  } catch (error: any) {
    console.error('Failed to create message:', error);
    actionError.value = error.message || 'Failed to create message';
  } finally {
    isCreatingMessage.value = false;
  }
}

// Computed for display
const actionErrors = computed(() => {
  return actionError.value ? [{ action: 'createMessage', error: actionError.value }] : [];
});

function clearAllErrors() {
  actionError.value = null;
}
</script>