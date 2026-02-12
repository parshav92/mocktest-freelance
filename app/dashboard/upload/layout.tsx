import { requireAdminAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

/**
 * Layout for admin-only routes: /dashboard/upload, etc.
 * Provides server-side RBAC protection for client components.
 */
export default async function UploadLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Validates admin role + MFA - redirects if unauthorized
    await requireAdminAccess();

    return <>{children}</>;
}
