import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Message, Platform, User } from '@/stores/db';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import UpdateMessageForm from './UpdateMessageForm';
import DeleteMessageForm from './DeleteMessageForm';

interface MessagesListProps {
    messages: Message[] | undefined;
    platforms: Platform[] | undefined;
    users: User[] | undefined;
    messagesLoading: boolean;
    platformsLoading: boolean;
    messagesError: string | null;
    platformsError: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageActions: any;
}

export default function MessagesList({
    messages,
    platforms,
    users,
    messagesLoading,
    platformsLoading,
    messagesError,
    platformsError,
    messageActions
}: MessagesListProps) {
    const { auth } = usePage<SharedData>().props;

    // Format the date in a readable format
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    };

    // Get user name by user_id
    const getUserName = (userId: string) => {
        const user = users?.find(u => u.id.toString() === userId.toString());
        return user?.name || `User ${userId}`;
    };

    // Group messages by platform
    const groupedMessages =
        messages?.reduce(
            (acc, message) => {
                const platformId = message.platform_id;
                if (!acc[platformId]) {
                    acc[platformId] = [];
                }
                acc[platformId].push(message);
                return acc;
            },
            {} as Record<number|string, Message[]>,
        ) || {};

    // Get platform name by ID
    const getPlatformName = (platformId: string | number) => {
        if (!platforms || platforms.length === 0) {
            return 'Loading...';
        }

        // Simple string comparison is most reliable when working with UUIDs
        const platformIdStr = String(platformId);
        const match = platforms.find((p) => String(p.id) === platformIdStr);

        return match?.name || 'Unknown';
    };

    if (messagesLoading || platformsLoading) {
        return <p className="py-4 text-center">Loading data...</p>;
    }

    if (messagesError) {
        return (
            <Card className="border-destructive">
                <CardContent className="pt-6">
                    <p className="text-destructive">Error loading messages: {messagesError}</p>
                </CardContent>
            </Card>
        );
    }

    if (platformsError) {
        return (
            <Card className="border-destructive">
                <CardContent className="pt-6">
                    <p className="text-destructive">Error loading platforms: {platformsError}</p>
                </CardContent>
            </Card>
        );
    }

    if (Object.keys(groupedMessages).length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No messages found. Send your first message above!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            {Object.entries(groupedMessages).map(([platformId, platformMessages]) => (
                <Card key={platformId}>
                    <CardHeader className="pb-3">
                        <CardTitle>
                            {getPlatformName(platformId)}
                            <span className="text-muted-foreground ml-2 text-xs">(ID: {platformId})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ul className="divide-border divide-y">
                            {platformMessages
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((message) => (
                                    <li key={message.id} className="group p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        {getUserName(message.user_id)}
                                                    </span>
                                                    {String(message.user_id) === String(auth.user.id) && (
                                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-card-foreground">{message.body}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Edit/Delete buttons for user's own messages */}
                                                {String(message.user_id) === String(auth.user.id) && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mr-1.5">
                                                        <UpdateMessageForm
                                                            message={message}
                                                            platforms={platforms}
                                                            platformsLoading={platformsLoading}
                                                            messageActions={messageActions}
                                                        />

                                                        <DeleteMessageForm
                                                            message={message}
                                                            messageActions={messageActions}
                                                        />
                                                    </div>
                                                )}

                                                <div className="text-muted-foreground flex items-center gap-4 text-xs whitespace-nowrap">
                                                    <span>{message.id}</span>
                                                    <span>{formatDate(new Date(message.created_at))}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
