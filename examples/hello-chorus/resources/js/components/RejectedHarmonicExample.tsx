import React, { useState } from 'react';
import { ChorusProvider, useHarmonics } from '@pixelsprout/chorus-js/react';
import { HarmonicEvent } from '@pixelsprout/chorus-js';

interface Message {
  id: string;
  body: string;
  platform_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface RejectedNotification {
  id: string;
  message: string;
  timestamp: Date;
}

function MessageList() {
  const [rejectedNotifications, setRejectedNotifications] = useState<RejectedNotification[]>([]);
  const { data: messages, actions } = useHarmonics<Message>('messages');

  const handleCreateMessage = async () => {
    const newMessage = {
      id: crypto.randomUUID(),
      body: '', // This will cause validation to fail
      platform_id: 'invalid-platform-id',
      user_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // This will trigger a rejected harmonic due to validation failure
    actions.create?.(newMessage, async (data) => {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to create message');
        }
      } catch (error) {
        console.error('Failed to create message:', error);
      }
    });
  };

  const handleRejectedHarmonic = (harmonic: HarmonicEvent) => {
    console.log('Received rejected harmonic:', harmonic);
    
    // Add a notification to show the user
    const notification: RejectedNotification = {
      id: harmonic.id,
      message: `Failed to ${harmonic.operation}: ${harmonic.rejected_reason}`,
      timestamp: new Date(),
    };

    setRejectedNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setRejectedNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const dismissNotification = (id: string) => {
    setRejectedNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Messages</h2>
        <button
          onClick={handleCreateMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Invalid Message (Will be Rejected)
        </button>
      </div>

      {/* Rejected Notifications */}
      {rejectedNotifications.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-red-600">Rejected Operations</h3>
          {rejectedNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-2 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{notification.message}</p>
                <p className="text-sm text-red-600">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages List */}
      <div className="space-y-2">
        {messages?.map((message) => (
          <div key={message.id} className="bg-gray-100 p-4 rounded">
            <p className="font-medium">{message.body}</p>
            <p className="text-sm text-gray-600">
              Platform: {message.platform_id} | User: {message.user_id}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(message.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RejectedHarmonicExample() {
  const [rejectedNotifications, setRejectedNotifications] = useState<RejectedNotification[]>([]);

  const handleRejectedHarmonic = (harmonic: HarmonicEvent) => {
    console.log('Received rejected harmonic:', harmonic);
    
    // Add a notification to show the user
    const notification: RejectedNotification = {
      id: harmonic.id,
      message: `Failed to ${harmonic.operation}: ${harmonic.rejected_reason}`,
      timestamp: new Date(),
    };

    setRejectedNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setRejectedNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  return (
    <ChorusProvider
      userId={1}
      schema={{
        messages: '++id, body, platform_id, user_id, created_at, updated_at',
        platforms: '++id, name, created_at, updated_at',
      }}
      onRejectedHarmonic={handleRejectedHarmonic}
    >
      <MessageList />
    </ChorusProvider>
  );
}