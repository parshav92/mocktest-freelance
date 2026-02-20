"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Users,
  Plus,
  GraduationCap,
  Clock,
  UserPlus,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Target,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  BarChart3,
  Award,
  Calendar,
  Timer,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────

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

interface SubjectStat {
  id: string;
  subject: { id: string; name: string; slug: string; icon: string | null };
  tests_taken: number;
  total_questions_attempted: number;
  total_correct: number;
  easy_attempted: number;
  easy_correct: number;
  medium_attempted: number;
  medium_correct: number;
  hard_attempted: number;
  hard_correct: number;
  overall_accuracy: number;
  current_level: "easy" | "medium" | "hard";
  last_test_at: string;
}

interface RecentTest {
  id: string;
  subject: { id: string; name: string; slug: string };
  status: string;
  started_at: string;
  ended_at: string;
  duration_mins: number;
  time_spent_secs: number;
  total_marks: number;
  marks_obtained: number;
  percentage: number;
  score_breakdown: Record<
    string,
    { total: number; correct: number; percentage: number }
  >;
  created_at: string;
}

interface StudentStats {
  student: Student;
  subjectStats: SubjectStat[];
  recentTests: RecentTest[];
  summary: {
    totalTests: number;
    avgPercentage: number;
    bestScore: number;
    totalTimeSpent: number;
  };
}

interface ParentDashboardProps {
  user: ParentUser;
  subscriptions: Subscription[];
}

type View = "overview" | "student-stats";

// ─── Main Component ───────────────────────────────────────

