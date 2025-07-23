import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Message } from '@/types';
import { TrashIcon } from 'lucide-react';
import { useState } from 'react';
import { useTable } from '@chorus/js';

interface DeleteMessageFormProps {
    message: Message;
}

export default function DeleteMessageForm({
    message
}: DeleteMessageFormProps) {
    const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { delete: deleteMessage } = useTable<Message>('messages');

    // Confirm delete message
    const confirmDeleteMessage = async () => {
        if (!deletingMessage) return;

        try {
            setIsDeleting(true);

            // Use unified API: optimistic data, server data, callback
            await deleteMessage(
                { id: deletingMessage.id }, // Optimistic data for immediate UI update
                { id: deletingMessage.id }, // Server data
                (result) => {               // Server response callback
                    if (result.success) {
                        setDeletingMessage(null);
                        setIsOpen(false);
                        console.log('Message deleted successfully:', result.data);
                    } else {
                        console.error('Message deletion failed:', result.error);
                    }
                    setIsDeleting(false);
                }
            );
        } catch (err) {
            console.error('Error deleting message:', err);
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                        setDeletingMessage(message);
                        setIsOpen(true);
                    }}
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
                            disabled={isDeleting}
                            onClick={() => {
                                setDeletingMessage(null);
                                setIsOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={confirmDeleteMessage}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Message'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
