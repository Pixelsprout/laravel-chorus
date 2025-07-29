// Simple component to test offline functionality
import React from 'react';
import { useOffline, OfflineIndicator, OfflineBanner } from '@pixelsprout/chorus-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflineTest() {
  const {
    isOnline,
    pendingRequestsCount,
    processPendingRequests,
    clearPendingRequests
  } = useOffline();

  return (
    <div className="space-y-4">
      <OfflineBanner className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-3 rounded-md" />

      <Card>
        <CardHeader>
          <CardTitle>Offline Status Test</CardTitle>
          <CardDescription>
            Test the offline functionality by going offline in your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              Status: {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Pending requests: {pendingRequestsCount}</p>
            <p>To test offline mode:</p>
            <ol className="list-decimal list-inside ml-4 space-y-1">
              <li>Open browser DevTools (F12)</li>
              <li>Go to Network tab</li>
              <li>Check "Offline" checkbox</li>
              <li>Try creating a message</li>
              <li>Uncheck "Offline" to come back online</li>
            </ol>
          </div>

          {pendingRequestsCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                You have {pendingRequestsCount} pending request{pendingRequestsCount !== 1 ? 's' : ''}
                that will be processed when you come back online.
              </p>

              <div className="flex gap-2">
                {isOnline && (
                  <Button
                    onClick={processPendingRequests}
                    size="sm"
                  >
                    Sync Now
                  </Button>
                )}
                <Button
                  onClick={clearPendingRequests}
                  variant="outline"
                  size="sm"
                >
                  Clear Pending
                </Button>
              </div>
            </div>
          )}

          <OfflineIndicator
            className="flex items-center gap-2 text-sm border rounded p-2"
            showPendingCount={true}
            showRetryButton={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
