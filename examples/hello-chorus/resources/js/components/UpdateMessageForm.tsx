import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Message, Platform } from '@/stores/db';
import { router } from '@inertiajs/react';
import { EditIcon } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import type { AnyFieldApi } from '@tanstack/react-form';
import { useEffect, useState } from 'react';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageActions: any;
}

export default function UpdateMessageForm({ 
    message, 
    platforms, 
    platformsLoading, 
    messageActions 
}: UpdateMessageFormProps) {
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Edit message form
    const editMessageForm = useForm({
        defaultValues: {
            platformId: editingMessage ? String(editingMessage.platform_id) : '',
            message: editingMessage?.body || '',
        },
        onSubmit: async ({ value, formApi }) => {
            if (messageActions.update && editingMessage) {
                const updatedMessage: Message = {
                    ...editingMessage,
                    body: value.message,
                    platform_id: value.platformId,
                    updated_at: new Date(),
                };

                messageActions.update(updatedMessage, async (data: Message) => {
                    router.put(
                        route('messages.update', data.id),
                        {
                            message: data.body,
                            platformId: data.platform_id,
                        },
                        {
                            preserveScroll: true,
                        }
                    );

                    // Reset form, clear editing message, and close modal
                    setEditingMessage(null);
                    formApi.reset();
                    setIsOpen(false);
                });
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
                                        !value ? 'Message is required' : undefined,
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
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}