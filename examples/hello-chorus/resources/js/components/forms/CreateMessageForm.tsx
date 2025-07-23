import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Message, Platform } from '@/types';

import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { SendIcon, WifiOffIcon } from 'lucide-react';
import { useOffline, useTable } from '@chorus/js';
import { useForm } from '@tanstack/react-form';
import { uuidv7 } from 'uuidv7';
import type { AnyFieldApi } from '@tanstack/react-form';

function FieldInfo({ field }: { field: AnyFieldApi }) {
    return (
        <>
            {field.state.meta.isTouched && !field.state.meta.isValid ? (
                <em className="text-destructive text-sm">{field.state.meta.errors.join(', ')}</em>
            ) : null}
            {field.state.meta.isValidating ? 'Validating...' : null}
        </>
    );
}

interface CreateMessageFormProps {
    platforms: Platform[] | undefined;
    platformsLoading: boolean;
    platformsError: string | null;
}

export default function CreateMessageForm({
    platforms,
    platformsLoading,
    platformsError,
}: CreateMessageFormProps) {
    const { auth } = usePage<SharedData>().props;
    const { isOnline } = useOffline();
    
    // Get both data and actions from the combined hook
    const { create: createMessage } = useTable<Message>('messages');

    // Forms
    const createMessageForm = useForm({
        defaultValues: {
            platformId: '', // get first platform
            message: '',
        },
        onSubmit: async ({ value, formApi }) => {
            try {
                const messageId = uuidv7();
                const now = new Date();

                // Execute the write action using the unified API (optimistic + server)
                await createMessage(
                    {                  // Optimistic data for immediate UI update
                        id: messageId,
                        body: value.message,
                        platform_id: value.platformId,
                        tenant_id: String(auth.user.tenant_id),
                        user_id: String(auth.user.id),
                        created_at: now,
                        updated_at: now,
                    },
                    {                  // Server data
                        id: messageId,
                        message: value.message,
                        platformId: value.platformId,
                    },
                    (result) => {      // Callback for server response
                        if (result.success) {
                            // Clear form on success
                            formApi.reset();
                            console.log('Message created successfully:', result.data);
                        } else {
                            console.error('Message creation failed:', result.error);
                        }
                    }
                );
            } catch (err) {
                console.error('Error creating message:', err);
            }
        },
    });

    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Send a New Message
                    {!isOnline && <WifiOffIcon className="h-4 w-4 text-orange-500" />}
                </CardTitle>
                <CardDescription>
                    Create a new message that will be synced in real-time
                    {!isOnline && (
                        <span className="block text-orange-600 mt-1">
                            You're offline. Messages will be sent when you reconnect.
                        </span>
                    )}
                </CardDescription>
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
            <CardFooter className="flex gap-2">
                <createMessageForm.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                    children={([canSubmit, isSubmitting]) => (
                        <>
                            <Button
                                type="submit"
                                form="new-message-form"
                                disabled={!canSubmit}
                                className={!isOnline ? 'bg-orange-600 hover:bg-orange-700' : ''}
                            >
                                {!isOnline ? (
                                    <WifiOffIcon className="mr-2 h-4 w-4" />
                                ) : (
                                    <SendIcon className="mr-2 h-4 w-4" />
                                )}
                                {isSubmitting
                                    ? 'Sending...'
                                    : !isOnline
                                        ? 'Queue message'
                                        : 'Send message'
                                }
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                    // Test rejected harmonic by sending invalid data
                                    try {
                                        const invalidMessageId = uuidv7();
                                        const now = new Date();

                                        // Create optimistic message for immediate UI update
                                        const invalidMessage: Message = {
                                            id: invalidMessageId,
                                            body: '', // This will fail validation
                                            platform_id: 'invalid-platform-id', // This will also fail
                                            tenant_id: String(auth.user.tenant_id),
                                            user_id: String(auth.user.id),
                                            created_at: now,
                                            updated_at: now,
                                        };

                                        // Execute the write action with invalid data using unified API
                                        await createMessage(
                                            invalidMessage, // Optimistic data
                                            {               // Server data (invalid)
                                                id: invalidMessageId,
                                                message: '', // This will fail validation
                                                platformId: 'invalid-platform-id', // This will also fail
                                            },
                                            (result) => {   // Callback
                                                console.log('Test rejection result:', result);
                                            }
                                        );
                                    } catch (err) {
                                        console.error('Test rejection error:', err);
                                    }
                                }}
                                className="text-xs"
                                disabled={isSubmitting}
                            >
                                Test Rejection
                            </Button>
                        </>
                    )}
                />
            </CardFooter>
        </Card>
    );
}
