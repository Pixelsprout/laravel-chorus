import AppLayout from '@/layouts/app-layout';
import type { Message, Platform, User } from '@/stores/db';
import { type BreadcrumbItem } from '@/types';
import { useHarmonics } from '@chorus/js';
import { Head, usePage } from '@inertiajs/react';
import { ClockIcon } from 'lucide-react';
import { useState } from 'react';
import CreateMessageForm from '@/components/CreateMessageForm';
import RejectedMessages from '@/components/RejectedMessages';
import MessagesFilter from '@/components/MessagesFilter';
import MessagesList from '@/components/MessagesList';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

function DashboardContent() {
    const { auth, tenantName } = usePage().props;
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    // Sync messages with the server
    const {
        data: messages,
        isLoading: messagesLoading,
        error: messagesError,
        lastUpdate: messagesLastUpdate,
        actions: messageActions,
    } = useHarmonics<Message, { platformId: string; message: string }>('messages', (table) =>
        selectedPlatform
            ? table.where('platform_id').equals(selectedPlatform)
            : table
    );

    // Sync platforms with the server
    const {
        data: platforms,
        isLoading: platformsLoading,
        error: platformsError,
    } = useHarmonics<Platform>('platforms');

    // Sync users with the server
    const {
        data: users,
        isLoading: usersLoading,
        error: usersError,
    } = useHarmonics<User>('users');

    return (
        <>
            <Head title={`${tenantName}: Messages Dashboard`} />
            <div className="p-6">
                <div className="mb-6 flex flex-wrap gap-y-2 items-center justify-between">
                    <h1 className="text-2xl font-bold">Hi {auth.user.name}</h1>
                    <div>
                        <h2 className="text-xl font-semibold">{tenantName}: Messages Dashboard</h2>
                        {/* Sync status */}
                        {messagesLastUpdate && (
                            <div className="text-muted-foreground flex flex-wrap items-center text-sm">
                                <ClockIcon className="mr-1 h-3 w-3" />
                                Last synchronized: {messagesLastUpdate.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Rejected Operations Section */}
                <RejectedMessages />

                {/* New message form */}
                <CreateMessageForm 
                    platforms={platforms}
                    platformsLoading={platformsLoading}
                    platformsError={platformsError}
                    messageActions={messageActions}
                />

                {/* Filter section */}
                <MessagesFilter 
                    platforms={platforms}
                    platformsLoading={platformsLoading}
                    platformsError={platformsError}
                    selectedPlatform={selectedPlatform}
                    onPlatformChange={setSelectedPlatform}
                />

                {/* Messages list */}
                <MessagesList 
                    messages={messages}
                    platforms={platforms}
                    users={users}
                    messagesLoading={messagesLoading}
                    platformsLoading={platformsLoading}
                    messagesError={messagesError}
                    platformsError={platformsError}
                    messageActions={messageActions}
                />
            </div>
        </>
    );
}

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <DashboardContent />
        </AppLayout>
    );
}