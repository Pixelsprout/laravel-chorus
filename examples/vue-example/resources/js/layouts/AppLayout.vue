<script setup lang="ts">
import AppSidebarLayout from '@/layouts/app/AppSidebarLayout.vue';
import ChorusProvider from '@pixelsprout/chorus-js/vue/providers/ChorusProvider.vue';
import { usePage } from '@inertiajs/vue3';
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
        <AppSidebarLayout :breadcrumbs="breadcrumbs">
            <slot />
        </AppSidebarLayout>
    </ChorusProvider>
</template>
