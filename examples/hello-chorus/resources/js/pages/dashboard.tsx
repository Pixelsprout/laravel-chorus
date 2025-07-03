// Import from the chorus package
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { Message, Platform } from '@/stores/db';
import { type BreadcrumbItem } from '@/types';
import { useHarmonics } from '@chorus/js';
import { Head } from '@inertiajs/react';
import { ClockIcon, SendIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const [newMessage, setNewMessage] = useState('');
    const [platformId, setPlatformId] = useState<string>('');

    // Sync messages with the server
    const { data: messages, isLoading: messagesLoading, error: messagesError, lastUpdate: messagesLastUpdate } = useHarmonics<Message>('messages');

    // Sync platforms with the server
    const { data: platforms, isLoading: platformsLoading, error: platformsError, lastUpdate } = useHarmonics<Platform>('platforms');

    // Format the date in a readable format
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        }).format(date);
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
            {} as Record<number, Message[]>,
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

    // Handle submitting a new message
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim()) return;

        try {
            // Send the message to the server
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') || '',
                },
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify({
                    body: newMessage,
                    platform_id: platformId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message');
            }

            // Clear the input
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        }
    };

    // Helper function to get cookies
    const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    };

    // Auto-select the first platform when platforms load
    useEffect(() => {
        if (platforms?.length && !platformId) {
            setPlatformId(platforms[0].id);
        }
    }, [platforms, platformId]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Messages Dashboard" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Messages Dashboard</h1>

                    {/* Sync status */}
                    {messagesLastUpdate && (
                        <div className="text-muted-foreground flex items-center text-sm">
                            <ClockIcon className="mr-1 h-3 w-3" />
                            Last synchronized: {messagesLastUpdate.toLocaleTimeString()}
                        </div>
                    )}
                </div>

                {/* New message form */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Send a New Message</CardTitle>
                        <CardDescription>Create a new message that will be synced in real-time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form id="new-message-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="platform">Platform</Label>
                                <Select value={platformId} onValueChange={setPlatformId} disabled={platformsLoading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={platformsLoading ? 'Loading platforms...' : 'Select a platform'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {platformsError ? (
                                            <SelectItem value="error" disabled>
                                                Error loading platforms
                                            </SelectItem>
                                        ) : platforms?.length ? (
                                            platforms.map((platform) => (
                                                <SelectItem key={platform.id} value={platform.id}>
                                                    {platform.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>
                                                No platforms available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows={3}
                                />
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            form="new-message-form"
                            disabled={!newMessage.trim() || !platformId || platformsLoading || platformsError}
                        >
                            <SendIcon className="mr-2 h-4 w-4" />
                            Send Message
                        </Button>
                    </CardFooter>
                </Card>

                {/* Messages list */}
                {messagesLoading || platformsLoading ? (
                    <p className="py-4 text-center">Loading data...</p>
                ) : messagesError ? (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-destructive">Error loading messages: {messagesError}</p>
                        </CardContent>
                    </Card>
                ) : platformsError ? (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-destructive">Error loading platforms: {platformsError}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {Object.keys(groupedMessages).length > 0 ? (
                            Object.entries(groupedMessages).map(([platformId, platformMessages]) => (
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
                                                    <li key={message.id} className="p-4">
                                                        <div className="flex items-start justify-between">
                                                            <p className="text-card-foreground">{message.body}</p>
                                                            <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
                                                                {formatDate(new Date(message.created_at))}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <CardContent className="pt-6 text-center">
                                    <p className="text-muted-foreground">No messages found. Send your first message above!</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
