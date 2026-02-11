"use client";

import Link from "next/link";
import {
    Upload,
    FileText,
    BookOpen,
    LayoutDashboard,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";

export default function AdminLayout({
    children,
    profile,
}: {
    children: React.ReactNode;
    profile: { role: string; full_name: string };
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
                                {profile.full_name}
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

                <nav className="flex-1 p-4 space-y-1">
                    <Link
                        href="/admin"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-all text-slate-300 hover:text-white group"
                    >
                        <LayoutDashboard className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        href="/admin/upload"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-all text-slate-300 hover:text-white group"
                    >
                        <Upload className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <span>Upload Questions</span>
                    </Link>
                    <Link
                        href="/admin/questions"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-all text-slate-300 hover:text-white group"
                    >
                        <FileText className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <span>Manage Questions</span>
                    </Link>
                    <Link
                        href="/admin/passages"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-all text-slate-300 hover:text-white group"
                    >
                        <BookOpen className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <span>Manage Passages</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800 mt-auto">
                    <form action="/api/admin/signout" method="POST">
                        <button
                            type="submit"
                            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white group"
                        >
                            <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                            <span>Sign Out</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-slate-50 overflow-auto min-h-screen">
                {children}
            </main>
        </div>
    );
}
