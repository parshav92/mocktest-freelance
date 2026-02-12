import { requireAdminAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

/**
 * Layout for admin-only routes: /dashboard/subscriptions/*
 * Provides server-side RBAC protection.
 */
export default async function SubscriptionsLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Validates admin role + MFA - redirects if unauthorized
    await requireAdminAccess();

    return <>{children}</>;
}
