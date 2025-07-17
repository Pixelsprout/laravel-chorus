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
import { Head, router, usePage } from '@inertiajs/react';
import { ClockIcon, SendIcon } from 'lucide-react';
import { useForm } from '@tanstack/react-form'
import createMessageAction from '@/actions/App/Actions/CreateMessage';
import { uuidv7 } from 'uuidv7';
import type { AnyFieldApi } from '@tanstack/react-form'

function FieldInfo({ field }: { field: AnyFieldApi }) {
    return (
        <>
            {field.state.meta.isTouched && !field.state.meta.isValid ? (
                <em className="text-destructive text-sm">{field.state.meta.errors.join(', ')}</em>
            ) : null}
            {field.state.meta.isValidating ? 'Validating...' : null}
        </>
    )
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const { auth, tenantName } = usePage().props;
    // Sync messages with the server
    const {
        data: messages,
        isLoading: messagesLoading,
        error: messagesError,
        lastUpdate: messagesLastUpdate,
        actions: messageActions
    } = useHarmonics<Message, { platformId: string; message: string; }>('messages', table => {
         return table.where('id').equals('0198157f-61ed-71f8-8819-d902d9894b77')
       }
    );

    // Sync platforms with the server
    const {
        data: platforms,
        isLoading: platformsLoading,
        error: platformsError,
        lastUpdate
        } = useHarmonics<Platform>('platforms');

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

    // Forms
    const createMessageForm = useForm({
        defaultValues: {
            platformId: '', // get first platform
            message: '',
        },
        onSubmit: async ({ value, formApi }) => {
            if (messageActions.create) {
                const now = new Date();
                const optimisticMessage: Message = {
                    id: uuidv7(),
                    body: value.message,
                    platform_id: value.platformId,
                    tenant_id: auth.user.tenant_id,
                    user_id: auth.user.id,
                    created_at: now,
                    updated_at: now,
                };

                messageActions.create(optimisticMessage, async (data: Message) => {
                    // router.post(
                    //     createMessageAction.post().url,
                    //     {
                    //         id: data.id,
                    //         message: data.body,
                    //         platformId: data.platform_id,
                    //     },
                    //     {
                    //         preserveScroll: true,
                    //     }
                    // );

                    // clear form
                    formApi.reset();
                });
            }
        },
    })

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${tenantName}: Messages Dashboard`} />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Hi {auth.user.name}</h1>
                    <h2 className="text-xl font-semibold">{tenantName}: Messages Dashboard</h2>
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
                        <form id="new-message-form" onSubmit={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            createMessageForm.handleSubmit()
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="platform">Platform</Label>
                                <createMessageForm.Field name="platformId"
                                    children={(field) => (
                                        <>
                                            <Select value={field.state.value} name={field.name} onValueChange={(e) => field.handleChange(e)} disabled={platformsLoading}>
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
                                            <FieldInfo field={field} />
                                        </>
                                    )}/>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <createMessageForm.Field
                                    name="message"
                                    validators={{
                                        onChange: ({value}) =>
                                            !value
                                                ? 'A message is required'
                                                : value.length < 3
                                                    ? 'Please enter a message longer than 3 characters'
                                                    : undefined,
                                    }}
                                    children={(field) => (
                                        <>
                                            <Textarea
                                                id="message"
                                                value={field.state.value}
                                                name={field.name}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="Type your message here..."
                                                rows={3}
                                            />
                                        </>
                                        )
                                    }>
                                </createMessageForm.Field>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <createMessageForm.Subscribe
                            selector={(state) => [state.canSubmit, state.isSubmitting]}
                            children={([canSubmit, isSubmitting]) => (
                                <>
                                    <Button
                                        type="submit"
                                        form="new-message-form"
                                        disabled={!canSubmit}
                                    >
                                        <SendIcon className="mr-2 h-4 w-4" />
                                        {isSubmitting ? 'Sending...' : 'Send message'}
                                    </Button>
                                </>
                            )}
                        />
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
                                                            <div className="text-muted-foreground ml-2 flex items-center gap-4 text-xs whitespace-nowrap">
                                                                <span>{message.id}</span>
                                                                <span>{formatDate(new Date(message.created_at))}</span>
                                                            </div>
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
