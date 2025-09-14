<script setup lang="ts">
import AppContent from '@/components/AppContent.vue';
import ChorusProvider from '@pixelsprout/chorus-vue/providers/ChorusProvider.vue';
import { usePage } from '@inertiajs/vue3';
import AppShell from '@/components/AppShell.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import AppSidebarHeader from '@/components/AppSidebarHeader.vue';
import type { BreadcrumbItemType } from '@/types';

interface Props {
    breadcrumbs?: BreadcrumbItemType[];
}

withDefaults(defineProps<Props>(), {
    breadcrumbs: () => [],
});

const page = usePage();
</script>

<template>
    <ChorusProvider :user-id="page.props.auth.user?.id">
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" class="overflow-x-hidden">
                <AppSidebarHeader :breadcrumbs="breadcrumbs" />
                <slot />
            </AppContent>
        </AppShell>
    </ChorusProvider>
</template>
