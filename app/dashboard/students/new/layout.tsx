import { requireParentAccess } from "@/lib/auth/rbac";
import { ReactNode } from "react";

/** Parent-only: create student under a subscription. */
export default async function NewStudentLayout({
    children,
}: {
    children: ReactNode;
}) {
    await requireParentAccess();

    return <>{children}</>;
}
