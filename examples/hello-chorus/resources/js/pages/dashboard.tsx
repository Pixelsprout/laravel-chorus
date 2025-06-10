import { db } from '@/stores/db';
import { useHarmonics } from '@/chorus/use-harmonics';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Message, Platform } from '@/stores/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClockIcon, SendIcon } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const [newMessage, setNewMessage] = useState('');
    const [platformId, setPlatformId] = useState<string>("1");
    
    // Sync messages with the server
    const { 
        data: messages, 
        isLoading: messagesLoading, 
        error: messagesError, 
        lastUpdate 
    } = useHarmonics<Message>('messages', db);
    
    // Get platforms (no need for real-time sync as they don't change often)
    const platforms = useLiveQuery(() => db.table<Platform>('platforms').toArray());
    
    // Format the date in a readable format
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    };
    
    // Group messages by platform
    const groupedMessages = messages?.reduce((acc, message) => {
        const platformId = message.platform_id;
        if (!acc[platformId]) {
            acc[platformId] = [];
        }
        acc[platformId].push(message);
        return acc;
    }, {} as Record<number, Message[]>) || {};
    
    // Get platform name by ID
    const getPlatformName = (platformId: number) => {
        return platforms?.find(platform => platform.id === platformId)?.name || 'Unknown';
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
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') || ''
                },
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify({
                    body: newMessage,
                    platform_id: parseInt(platformId)
                })
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
    
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Messages Dashboard" />
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Messages Dashboard</h1>
                    
                    {/* Sync status */}
                    {lastUpdate && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <ClockIcon className="mr-1 h-3 w-3" />
                            Last synchronized: {lastUpdate.toLocaleTimeString()}
                        </div>
                    )}
                </div>
                
                {/* New message form */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Send a New Message</CardTitle>
                        <CardDescription>
                            Create a new message that will be synced in real-time
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form id="new-message-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="platform">Platform</Label>
                                <Select 
                                    value={platformId} 
                                    onValueChange={setPlatformId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {platforms?.map((platform) => (
                                            <SelectItem key={platform.id} value={platform.id.toString()}>
                                                {platform.name}
                                            </SelectItem>
                                        ))}
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
                            disabled={!newMessage.trim()}
                        >
                            <SendIcon className="mr-2 h-4 w-4" />
                            Send Message
                        </Button>
                    </CardFooter>
                </Card>
                
                {/* Messages list */}
                {messagesLoading ? (
                    <p className="text-center py-4">Loading messages...</p>
                ) : messagesError ? (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-destructive">Error: {messagesError}</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {Object.keys(groupedMessages).length > 0 ? (
                            Object.entries(groupedMessages).map(([platformId, platformMessages]) => (
                                <Card key={platformId}>
                                    <CardHeader className="pb-3">
                                        <CardTitle>{getPlatformName(Number(platformId))}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <ul className="divide-y divide-border">
                                            {platformMessages
                                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                .map((message) => (
                                                    <li key={message.id} className="p-4">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-card-foreground">{message.body}</p>
                                                            <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
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
