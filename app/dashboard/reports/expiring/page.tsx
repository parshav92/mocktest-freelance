import { redirect } from "next/navigation";

export default function ExpiringSubscriptionsPage() {
    redirect("/dashboard/reports/subscribers?tab=expiring");
}
