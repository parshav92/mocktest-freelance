"use client";

import Link from "next/link";
import { useState, ReactNode } from "react";
import {
    Upload,
    FileText,
    BookOpen,
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    Users,
    CreditCard,
    ClipboardList,
    Library,
    BarChart2,
    AlertCircle,
    Trophy,
    Activity,
    Settings2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

interface AdminLayoutClientProps {
    children: ReactNode;
    user: {
        id: string;
        fullName: string;
    };
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const handleSignOut = async () => {
        const supabase = createClient();

        // Reset MFA expiry to invalidate session
        const now = new Date().toISOString();
        await supabase
            .from("admin_mfa_sessions")
            .update({
                mfa_expires_at: now,
            })
            .eq("admin_id", user.id);

        await supabase.auth.signOut();
        router.push("/admin-login");
        router.refresh();
    };

    const navItems = [
        {
            href: "/dashboard",
            icon: LayoutDashboard,
            label: "Dashboard",
        },
        {
            href: "/dashboard/upload",
            icon: Upload,
            label: "Upload Questions",
        },
        {
            href: "/dashboard/questions",
            icon: FileText,
            label: "Manage Questions",
        },
        {
            href: "/dashboard/passage",
            icon: BookOpen,
            label: "Manage Passages",
        },
        {
            href: "/dashboard/custom-tests",
            icon: ClipboardList,
            label: "Custom Tests",
        },
        {
            href: "/dashboard/subjects",
            icon: Library,
            label: "Manage Subjects",
        },
        {
            href: "/dashboard/subscriptions",
            icon: CreditCard,
            label: "Subscriptions",
        },
        {
            href: "/dashboard/plans",
            icon: Settings2,
            label: "Plan rules",
        },
        {
            href: "/dashboard/users",
            icon: Users,
            label: "Manage Users (TBD)",
        },
        // ── Reports ──────────────────────────────────────────────────────
        {
            href: "/dashboard/reports/subscribers",
            icon: BarChart2,
            label: "Subscriber Report",
        },
        {
            href: "/dashboard/reports/expiring",
            icon: AlertCircle,
            label: "Expiring Soon",
        },
        {
            href: "/dashboard/reports/top-students",
            icon: Trophy,
            label: "Top Students",
        },
        {
            href: "/dashboard/reports/test-activity",
            icon: Activity,
            label: "Test Activity",
        },
    ];

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen flex">
            {/* Mobile Menu Button - Only show when sidebar is closed */}
            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
            )}

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:sticky inset-y-0 left-0 z-40 top-0
          w-72 lg:w-64 bg-slate-900 text-white
          flex flex-col h-screen
          transition-transform duration-300 ease-in-out
          shadow-2xl lg:shadow-none
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
            >
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold truncate">
                                MockTest Admin
                            </h1>
                            <p className="text-slate-400 text-sm mt-1 truncate">
                                {user.fullName}
                            </p>
                        </div>
                        {/* Close button for mobile */}
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden p-1.5 rounded-md hover:bg-slate-800 transition-colors ml-2 flex-shrink-0"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                                    active
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                                <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 mt-auto">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white group"
                    >
                        <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 bg-slate-50 overflow-auto min-h-screen">
                {children}
            </main>
        </div>
    );
}
