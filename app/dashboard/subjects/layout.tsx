import { requireAdminAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

/**
 * Layout for admin subjects management
 * Provides server-side RBAC protection for client components.
 */
export default async function SubjectsLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Validates admin role + MFA - redirects if unauthorized
    await requireAdminAccess();

    return <>{children}</>;
}
