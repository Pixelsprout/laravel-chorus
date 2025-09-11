// Auto-generated IndexedDB schema for Chorus tables
// Generated on 2025-09-02 19:14:46

export const chorusSchema: Record<string, string> = {
  'users': 'id, name, email, last_activity_at',
  'platforms': 'id, name, last_message_at',
  'messages': 'id, body, user_id, tenant_id, platform_id, created_at, updated_at',
};
