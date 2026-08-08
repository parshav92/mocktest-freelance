import { requireAdminAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

export default async function PlansLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requireAdminAccess();
    return <>{children}</>;
}
