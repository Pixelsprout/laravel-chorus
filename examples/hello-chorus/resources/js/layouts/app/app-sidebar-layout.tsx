import { chorusSchema } from '@/_generated/schema';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { ChorusProvider, type HarmonicEvent } from '@chorus/js';
import { usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { RejectedHarmonicsProvider, useRejectedHarmonics } from '@/contexts/RejectedHarmonicsContext';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { ThemeProvider } from "next-themes"

function AppSidebarLayoutContent({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { addNotification } = useRejectedHarmonics();

    const handleRejectedHarmonic = (harmonic: HarmonicEvent) => {
        // Add to context for dashboard display
        addNotification(harmonic);

        // Show Sonner toast notification
        const message = `Failed to ${harmonic.operation}: ${harmonic.rejected_reason}`;

        if (harmonic.rejected_reason?.includes('Validation failed')) {
            toast.warning(message, {
                description: 'Please check your input and try again.',
                duration: 6000,
                icon: <AlertTriangle className="h-4 w-4" />,
                action: {
                    label: 'Dismiss',
                    onClick: () => {},
                },
            });
        } else if (harmonic.rejected_reason === 'Permission denied') {
            toast.error(message, {
                description: 'You do not have permission to perform this action.',
                duration: 6000,
                icon: <XCircle className="h-4 w-4" />,
                action: {
                    label: 'Dismiss',
                    onClick: () => {},
                },
            });
        } else {
            toast.error(message, {
                description: 'An error occurred while processing your request.',
                duration: 6000,
                icon: <AlertCircle className="h-4 w-4" />,
                action: {
                    label: 'Dismiss',
                    onClick: () => {},
                },
            });
        }
    };

    return (
        <ChorusProvider
            userId={usePage<SharedData>().props.auth.user?.id}
            channelPrefix={usePage<SharedData>().props.auth.user?.tenant_id.toString()}
            schema={chorusSchema}
            onRejectedHarmonic={handleRejectedHarmonic}
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
        <ThemeProvider attribute="class"
                       defaultTheme="system"
                       enableSystem
                       disableTransitionOnChange
        >
            <RejectedHarmonicsProvider>
                <AppSidebarLayoutContent breadcrumbs={breadcrumbs}>
                    {children}
                </AppSidebarLayoutContent>
            </RejectedHarmonicsProvider>
        </ThemeProvider>
    );
}
