import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { ChorusProvider, type HarmonicEvent } from '@pixelsprout/chorus-js';
import { usePage } from '@inertiajs/react';
import { type PropsWithChildren, useCallback } from 'react';
import { RejectedHarmonicsProvider, useRejectedHarmonics } from '@/contexts/RejectedHarmonicsContext';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { toast } from "sonner";

function AppSidebarLayoutContent({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { addNotification } = useRejectedHarmonics();

    const handleRejectedHarmonic = useCallback((harmonic: HarmonicEvent) => {
        addNotification(harmonic);
    }, [addNotification]);

    const handleDatabaseVersionChange = useCallback((oldVersion: string | null, newVersion: string) => {
        toast.info(`Database has been updated (${oldVersion || 'unknown'} → ${newVersion}). Data is being refreshed...`, {
            duration: 5000,
        });
    }, []);

    return (
        <ChorusProvider
            userId={usePage<SharedData>().props.auth.user?.id}
            channelPrefix={usePage<SharedData>().props.auth.user?.tenant_id.toString()}
            onRejectedHarmonic={handleRejectedHarmonic}
            onDatabaseVersionChange={handleDatabaseVersionChange}
        >
            <AppShell variant="sidebar">
                <AppSidebar />
                <AppContent variant="sidebar">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    {children}
                </AppContent>
            </AppShell>
            <Toaster />
        </ChorusProvider>
    );
}

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <RejectedHarmonicsProvider>
                <AppSidebarLayoutContent breadcrumbs={breadcrumbs}>
                    {children}
                </AppSidebarLayoutContent>
            </RejectedHarmonicsProvider>
        </NextThemesProvider>
    );
}
