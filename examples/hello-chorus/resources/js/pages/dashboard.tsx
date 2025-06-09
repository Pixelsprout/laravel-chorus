import { db } from '@/stores/db';
import { useHarmonics } from '@/chorus/use-harmonics';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

// Define User interface to use with generic hook
interface User {
    id: number;
    name: string;
    email: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const { data: users, isLoading, error, lastUpdate } = useHarmonics<User>('users', db);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="p-6">
                {isLoading ? (
                    <p>Loading users...</p>
                ) : error ? (
                    <p>Error: {error}</p>
                ) : (
                    <>
                        {lastUpdate && <div className="mb-4 text-sm text-gray-500">Last synchronized: {lastUpdate.toLocaleTimeString()}</div>}
                        <ul className="space-y-2">
                            {users?.length ? (
                                users.map((user) => (
                                    <li key={user.id} className="rounded-md border p-2">
                                        <strong>ID: {user.id}</strong> - {user.name} - {user.email}
                                    </li>
                                ))
                            ) : (
                                <p>No users found</p>
                            )}
                        </ul>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
