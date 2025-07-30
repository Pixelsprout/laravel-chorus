import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { useTable } from '@pixelsprout/chorus-js';
import { User } from '@/_generated/types';



const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {

    const { data: users, isLoading: usersLoading } = useTable<User>('users');

    console.log("USERSS: ", users);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chorus Users" />

            <div className={'container mx-auto py-12'}>
                <Card title={'Chorus Users'}>

                    <ul className="divide-border divide-y">
                        { usersLoading
                            ? (
                                <li>Loading....</li>
                            )
                            : users?.map(user => (
                            <li key={user.id} className={'ml-2'}>
                                { user.name }
                            </li>
                        )) }
                    </ul>
                </Card>
            </div>

        </AppLayout>
    );
}
