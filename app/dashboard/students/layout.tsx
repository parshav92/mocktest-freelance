import { requireParentAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

/**
 * Layout for parent-only routes: /dashboard/students/*
 * Ensures only authenticated parents can manage students.
 */
export default async function StudentsLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Validates parent role - redirects if unauthorized
    await requireParentAccess();

    return <>{children}</>;
}
