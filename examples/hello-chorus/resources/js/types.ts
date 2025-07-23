// types.ts

interface User {
    id: number;
    name: string;
    email: string;
    created_at: Date;
}

interface Message {
    id: string;
    body: string;
    user_id: string;
    platform_id: string|number; // UUID from Platform Model
    tenant_id: string|number;
    created_at: Date;
    updated_at: Date;
}

interface Platform {
    id: string; // UUID from the database
    name: string;
}

export type { User, Message, Platform };
