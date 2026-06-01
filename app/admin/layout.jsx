
'use client';
import AdminLayout from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function RootAdminLayout({ children }) {
    const [user, setUser] = useState(undefined);
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
            const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').replace(/['\"]/g, '').split(',');
            setIsAdmin(u && adminEmails.includes(u.email));
        });
        return () => unsubscribe();
    }, []);
    // If on /admin/sign-in, always render children (sign-in page)
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/sign-in')) {
        return children;
    }
    // If not logged in or not admin, render children (login prompt or unauthorized)
    if (!user || !isAdmin) {
        return children;
    }
    // If authenticated admin, show full admin layout
    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}
