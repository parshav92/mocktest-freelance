import { requireParentAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

/**
 * Layout for parent-only routes: /dashboard/subscribe
 * Ensures only authenticated parents can access subscription pages.
 */
export default async function SubscribeLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Validates parent role - redirects if unauthorized
    await requireParentAccess();

    return <>{children}</>;
}
