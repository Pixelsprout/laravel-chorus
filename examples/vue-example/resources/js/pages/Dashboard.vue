<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import ChorusExample from '@/components/ChorusExample.vue';
import { ref } from 'vue';
import { createUserAction } from '@/_generated/chorus-actions';
import type { User } from '@/_generated/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

// Form state
const form = ref({
    name: '',
    email: '',
    password: ''
});

const isSubmitting = ref(false);
const formMessage = ref('');
const formError = ref('');

// Handle form submission
const handleSubmit = async () => {
    if (isSubmitting.value) return;

    // Reset messages
    formMessage.value = '';
    formError.value = '';

    // Basic validation
    if (!form.value.name.trim() || !form.value.email.trim() || !form.value.password.trim()) {
        formError.value = 'All fields are required';
        return;
    }

    try {
        isSubmitting.value = true;

        const result = await createUserAction(({ create }) => {
            create('users', {
                name: form.value.name.trim(),
                email: form.value.email.trim(),
                password: form.value.password,
            });

            return {
                // Any additional data for the action
            };
        });

        if (result.success) {
            formMessage.value = `User "${form.value.name}" created successfully!`;
            // Reset form
            form.value = {
                name: '',
                email: '',
                password: ''
            };
        } else {
            formError.value = result.error || 'Failed to create user';
            if (result.validation_errors) {
                console.error('Validation errors:', result.validation_errors);
                // Extract first validation error message
                const firstError = Object.values(result.validation_errors).flat()[0];
                if (firstError) {
                    formError.value = firstError;
                }
            }
        }
    } catch (error) {
        console.error('Error creating user:', error);
        formError.value = 'An unexpected error occurred';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <Head title="Dashboard" />

    <AppLayout :breadcrumbs="breadcrumbs">
        <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
            <!-- Create User Form -->
            <div class="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6 bg-white dark:bg-gray-800">
                <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New User</h2>
                
                <form @submit.prevent="handleSubmit" class="space-y-4">
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name
                        </label>
                        <input
                            id="name"
                            v-model="form.name"
                            type="text"
                            required
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter user's name"
                            :disabled="isSubmitting"
                        />
                    </div>

                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            v-model="form.email"
                            type="email"
                            required
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter user's email"
                            :disabled="isSubmitting"
                        />
                    </div>

                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            v-model="form.password"
                            type="password"
                            required
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter user's password"
                            :disabled="isSubmitting"
                        />
                    </div>

                    <!-- Success Message -->
                    <div v-if="formMessage" class="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                        {{ formMessage }}
                    </div>

                    <!-- Error Message -->
                    <div v-if="formError" class="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        {{ formError }}
                    </div>

                    <button
                        type="submit"
                        :disabled="isSubmitting"
                        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        {{ isSubmitting ? 'Creating User...' : 'Create User' }}
                    </button>
                </form>
            </div>

            <!-- Chorus Example (Users List) -->
            <div class="relative min-h-[100vh] flex-1 rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                <ChorusExample />
            </div>
        </div>
    </AppLayout>
</template>
