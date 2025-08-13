// Auto-generated TypeScript interfaces for Chorus models
// Generated on 2025-08-13 22:21:17

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Platform {
  id: string;
  name: string;
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

