import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Upload, FileText, BookOpen, LayoutDashboard, LogOut } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold">MockTest Admin</h1>
          <p className="text-slate-400 text-sm">{profile.full_name}</p>
        </div>

        <nav className="space-y-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link
            href="/admin/upload"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Upload Questions
          </Link>
          <Link
            href="/admin/questions"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <FileText className="h-5 w-5" />
            Manage Questions
          </Link>
          <Link
            href="/admin/passages"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <BookOpen className="h-5 w-5" />
            Manage Passages
          </Link>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 px-4 py-2 w-full rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 overflow-auto">{children}</main>
    </div>
  );
}
