// db.ts
import { ChorusDatabase, createChorusDb } from '@/chorus';

interface User {
    id: number;
    name: string;
    email: string;
    created_at: Date;
}

const db = createChorusDb('ChorusDatabase') as ChorusDatabase & {
    users: Dexie.Table<
        User,
        'id' // primary key
    >;
};

db.initializeSchema({
    users: '++id,name,email,created_at',
});

export { db };