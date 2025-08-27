import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Message, Platform } from '@/_generated/types';
import { updateMessageAction } from '@/_generated/chorus-actions';
import { EditIcon } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import type { AnyFieldApi } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

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

interface UpdateMessageFormProps {
    message: Message;
    platforms: Platform[] | undefined;
    platformsLoading: boolean;
}

export default function UpdateMessageForm({
    message,
    platforms,
    platformsLoading
}: UpdateMessageFormProps) {
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const { auth } = usePage<SharedData>().props;

    // Edit message form
    const editMessageForm = useForm({
        defaultValues: {
            platformId: editingMessage ? String(editingMessage.platform_id) : '',
            message: editingMessage?.body || '',
        },
        onSubmit: async ({ value, formApi }) => {
            if (!editingMessage) return;

            try {
                // Use new simplified ChorusAction API
                const result = await updateMessageAction(({ update }) => {
                    // Update the message
                    update('messages', {
                        id: editingMessage.id,
                        body: value.message,
                    });

                    // Update user's last activity
                    update('users', {
                        id: auth.user.id.toString(),
                        last_activity_at: new Date().toISOString(),
                    });

                    return {
                        test_item: 'test message update',
                    };
                });

                if (result.success) {
                    // Reset form, clear editing message, and close modal
                    setEditingMessage(null);
                    formApi.reset();
                    setIsOpen(false);
                    console.log('Message updated successfully:', result);
                } else {
                    console.error('Message update failed:', result.error);
                }
            } catch (err) {
                console.error('Error updating message:', err);
            }
        },
    });

    // Update edit form when editing message changes
    useEffect(() => {
        if (editingMessage) {
            editMessageForm.setFieldValue('platformId', String(editingMessage.platform_id));
            editMessageForm.setFieldValue('message', editingMessage.body);
        }
    }, [editingMessage, editMessageForm]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                        setEditingMessage(message);
                        setIsOpen(true);
                    }}
                    className="h-6 w-6 p-0"
                >
                    <EditIcon className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Message</DialogTitle>
                    <DialogDescription>
                        Make changes to your message here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        editMessageForm.handleSubmit();
                    }}
                >
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <editMessageForm.Field
                                name="platformId"
                                validators={{
                                    onChange: ({ value }) =>
                                        !value ? 'Platform is required' : undefined,
                                }}
                                children={(field) => (
                                    <>
                                        <Label htmlFor={field.name}>Platform</Label>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(value) => field.handleChange(value)}
                                            disabled={platformsLoading}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a platform" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {platforms?.map((platform) => (
                                                    <SelectItem key={platform.id} value={platform.id}>
                                                        {platform.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldInfo field={field} />
                                    </>
                                )}
                            />
                        </div>
                        <div className="grid gap-2">
                            <editMessageForm.Field
                                name="message"
                                validators={{
                                    onChange: ({ value }) =>
                                        !value 
                                            ? 'Message is required' 
                                            : value.length > 1000 
                                                ? 'Message may not be greater than 1000 characters'
                                                : value.length < 3
                                                    ? 'Please enter a message longer than 3 characters'
                                                    : undefined,
                                }}
                                children={(field) => (
                                    <>
                                        <Label htmlFor={field.name}>Message</Label>
                                        <Textarea
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="What's on your mind?"
                                            rows={3}
                                        />
                                        <FieldInfo field={field} />
                                    </>
                                )}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditingMessage(null);
                                    setIsOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <editMessageForm.Subscribe
                            selector={(state) => [state.isSubmitting]}
                            children={([isSubmitting]) => (
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </Button>
                            )}
                        />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
