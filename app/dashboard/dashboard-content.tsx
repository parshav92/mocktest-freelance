"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, GraduationCap, Users, Shield, BookOpen, BarChart3 } from "lucide-react";

interface ParentUser {
  id: string;
  email: string;
  fullName: string;
  role: "parent" | "admin";
}

interface StudentUser {
  id: string;
  studentCode: string;
  fullName: string;
  isReadOnly: boolean;
}

interface DashboardContentProps {
  userType: "parent" | "student";
  user: ParentUser | StudentUser;
}

export function DashboardContent({ userType, user }: DashboardContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    if (userType === "student") {
      await fetch("/api/auth/student/logout", { method: "POST" });
    } else {
      await supabase.auth.signOut();
    }
    router.push("/auth");
    router.refresh();
  };

  const isParent = userType === "parent";
  const parentUser = user as ParentUser;
  const studentUser = user as StudentUser;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-neutral-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isParent ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
              {isParent ? (
                parentUser.role === "admin" ? (
                  <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                )
              ) : (
                <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <p className="font-semibold">{isParent ? parentUser.fullName : studentUser.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {isParent ? (
                  parentUser.role === "admin" ? "Administrator" : "Parent"
                ) : (
                  <>Student • {studentUser.studentCode}</>
                )}
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
          Welcome back, {isParent ? parentUser.fullName.split(" ")[0] : studentUser.fullName.split(" ")[0]}!
        </h1>

        {/* Read-only banner for students in grace period */}
        {!isParent && studentUser.isReadOnly && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Read-only mode:</strong> Your subscription has expired. You can view your scores but cannot take new tests. Please contact your parent to renew.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isParent ? (
            // Parent Dashboard Cards
            <>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>My Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Manage student profiles and view their progress</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">View detailed test results and analytics</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle>Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Manage your subscription and billing</p>
                </CardContent>
              </Card>
            </>
          ) : (
            // Student Dashboard Cards
            <>
              <Card className={`hover:shadow-lg transition-shadow ${studentUser.isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>Mock Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {studentUser.isReadOnly ? "Subscription required to take tests" : "Take practice tests and quizzes"}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>My Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">View your test history and performance</p>
                </CardContent>
              </Card>

              <Card className={`hover:shadow-lg transition-shadow ${studentUser.isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle>Study Material</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {studentUser.isReadOnly ? "Subscription required to access" : "Access learning resources"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
