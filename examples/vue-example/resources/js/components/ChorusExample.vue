<script setup lang="ts">
// Test the Vue Chorus implementation
import {
    useChorus,
    useOffline,
    useTable
} from '@pixelsprout/chorus-vue';
import { watch, computed } from 'vue';
import OfflineIndicator from '@pixelsprout/chorus-vue/components/OfflineIndicator.vue';

// shadcn-vue components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Get Chorus state
const {
    isInitialized,
    tables,
    schema,
    initializationError
} = useChorus();

// Get offline state
const {
    isOnline,
    pendingRequestsCount
} = useOffline();


const {
    data: usersData,
    isLoading: usersIsLoading,
    error: usersError,
    lastUpdate: usersLastUpdate,
} = useTable('users');

</script>

<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="usersIsLoading" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <Skeleton class="h-4 w-[100px]" />
          <Skeleton class="h-4 w-[60px]" />
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="space-y-3">
          <Skeleton class="h-[125px] w-full rounded-xl" />
          <div class="space-y-2">
            <Skeleton class="h-4 w-[200px]" />
            <Skeleton class="h-4 w-[160px]" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <Alert v-else-if="usersError" variant="destructive">
      <AlertDescription>
        Error loading users data: {{ usersError }}
      </AlertDescription>
    </Alert>

    <!-- Users Data -->
    <div v-else-if="usersData && usersData.length > 0" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-muted-foreground">Total users:</span>
          <span class="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
            {{ usersData.length }}
          </span>
        </div>
        <div v-if="usersLastUpdate" class="text-xs text-muted-foreground">
          Last updated: {{ usersLastUpdate.toLocaleTimeString() }}
        </div>
      </div>
      
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card v-for="user in usersData" :key="user.id" class="hover:shadow-md transition-shadow">
          <CardHeader class="pb-2">
            <div class="flex items-start justify-between">
              <CardTitle class="text-base">{{ user.name }}</CardTitle>
              <span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Active
              </span>
            </div>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="text-sm text-muted-foreground">
              {{ user.email }}
            </div>
            <div class="text-xs text-muted-foreground font-mono">
              ID: {{ user.id }}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-12">
      <div class="text-center space-y-3">
        <div class="mx-auto h-24 w-24 text-muted-foreground/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-medium">No users found</h3>
          <p class="text-sm text-muted-foreground mt-1">
            Create your first user using the form above.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>


<!-- No scoped styles needed - using shadcn-vue classes -->
