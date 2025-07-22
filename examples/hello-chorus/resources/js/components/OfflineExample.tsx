// Example component demonstrating offline functionality
import React from 'react';
import { useOffline, OfflineIndicator, OfflineBanner } from '@chorus/js/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflineExample() {
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
          <CardTitle>Offline Status</CardTitle>
          <CardDescription>
            Monitor your connection status and pending offline requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {pendingRequestsCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
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
            className="flex items-center gap-2 text-sm"
            showPendingCount={true}
            showRetryButton={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}