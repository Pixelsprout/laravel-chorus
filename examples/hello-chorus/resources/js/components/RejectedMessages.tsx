import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRejectedHarmonics } from '@/contexts/RejectedHarmonicsContext';
import { useEffect } from 'react';

export default function RejectedMessages() {
    const { notifications: rejectedNotifications, clearAllNotifications } = useRejectedHarmonics();

    // Only log when notifications change (for debugging)
    useEffect(() => {
        if (rejectedNotifications.length > 0) {
            console.log('RejectedMessages - New rejected notifications:', rejectedNotifications.length);
        }
    }, [rejectedNotifications.length]);

    if (rejectedNotifications.length === 0) {
        return null;
    }

    return (
        <Card className="mb-6 border-destructive-foreground">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-destructive-foreground">Failed Operations ({rejectedNotifications.length})</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllNotifications}
                        className="text-xs"
                    >
                        Clear All
                    </Button>
                </div>
                <CardDescription>
                    These operations failed due to validation or permission issues.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ul className="divide-border divide-y">
                    {rejectedNotifications.slice(0, 5).map((notification) => (
                        <li key={notification.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-destructive-foreground">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {notification.timestamp.toLocaleString()} • Type: {notification.type}
                                    </p>
                                    {notification.harmonic.data && (
                                        <details className="mt-2">
                                            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                                Show original data
                                            </summary>
                                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                                {JSON.stringify(
                                                    notification.harmonic.data
                                                        ? (typeof notification.harmonic.data === 'string'
                                                            ? JSON.parse(notification.harmonic.data)
                                                            : notification.harmonic.data)
                                                        : {},
                                                    null,
                                                    2
                                                )}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}