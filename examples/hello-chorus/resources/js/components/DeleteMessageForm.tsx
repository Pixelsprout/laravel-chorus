import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Message } from '@/stores/db';
import { router } from '@inertiajs/react';
import { TrashIcon } from 'lucide-react';
import { useState } from 'react';

interface DeleteMessageFormProps {
    message: Message;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageActions: any;
}

export default function DeleteMessageForm({
    message,
    messageActions
}: DeleteMessageFormProps) {
    const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);

    // Confirm delete message
    const confirmDeleteMessage = () => {
        if (messageActions.delete && deletingMessage) {
            messageActions.delete({ id: deletingMessage.id }, async (data: { id: string }) => {
                router.delete(route('messages.destroy', data.id), {
                    preserveScroll: true,
                });
            });
            setDeletingMessage(null);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeletingMessage(message)}
                    className="h-6 w-6 p-0"
                >
                    <TrashIcon className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Delete Message</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this message? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                {deletingMessage && (
                    <div className="py-4">
                        <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Message to delete:
                            </p>
                            <p className="text-sm">{deletingMessage.body}</p>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            autoFocus
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDeleteMessage}
                        >
                            Delete Message
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
