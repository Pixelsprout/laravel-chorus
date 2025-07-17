// db.ts
import { ChorusDatabase, createChorusDb } from '@/chorus';
import Dexie from 'dexie';

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
    platform_id: string|number; // UUID from Platform model
    tenant_id: string|number;
    created_at: Date;
    updated_at: Date;
}

interface Platform {
    id: string; // UUID from the database
    name: string;
}

const db = createChorusDb('ChorusDatabase') as ChorusDatabase & {
    users: Dexie.Table<User, 'id'>;
    messages: Dexie.Table<Message, 'id'>;
    platforms: Dexie.Table<Platform, 'id'>;
};

db.initializeSchema({
    users: '++id,name,email,created_at',
    messages: 'id,body,user_id,platform_id,created_at,updated_at',
    platforms: 'id,name',
});

export { db };
export type { User, Message, Platform };