export function ParentDashboard({ user, subscriptions }: ParentDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentView, setCurrentView] = useState<View>("overview");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  // Derived data
  const unassignedSubscriptions = subscriptions.filter(
    (s) => s.student === null
  );
  const assignedSubscriptions = subscriptions.filter(
    (s) => s.student !== null
  );
  const studentsWithSub = assignedSubscriptions.map((s) => ({
    ...s.student!,
    subscription: s,
  }));
  const activeCount = subscriptions.filter(
    (s) => s.status === "active"
  ).length;
  const totalStudents = studentsWithSub.length;

  // Fetch student stats
  const fetchStudentStats = useCallback(async (studentId: string) => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStudentStats(data);
      }
    } catch {
      // Silent fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const openStudentStats = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCurrentView("student-stats");
    fetchStudentStats(studentId);
  };

  const goBack = () => {
    setCurrentView("overview");
    setSelectedStudentId(null);
    setStudentStats(null);
  };

  // ─── Helpers ──────────────────────────────────────────
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatTime = (secs: number) => {
    if (!secs) return "0m";
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getStatusBadge = (status: Subscription["status"]) => {
    const map = {
      active: "bg-emerald-50 text-emerald-700 border-emerald-200",
      grace_period: "bg-amber-50 text-amber-700 border-amber-200",
      expired: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status];
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 60) return "text-sky-600";
    if (pct >= 40) return "text-amber-600";
    return "text-red-500";
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 60) return "bg-sky-500";
    if (pct >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const getLevelBadge = (level: string) => {
    const map: Record<string, string> = {
      easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
      medium: "bg-sky-50 text-sky-700 border-sky-200",
      hard: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return map[level] || map.easy;
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* ─── Header ──────────────────────────────────── */}
      <header className="bg-[#1a2744] text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500 text-white font-bold text-sm">
              MT
            </div>
            <div>
              <p className="font-semibold text-sm">{user.fullName}</p>
              <p className="text-xs text-white/60">Parent Dashboard</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* ─── Content ─────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {currentView === "overview" && (
          <OverviewView
            user={user}
            subscriptions={subscriptions}
            unassignedSubscriptions={unassignedSubscriptions}
            studentsWithSub={studentsWithSub}
            activeCount={activeCount}
            totalStudents={totalStudents}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            onViewStats={openStudentStats}
          />
        )}

        {currentView === "student-stats" && (
          <StudentStatsView
            stats={studentStats}
            loading={statsLoading}
            formatDate={formatDate}
            formatTime={formatTime}
            getScoreColor={getScoreColor}
            getProgressColor={getProgressColor}
            getLevelBadge={getLevelBadge}
            getStatusBadge={getStatusBadge}
            subscription={assignedSubscriptions.find(
              (s) => s.student?.id === selectedStudentId
            )}
            onBack={goBack}
          />
        )}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// OVERVIEW VIEW
// ═════════════════════════════════════════════════════════

function OverviewView({
  user,
  subscriptions,
  unassignedSubscriptions,
  studentsWithSub,
  activeCount,
  totalStudents,
  formatDate,
  getStatusBadge,
  onViewStats,
}: {
  user: ParentUser;
  subscriptions: Subscription[];
  unassignedSubscriptions: Subscription[];
  studentsWithSub: (Student & { subscription: Subscription })[];
  activeCount: number;
  totalStudents: number;
  formatDate: (d: string) => string;
  getStatusBadge: (s: Subscription["status"]) => string;
  onViewStats: (id: string) => void;
}) {
  return (
    <>
      {/* Welcome + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-bold text-slate-900"
            style={{ letterSpacing: "-0.03em" }}
          >
            Welcome back, {user.fullName.split(" ")[0]}
          </h1>
          <p className="text-slate-500 mt-1">
            Manage subscriptions and track your student&apos;s progress
          </p>
        </div>
        <Link href="/dashboard/subscribe">
          <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90 rounded-full px-5">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </Link>
      </div>

      {/* ─── Stat Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalStudents}
                </p>
                <p className="text-sm text-slate-500">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {activeCount}
                </p>
                <p className="text-sm text-slate-500">Active Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {unassignedSubscriptions.length}
                </p>
                <p className="text-sm text-slate-500">Pending Setup</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Empty State ─────────────────────────────── */}
      {subscriptions.length === 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
              <CreditCard className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No Subscriptions Yet
            </h3>
            <p className="text-slate-500 text-center max-w-md mb-6">
              Purchase a subscription to add your first student and give them
              access to all mock tests and detailed analytics.
            </p>
            <Link href="/dashboard/subscribe">
              <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90 rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ─── Unassigned Subscriptions ────────────────── */}
      {unassignedSubscriptions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-slate-900">
              Action Required
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unassignedSubscriptions.map((sub) => (
              <Card
                key={sub.id}
                className="bg-white border border-amber-200 shadow-sm overflow-hidden"
              >
                <div className="h-1 bg-linear-to-r from-amber-400 to-amber-500" />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-slate-900">
                        {sub.plan === "yearly" ? "Yearly" : "Half-Yearly"} Plan
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusBadge(sub.status)}`}
                    >
                      {sub.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Expires {formatDate(sub.expires_at)}
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 text-amber-700 text-sm">
                    No student assigned yet. Create a student profile to get
                    started.
                  </div>

                  <Link
                    href={`/dashboard/students/new?subscription=${sub.id}`}
                    className="block"
                  >
                    <Button className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90 rounded-xl">
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

      {/* ─── Students ────────────────────────────────── */}
      {studentsWithSub.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Your Students
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studentsWithSub.map((student) => (
              <Card
                key={student.id}
                className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => onViewStats(student.id)}
              >
                <CardContent className="p-5">
                  {/* Student Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {student.full_name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {student.student_id}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-sky-500 transition-colors" />
                  </div>

                  {/* Subscription Info */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Plan</span>
                      <span className="font-medium text-slate-700">
                        {student.subscription.plan === "yearly"
                          ? "Yearly"
                          : "Half-Yearly"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Expires</span>
                      <span className="font-medium text-slate-700">
                        {formatDate(student.subscription.expires_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Status</span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusBadge(student.subscription.status)}`}
                      >
                        {student.subscription.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Grace / Expired Warning */}
                  {student.subscription.status === "grace_period" && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs">
                      Subscription expired. Student has read-only access.
                    </div>
                  )}
                  {student.subscription.status === "expired" && (
                    <div className="mt-3 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs">
                      Subscription expired. Renew to restore full access.
                    </div>
                  )}

                  {/* View Stats CTA */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-sky-600 font-medium group-hover:text-sky-700">
                      <BarChart3 className="h-4 w-4" />
                      View Performance Stats
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════
// STUDENT STATS VIEW
// ═════════════════════════════════════════════════════════

function StudentStatsView({
  stats,
  loading,
  formatDate,
  formatTime,
  getScoreColor,
  getProgressColor,
  getLevelBadge,
  getStatusBadge,
  subscription,
  onBack,
}: {
  stats: StudentStats | null;
  loading: boolean;
  formatDate: (d: string) => string;
  formatTime: (s: number) => string;
  getScoreColor: (p: number) => string;
  getProgressColor: (p: number) => string;
  getLevelBadge: (l: string) => string;
  getStatusBadge: (s: Subscription["status"]) => string;
  subscription?: Subscription;
  onBack: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-3" />
        <p className="text-slate-500">Loading student stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-400">Could not load student data.</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const { student, subjectStats, recentTests, summary } = stats;

  return (
    <>
      {/* Back navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Student Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-sky-600" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-slate-900"
              style={{ letterSpacing: "-0.03em" }}
            >
              {student.full_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-400 font-mono">
                {student.student_id}
              </span>
              {subscription && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getStatusBadge(subscription.status)}`}
                >
                  {subscription.plan === "yearly" ? "Yearly" : "Half-Yearly"}{" "}
                  · {subscription.status.replace("_", " ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="h-5 w-5 text-sky-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {summary.totalTests}
            </p>
            <p className="text-xs text-slate-500 mt-1">Tests Taken</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <p
              className={`text-2xl font-bold ${getScoreColor(summary.avgPercentage)}`}
            >
              {summary.avgPercentage}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Avg. Score</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <p
              className={`text-2xl font-bold ${getScoreColor(summary.bestScore)}`}
            >
              {summary.bestScore}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Best Score</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-5 text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
              <Timer className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatTime(summary.totalTimeSpent)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Total Practice</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Subject Performance ─────────────────────── */}
      {subjectStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Subject Performance
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {subjectStats.map((stat) => (
              <Card key={stat.id} className="bg-white border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Target className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {stat.subject.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {stat.tests_taken} test
                          {stat.tests_taken !== 1 ? "s" : ""} taken
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${getLevelBadge(stat.current_level)}`}
                    >
                      {stat.current_level}
                    </Badge>
                  </div>

                  {/* Accuracy Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-500">Overall Accuracy</span>
                      <span
                        className={`font-semibold ${getScoreColor(stat.overall_accuracy)}`}
                      >
                        {Math.round(stat.overall_accuracy)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(stat.overall_accuracy)}`}
                        style={{
                          width: `${Math.min(stat.overall_accuracy, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Difficulty Breakdown */}
                  <div className="grid grid-cols-3 gap-3">
                    <DifficultyBlock
                      label="Easy"
                      correct={stat.easy_correct}
                      total={stat.easy_attempted}
                      color="emerald"
                    />
                    <DifficultyBlock
                      label="Medium"
                      correct={stat.medium_correct}
                      total={stat.medium_attempted}
                      color="sky"
                    />
                    <DifficultyBlock
                      label="Hard"
                      correct={stat.hard_correct}
                      total={stat.hard_attempted}
                      color="purple"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Recent Tests ────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Recent Tests
        </h2>

        {recentTests.length === 0 ? (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tests completed yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Tests will appear here once your student starts practicing
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentTests.map((test) => (
              <Card
                key={test.id}
                className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Score Circle */}
                      <div className="relative w-12 h-12 shrink-0">
                        <svg
                          className="w-12 h-12 -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={
                              (test.percentage || 0) >= 80
                                ? "#10b981"
                                : (test.percentage || 0) >= 60
                                  ? "#0ea5e9"
                                  : (test.percentage || 0) >= 40
                                    ? "#f59e0b"
                                    : "#ef4444"
                            }
                            strokeWidth="3"
                            strokeDasharray={`${test.percentage || 0}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            className={`text-xs font-bold ${getScoreColor(test.percentage || 0)}`}
                          >
                            {Math.round(test.percentage || 0)}%
                          </span>
                        </div>
                      </div>

                      {/* Test Info */}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {test.subject?.name || "Test"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {test.marks_obtained}/{test.total_marks}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(test.time_spent_secs)}
                          </span>
                          <span>{formatDate(test.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${
                        test.status === "submitted"
                          ? "border-emerald-200 text-emerald-700"
                          : "border-amber-200 text-amber-700"
                      }`}
                    >
                      {test.status === "submitted"
                        ? "Completed"
                        : "Ended Early"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════
// DIFFICULTY BLOCK COMPONENT
// ═════════════════════════════════════════════════════════

function DifficultyBlock({
  label,
  correct,
  total,
  color,
}: {
  label: string;
  correct: number;
  total: number;
  color: "emerald" | "sky" | "purple";
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const bgMap = {
    emerald: "bg-emerald-50",
    sky: "bg-sky-50",
    purple: "bg-purple-50",
  };
  const textMap = {
    emerald: "text-emerald-700",
    sky: "text-sky-700",
    purple: "text-purple-700",
  };

  return (
    <div className={`p-3 rounded-xl ${bgMap[color]} text-center`}>
      <p className={`text-lg font-bold ${textMap[color]}`}>{pct}%</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-400">
        {correct}/{total}
      </p>
    </div>
  );
}
