import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem, SharedData } from '@/types';
import { type PropsWithChildren } from 'react';
import { ChorusProvider } from '@pixelsprout/chorus-js';
import { usePage } from '@inertiajs/react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <ChorusProvider
            userId={usePage<SharedData>().props.auth.user?.id}>
            <AppShell variant="sidebar">
                <AppSidebar />
                <AppContent variant="sidebar" className="overflow-x-hidden">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    {children}
                </AppContent>
            </AppShell>
        </ChorusProvider>
    );
}
