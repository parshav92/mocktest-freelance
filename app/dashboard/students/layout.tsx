import { requireParentOrAdminAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

/**
 * Layout for /dashboard/students/* — parents and admins (e.g. student reports).
 * Parent-only routes (e.g. /new) use nested layouts with requireParentAccess.
 */
export default async function StudentsLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requireParentOrAdminAccess();

    return <>{children}</>;
}
