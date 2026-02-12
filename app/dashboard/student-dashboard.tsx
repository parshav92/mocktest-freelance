"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, GraduationCap, BookOpen, BarChart3 } from "lucide-react";

interface StudentUser {
  id: string;
  studentCode: string;
  fullName: string;
  isReadOnly: boolean;
}

interface StudentDashboardProps {
  user: StudentUser;
}

export function StudentDashboard({ user }: StudentDashboardProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/student/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-neutral-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">
                Student • {user.studentCode}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          Welcome back, {user.fullName.split(" ")[0]}!
        </h1>

        {/* Read-only banner for students in grace period */}
        {user.isReadOnly && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Read-only mode:</strong> Your subscription has expired. You can view your scores but cannot take new tests. Please contact your parent to renew.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Mock Tests Card */}
          <Card
            className={`hover:shadow-lg transition-shadow cursor-pointer`}
            onClick={() => router.push("/dashboard/tests")}
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Practice Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {user.isReadOnly
                  ? "View your previous tests"
                  : "Take practice tests and quizzes"}
              </p>
            </CardContent>
          </Card>

          {/* Scores Card */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/dashboard/tests?status=submitted")}
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>My Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View your test history and performance
              </p>
            </CardContent>
          </Card>

          {/* Study Material Card */}
          <Card
            className={`hover:shadow-lg transition-shadow ${
              user.isReadOnly ? "opacity-60" : "cursor-pointer"
            }`}
          >
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Study Material</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {user.isReadOnly
                  ? "Subscription required to access"
                  : "Coming soon"}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
