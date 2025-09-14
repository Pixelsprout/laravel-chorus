<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import ChorusExample from '@/components/ChorusExample.vue';
import { ref } from 'vue';
import { createUserAction } from '@/_generated/chorus-actions';
import type { User } from '@/_generated/types';

// shadcn-vue components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        <div class="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 overflow-x-auto">
            <!-- Create User Form -->
            <Card>
                <CardHeader>
                    <CardTitle>Create New User</CardTitle>
                    <CardDescription>
                        Add a new user to the system. The user will appear in real-time in the list below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form @submit.prevent="handleSubmit" class="space-y-4">
                        <div class="space-y-2">
                            <Label for="name">Name</Label>
                            <Input
                                id="name"
                                v-model="form.name"
                                type="text"
                                placeholder="Enter user's name"
                                :disabled="isSubmitting"
                                required
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="email">Email</Label>
                            <Input
                                id="email"
                                v-model="form.email"
                                type="email"
                                autocomplete="email"
                                placeholder="Enter user's email"
                                :disabled="isSubmitting"
                                required
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="password">Password</Label>
                            <Input
                                id="password"
                                v-model="form.password"
                                type="password"
                                autocomplete="new-password"
                                placeholder="Enter user's password"
                                :disabled="isSubmitting"
                                required
                            />
                        </div>

                        <!-- Success Message -->
                        <Alert v-if="formMessage">
                            <AlertDescription>
                                {{ formMessage }}
                            </AlertDescription>
                        </Alert>

                        <!-- Error Message -->
                        <Alert v-if="formError" variant="destructive">
                            <AlertDescription>
                                {{ formError }}
                            </AlertDescription>
                        </Alert>

                        <Button
                            type="submit"
                            :disabled="isSubmitting"
                            class="w-full"
                        >
                            {{ isSubmitting ? 'Creating User...' : 'Create User' }}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <!-- Users List -->
            <Card>
                <CardHeader>
                    <CardTitle>Users List</CardTitle>
                    <CardDescription>
                        Real-time synchronized user data from the database.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChorusExample />
                </CardContent>
            </Card>
        </div>
    </AppLayout>
</template>
