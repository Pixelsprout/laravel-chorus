import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useTable } from '@pixelsprout/chorus-js';
import { User } from '@/_generated/types';
import { ColumnDef } from "@tanstack/react-table"
import {DataTable} from '@/components/data-table';
import { ChorusLogo } from '@/components/chorus-logo';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export const columns: ColumnDef<User>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "id",
        header: "ID",
    },
]


export default function Dashboard() {

    const { data: users } = useTable<User>('users');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chorus Users" />
            <div className="container mx-auto p-4">
                <ChorusLogo className="container mx-auto mb-12" />

                <p className="text-muted-foreground text-xl text-balance text-center">
                  This example shows you how you can consume synced data.<br />To learn more visit these <a className="text-cyan-300 hover:text-cyan-500 font-semibold duration-200" target="_blank" href="https://chorus.pixelsprout.dev">Docs</a>.
                </p>
                { users && users?.length > 0 && (
                    <div className="container mx-auto py-10">
                        <DataTable columns={columns} data={users} />
                    </div>
                )
                }
            </div>
        </AppLayout>
    );
}
