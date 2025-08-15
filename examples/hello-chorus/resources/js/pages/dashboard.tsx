import AppLayout from '@/layouts/app-layout';
import type { Message, Platform, User } from '@/_generated/types';
import { type BreadcrumbItem } from '@/types';
import { useTable, useHarmonicsQuery } from '@pixelsprout/chorus-js';
import { OfflineBanner, OfflineIndicator } from '@pixelsprout/chorus-js';
import { Head, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { ClockIcon } from 'lucide-react';
import { useState } from 'react';
import CreateMessageForm from '@/components/forms/CreateMessageForm';
import RejectedMessages from '@/components/RejectedMessages';
import MessagesFilter from '@/components/MessagesFilter';
import MessagesList from '@/components/MessagesList';
import { Card } from '@/components/ui/card';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

function DashboardContent() {
    const { auth, tenantName } = usePage<SharedData>().props;
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    // Use the helper hook to automatically memoize the query
    const messagesQuery = useHarmonicsQuery<Message>(
        (table) => selectedPlatform
            ? table.where('platform_id').equals(selectedPlatform)
            : table,
        [selectedPlatform]
    );

    // Sync messages with the server and get write actions
    const {
        data: messages,
        isLoading: messagesLoading,
        error: messagesError,
        lastUpdate: messagesLastUpdate,
    } = useTable<Message>('messages', { query: messagesQuery });

    // Sync platforms with the server
    const {
        data: platforms,
        isLoading: platformsLoading,
        error: platformsError,
    } = useTable<Platform>('platforms');

    // Sync users with the server
    const {
        data: users,
    } = useTable<User>('users');

    const currentUser = users?.find((user) => auth.user.id.toString() === user.id);

    return (
        <>
            <Head title={`${String(tenantName)}: Messages Dashboard`} />
            <OfflineBanner className="bg-orange-100 border-b border-orange-200 text-orange-800 p-3 text-center" />
            <div className="p-6">
                <div className="mb-6 flex flex-wrap gap-y-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2 flex-col">
                        <h1 className="text-2xl font-bold">Hi {auth.user.name}</h1>
                        {
                            currentUser?.last_activity_at && (
                                <div className="text-muted-foreground flex items-center text-sm">
                                    <ClockIcon className="mr-1 h-3 w-3" />
                                    Last activity: {new Date(currentUser.last_activity_at).toLocaleString()}
                                </div>
                            )
                        }
                    </div>
                    <div className="flex flex-wrap flex-col gap-y-1.5">
                        <h2 className="text-xl font-semibold">{String(tenantName)}</h2>
                        {/* Sync status */}
                        <div className="flex flex-col items-end gap-1">
                            {messagesLastUpdate && (
                                <div className="text-muted-foreground flex items-center text-sm">
                                    <ClockIcon className="mr-1 h-3 w-3" />
                                    Last synchronized: {messagesLastUpdate.toLocaleTimeString()}
                                </div>
                            )}
                            <OfflineIndicator
                                className="flex items-center gap-2 text-sm"
                                showPendingCount={true}
                                showRetryButton={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Platform Statistics Section */}
                {platforms && platforms.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Platform Activity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {platforms.map((platform) => (
                                <Card key={platform.id} className="p-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-card-foreground">{platform.name}</h4>
                                        <span className="text-xs">Platform</span>
                                    </div>
                                    {platform.last_message_at && (
                                        <div className="mt-2 text-sm flex items-center">
                                            <ClockIcon className="mr-1 h-3 w-3" />
                                            Last message: {new Date(platform.last_message_at).toLocaleString()}
                                        </div>
                                    )}
                                    {!platform.last_message_at && (
                                        <div className="mt-2 text-sm">
                                            No messages yet
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rejected Operations Section */}
                <RejectedMessages />

                {/* New message form */}
                <CreateMessageForm
                    platforms={platforms}
                    platformsLoading={platformsLoading}
                    platformsError={platformsError}
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
