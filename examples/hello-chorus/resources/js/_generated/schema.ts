// Auto-generated IndexedDB schema for Chorus tables
// Generated on 2025-06-17 04:50:21

export const chorusSchema: Record<string, string> = {
  'users': 'id, name, email',
  'platforms': 'id, name',
  'messages': 'id, body, user_id, platform_id, created_at, updated_at',
};
