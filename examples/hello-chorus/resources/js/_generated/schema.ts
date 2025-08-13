// Auto-generated IndexedDB schema for Chorus tables
// Generated on 2025-08-13 22:21:17

export const chorusSchema: Record<string, string> = {
  'users': 'id, name, email',
  'platforms': 'id, name',
  'messages': 'id, body, user_id, tenant_id, platform_id, created_at, updated_at',
};
