// Auto-generated TypeScript interfaces for Chorus models
// Generated on 2025-08-28 05:38:32

export interface User {
  id: string;
  name: string;
  email: string;
  last_activity_at: string;
}

export interface Platform {
  id: string;
  name: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  body: string;
  user_id: string;
  tenant_id: string;
  platform_id: string;
  created_at: string;
  updated_at: string;
}

