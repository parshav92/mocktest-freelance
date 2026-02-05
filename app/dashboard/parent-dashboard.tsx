"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Users,
  Shield,
  Plus,
  GraduationCap,
  Calendar,
  Clock,
  UserPlus,
  CreditCard,
  AlertCircle,
} from "lucide-react";

interface ParentUser {
  id: string;
  email: string;
  fullName: string;
  role: "parent" | "admin";
}

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

interface Subscription {
  id: string;
  plan: "half_yearly" | "yearly";
  status: "active" | "expired" | "grace_period";
  starts_at: string;
  expires_at: string;
  student: Student | null;
  created_at: string;
}

interface ParentDashboardProps {
  user: ParentUser;
  subscriptions: Subscription[];
}

export function ParentDashboard({ user, subscriptions }: ParentDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  // Categorize subscriptions
  const unassignedSubscriptions = subscriptions.filter((s) => s.student === null);
  const studentsWithSubscription = subscriptions
    .filter((s) => s.student !== null)
    .map((s) => ({ ...s.student!, subscription: s }));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: Subscription["status"]) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "grace_period":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "expired":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-neutral-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              {user.role === "admin" ? (
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <div>
              <p className="font-semibold">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {user.role === "admin" ? "Administrator" : "Parent"}
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back, {user.fullName.split(" ")[0]}!
          </h1>
          <Link href="/dashboard/subscribe">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </Link>
        </div>

        {/* No subscriptions state */}
        {subscriptions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Active Subscriptions</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Purchase a subscription to add your first student and give them access to all mock tests.
              </p>
              <Link href="/dashboard/subscribe">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Unassigned subscriptions - need to create student */}
        {unassignedSubscriptions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold">Action Required</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unassignedSubscriptions.map((sub) => (
                <Card key={sub.id} className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {sub.plan === "yearly" ? "Yearly" : "Half-Yearly"} Plan
                      </CardTitle>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(sub.status)}`}>
                        {sub.status.replace("_", " ")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Expires: {formatDate(sub.expires_at)}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm">
                      No student assigned yet. Create a student profile to activate.
                    </div>
                    <Link href={`/dashboard/students/new?subscription=${sub.id}`}>
                      <Button className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Student Profile
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Students with subscriptions */}
        {studentsWithSubscription.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Students</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {studentsWithSubscription.map((student) => (
                <Card key={student.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{student.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground font-mono">
                          {student.student_id}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${getStatusColor(student.subscription.status)}`}>
                        {student.subscription.status.replace("_", " ")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4" />
                        Plan
                      </span>
                      <span className="font-medium">
                        {student.subscription.plan === "yearly" ? "Yearly" : "Half-Yearly"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Expires
                      </span>
                      <span className="font-medium">
                        {formatDate(student.subscription.expires_at)}
                      </span>
                    </div>
                    {student.subscription.status === "grace_period" && (
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs">
                        Subscription expired. Student has read-only access.
                      </div>
                    )}
                    {student.subscription.status === "expired" && (
                      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs">
                        Subscription expired. Renew to restore access.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
