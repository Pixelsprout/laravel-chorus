import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Message, Platform } from '@/stores/db';

import { router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { SendIcon } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import createMessageAction from '@/actions/App/Actions/CreateMessage';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageActions: any;
}

export default function CreateMessageForm({ 
    platforms, 
    platformsLoading, 
    platformsError, 
    messageActions 
}: CreateMessageFormProps) {
    const { auth } = usePage<SharedData>().props;

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
                    tenant_id: String(auth.user.tenant_id),
                    user_id: String(auth.user.id),
                    created_at: now,
                    updated_at: now,
                };

                messageActions.create(optimisticMessage, async (data: Message) => {
                    router.post(
                        createMessageAction.post().url,
                        {
                            id: data.id,
                            message: data.body,
                            platformId: data.platform_id,
                        },
                        {
                            preserveScroll: true,
                            only: [],
                        }
                    );

                    // clear form
                    formApi.reset();
                });
            }
        },
    });

    return (
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
            <CardFooter className="flex gap-2">
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    // Test rejected harmonic by sending invalid data
                                    if (messageActions.create) {
                                        const now = new Date();
                                        const invalidMessage: Message = {
                                            id: uuidv7(),
                                            body: '', // This will fail validation
                                            platform_id: 'invalid-platform-id', // This will also fail
                                            tenant_id: String(auth.user.tenant_id),
                                            user_id: String(auth.user.id),
                                            created_at: now,
                                            updated_at: now,
                                        };

                                        messageActions.create(invalidMessage, async (data: Message) => {
                                            router.post(
                                                createMessageAction.post().url,
                                                {
                                                    id: data.id,
                                                    message: data.body,
                                                    platformId: data.platform_id,
                                                },
                                                {
                                                    preserveScroll: true,
                                                    only: [],
                                                }
                                            );
                                        });
                                    }
                                }}
                                className="text-xs"
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