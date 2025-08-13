import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Platform } from '@/_generated/types';
import { createMessageWithActivityAction } from '@/_generated/chorus-actions';

import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { SendIcon, WifiOffIcon } from 'lucide-react';
import { useOffline } from '@pixelsprout/chorus-js';
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

    // Forms
    const createMessageForm = useForm({
        defaultValues: {
            platformId: '', // get first platform
            message: '',
        },
        onSubmit: async ({ value, formApi }) => {
            try {
                const messageId = uuidv7();

                // Execute the new ChorusAction with callback-style API
                const result = await createMessageWithActivityAction((writes) => {
                    // Create the message
                    writes.messages.create({
                        id: messageId,
                        body: value.message,
                        platform_id: value.platformId,
                        user_id: auth.user.id,
                        tenant_id: auth.user.tenant_id,
                    });

                    // Update user's last activity (handled automatically by the action)
                    writes.users.update({
                        id: auth.user.id,
                        last_activity_at: new Date().toISOString(),
                    });

                    // Update platform metrics (handled automatically by the action)
                    writes.platforms.update({
                        id: value.platformId,
                        last_message_at: new Date().toISOString(),
                    });
                });

                if (result.success) {
                    // Clear form on success
                    formApi.reset();
                    console.log('Message created successfully:', result);
                } else {
                    console.error('Message creation failed:', result.error);
                }
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

                                        // Execute the ChorusAction with invalid data to test rejection
                                        const result = await createMessageWithActivityAction((writes) => {
                                            writes.messages.create({
                                                id: invalidMessageId,
                                                body: '', // This will fail validation (empty message)
                                                platform_id: 'invalid-platform-id', // This will also fail
                                                user_id: auth.user.id,
                                                tenant_id: auth.user.tenant_id,
                                            });
                                        });

                                        console.log('Test rejection result:', result);
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
