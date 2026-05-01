"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StudentAnalyticsPanel } from "./student-analytics-panel";
import type { ParentStudentAnalytics } from "@/types/parent-analytics";
import {
    LogOut,
    Plus,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    Loader2,
    AlertTriangle,
    UserPlus,
    Clock,
} from "lucide-react";

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

// ── Types ──────────────────────────────────────────────

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

const EMPTY_ANALYTICS: ParentStudentAnalytics = {
    summary: {
        total_tests: 0,
        avg_percentage: 0,
        best_percentage: 0,
        total_time_spent_secs: 0,
    },
    peer_overall: {
        student_avg_percentage: 0,
        peer_avg_percentage: 0,
        delta_percentage: 0,
        percentile_rank: 0,
        peer_student_count: 0,
    },
    pacing: {
        pace_vs_allotted_pct: 0,
        ended_early_rate_pct: 0,
    },
    engagement: {
        avg_tests_per_week: 0,
        longest_gap_days: 0,
    },
    subject_comparison: [],
    error_patterns: {
        by_difficulty: [],
        by_question_type: [],
    },
    topic_breakdown: [],
    topic_pagination: {
        page: 1,
        page_size: 10,
        total_rows: 0,
        total_pages: 0,
    },
    trajectories: {
        daily: [],
        weekly: [],
    },
};

interface ParentDashboardProps {
    user: ParentUser;
    subscriptions: Subscription[];
}

type View = "overview" | "student-stats";
type AnalyticsDaysFilter = "30" | "90" | "180" | "all";

// ── Helpers ────────────────────────────────────────────

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function fmtTime(secs: number) {
    if (!secs) return "0m";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function statusCls(status: Subscription["status"]) {
    const m: Record<string, string> = {
        active: "bg-emerald-50 text-emerald-700 border-emerald-200",
        grace_period: "bg-amber-50 text-amber-700 border-amber-200",
        expired: "bg-red-50 text-red-600 border-red-200",
    };
    return m[status] ?? "";
}

function statusLabel(status: Subscription["status"]) {
    const m: Record<string, string> = {
        active: "Active",
        grace_period: "Grace Period",
        expired: "Expired",
    };
    return m[status] ?? status;
}

function scoreFg(pct: number) {
    if (pct >= 70) return "text-emerald-700";
    if (pct >= 50) return "text-amber-700";
    return "text-red-600";
}

function progressBg(pct: number) {
    if (pct >= 70) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-500";
}

function accentBorder(pct: number) {
    if (pct >= 70) return "border-l-emerald-500";
    if (pct >= 50) return "border-l-amber-500";
    return "border-l-red-400";
}

function pct(correct: number, total: number) {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
}

// ── Main Component ─────────────────────────────────────

export function ParentDashboard({ user, subscriptions }: ParentDashboardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [view, setView] = useState<View>("overview");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [analytics, setAnalytics] =
        useState<ParentStudentAnalytics>(EMPTY_ANALYTICS);
    const [loading, setLoading] = useState(false);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsDays, setAnalyticsDays] = useState<AnalyticsDaysFilter>("90");
    const [analyticsSubjectId, setAnalyticsSubjectId] = useState<string>("all");
    const [topicPage, setTopicPage] = useState(1);
    const [queryInitialized, setQueryInitialized] = useState(false);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth");
        router.refresh();
    };

    // Derived
    const unassigned = subscriptions.filter((s) => !s.student);
    const assigned = subscriptions.filter((s) => s.student);
    const students = assigned.map((s) => ({
        ...s.student!,
        subscription: s,
    }));
    const activeCount = subscriptions.filter(
        (s) => s.status === "active",
    ).length;

    const updateQueryParams = useCallback(
        (next: {
            student?: string | null;
            days?: AnalyticsDaysFilter | null;
            subject?: string | null;
            topicPage?: number;
        }) => {
            const params = new URLSearchParams(searchParams.toString());

            const setOrDelete = (key: string, value?: string | null) => {
                if (value === undefined || value === null || value === "") {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            };

            setOrDelete("student", next.student);
            setOrDelete("days", next.days);
            setOrDelete("subject", next.subject);
            if (typeof next.topicPage === "number") {
                setOrDelete("topicPage", String(next.topicPage));
            } else {
                params.delete("topicPage");
            }

            const query = params.toString();
            router.replace(`/dashboard${query ? `?${query}` : ""}`, {
                scroll: false,
            });
        },
        [router, searchParams],
    );

    const fetchStats = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const statsRes = await fetch(`/api/students/${id}/stats`);
            if (statsRes.ok) {
                setStats(await statsRes.json());
            } else {
                setStats(null);
            }
        } catch {
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAnalytics = useCallback(
        async (
            id: string,
            filters: {
                days: AnalyticsDaysFilter;
                subjectId: string;
                topicPage: number;
            },
        ) => {
            setAnalyticsLoading(true);
            try {
                const params = new URLSearchParams();
                params.set("days", filters.days);
                params.set("topicPage", String(filters.topicPage));
                params.set("topicPageSize", "10");
                if (filters.subjectId !== "all") {
                    params.set("subjectId", filters.subjectId);
                }

                const analyticsRes = await fetch(
                    `/api/students/${id}/analytics?${params.toString()}`,
                );
            if (analyticsRes.ok) {
                setAnalytics(
                    (await analyticsRes.json()) as ParentStudentAnalytics,
                );
            } else {
                setAnalytics(EMPTY_ANALYTICS);
            }
        } catch {
            setAnalytics(EMPTY_ANALYTICS);
        } finally {
            setAnalyticsLoading(false);
        }
        },
        [],
    );

    useEffect(() => {
        if (queryInitialized) return;

        const studentFromQuery = searchParams.get("student");
        const daysFromQuery = searchParams.get("days");
        const subjectFromQuery = searchParams.get("subject");
        const topicPageFromQuery = searchParams.get("topicPage");

        if (
            daysFromQuery === "30" ||
            daysFromQuery === "90" ||
            daysFromQuery === "180" ||
            daysFromQuery === "all"
        ) {
            setAnalyticsDays(daysFromQuery);
        }

        if (subjectFromQuery) {
            setAnalyticsSubjectId(subjectFromQuery);
        }

        if (topicPageFromQuery) {
            const parsed = Number.parseInt(topicPageFromQuery, 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                setTopicPage(parsed);
            }
        }

        if (studentFromQuery) {
            setSelectedId(studentFromQuery);
            setView("student-stats");
            void fetchStats(studentFromQuery);
        }

        setQueryInitialized(true);
    }, [fetchStats, queryInitialized, searchParams]);

    useEffect(() => {
        if (!queryInitialized || view !== "student-stats" || !selectedId) return;
        void fetchAnalytics(selectedId, {
            days: analyticsDays,
            subjectId: analyticsSubjectId,
            topicPage,
        });
    }, [
        view,
        selectedId,
        analyticsDays,
        analyticsSubjectId,
        topicPage,
        fetchAnalytics,
        queryInitialized,
    ]);

    const openStats = (id: string) => {
        setSelectedId(id);
        setView("student-stats");
        setAnalyticsDays("90");
        setAnalyticsSubjectId("all");
        setTopicPage(1);
        setAnalytics(EMPTY_ANALYTICS);
        fetchStats(id);
        updateQueryParams({
            student: id,
            days: "90",
            subject: "all",
            topicPage: 1,
        });
    };

    const goBack = () => {
        setView("overview");
        setSelectedId(null);
        setStats(null);
        setAnalytics(EMPTY_ANALYTICS);
        setAnalyticsDays("90");
        setAnalyticsSubjectId("all");
        setTopicPage(1);
        updateQueryParams({
            student: null,
            days: null,
            subject: null,
            topicPage: undefined,
        });
    };

    const firstName = user.fullName.split(" ")[0];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-[#1a2744]">
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold text-white">
                            {firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <span className="text-sm font-medium text-white tracking-tight">
                                {user.fullName}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-6 py-6">
                {view === "overview" ? (
                    <Overview
                        students={students}
                        unassigned={unassigned}
                        activeCount={activeCount}
                        totalSubs={subscriptions.length}
                        onViewStats={openStats}
                    />
                ) : (
                    <StudentDetail
                        stats={stats}
                        analytics={analytics}
                        analyticsLoading={analyticsLoading}
                        analyticsDays={analyticsDays}
                        analyticsSubjectId={analyticsSubjectId}
                        topicPage={topicPage}
                        loading={loading}
                        subscription={assigned.find(
                            (s) => s.student?.id === selectedId,
                        )}
                        onAnalyticsDaysChange={(value) => {
                            setAnalyticsDays(value);
                            setTopicPage(1);
                            updateQueryParams({
                                student: selectedId,
                                days: value,
                                subject: analyticsSubjectId,
                                topicPage: 1,
                            });
                        }}
                        onAnalyticsSubjectChange={(value) => {
                            setAnalyticsSubjectId(value);
                            setTopicPage(1);
                            updateQueryParams({
                                student: selectedId,
                                days: analyticsDays,
                                subject: value,
                                topicPage: 1,
                            });
                        }}
                        onTopicPageChange={(page) => {
                            setTopicPage(page);
                            updateQueryParams({
                                student: selectedId,
                                days: analyticsDays,
                                subject: analyticsSubjectId,
                                topicPage: page,
                            });
                        }}
                        onBack={goBack}
                    />
                )}
            </main>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════════

function Overview({
    students,
    unassigned,
    activeCount,
    totalSubs,
    onViewStats,
}: {
    students: (Student & { subscription: Subscription })[];
    unassigned: Subscription[];
    activeCount: number;
    totalSubs: number;
    onViewStats: (id: string) => void;
}) {
    return (
        <>
            {/* Greeting + Page header */}
            <div className="flex items-center justify-between mb-6 animate-[fade-in-up_0.4s_ease-out_both]">
                <div>
                    <h1 className="text-xl font-semibold text-[#1a2744] tracking-tight">
                        {getGreeting()}
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {students.length} student
                        {students.length !== 1 ? "s" : ""} &middot;{" "}
                        {activeCount} active plan
                        {activeCount !== 1 ? "s" : ""}
                    </p>
                </div>
                <Link href="/dashboard/subscribe">
                    <Button
                        size="sm"
                        className="bg-[#1a2744] hover:bg-[#1a2744]/90 h-8 text-sm px-3.5 rounded-lg"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Student
                    </Button>
                </Link>
            </div>

            {/* Alert: unassigned subscriptions */}
            {unassigned.length > 0 && (
                <div
                    className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 animate-[fade-in-up_0.4s_ease-out_both]"
                    style={{ animationDelay: "50ms" }}
                >
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-md font-medium text-amber-900">
                            {unassigned.length} subscription
                            {unassigned.length > 1 ? "s" : ""} pending setup
                        </p>
                        <p className="text-md text-amber-700/80 mt-0.5">
                            Create a student profile to activate access.
                        </p>
                    </div>
                    <Link
                        href={`/dashboard/students/new?subscription=${unassigned[0].id}`}
                    >
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-800 hover:bg-amber-100 h-7 text-md shrink-0"
                        >
                            <UserPlus className="h-3 w-3 mr-1.5" />
                            Setup
                        </Button>
                    </Link>
                </div>
            )}

            {/* Empty state: no subscriptions at all */}
            {totalSubs === 0 && (
                <div
                    className="bg-white border border-slate-200 rounded-xl py-16 text-center animate-[fade-in-up_0.4s_ease-out_both]"
                    style={{ animationDelay: "100ms" }}
                >
                    <p className="text-slate-800 font-medium mb-1">
                        No subscriptions yet
                    </p>
                    <p className="text-md text-slate-500 max-w-sm mx-auto mb-5">
                        Purchase a plan to enroll your first student and unlock
                        practice tests — or try a free sample test first.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/free-trial">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-md border-sky-200 text-sky-600 hover:bg-sky-50"
                            >
                                ✦ Take Free Trial
                            </Button>
                        </Link>
                        <Link href="/dashboard/subscribe">
                            <Button
                                size="sm"
                                className="bg-[#1a2744] hover:bg-[#1a2744]/90 h-8 text-md"
                            >
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Student list */}
            {students.length > 0 && (
                <section
                    className="animate-[fade-in-up_0.4s_ease-out_both]"
                    style={{ animationDelay: "100ms" }}
                >
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2.5">
                        Students
                    </p>
                    <div className="space-y-2">
                        {students.map((s, i) => (
                            <button
                                key={s.id}
                                onClick={() => onViewStats(s.id)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-4 text-left hover:border-slate-300 hover:shadow-sm transition-all duration-200 group animate-[fade-in-up_0.3s_ease-out_both]"
                                style={{ animationDelay: `${150 + i * 60}ms` }}
                            >
                                {/* Initial */}
                                <div className="w-9 h-9 rounded-full bg-[#1a2744] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                    {s.full_name.charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {s.full_name}
                                        </p>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] leading-none px-1.5 py-0.5 border font-medium ${statusCls(s.subscription.status)}`}
                                        >
                                            {statusLabel(s.subscription.status)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                                        {s.student_id} &middot;{" "}
                                        {s.subscription.plan === "yearly"
                                            ? "Yearly"
                                            : "Half-Yearly"}{" "}
                                        &middot; Expires{" "}
                                        {fmtDate(s.subscription.expires_at)}
                                    </p>
                                </div>

                                {/* Arrow */}
                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Additional pending subs (when more than 1 unassigned) */}
            {unassigned.length > 1 && (
                <section
                    className="mt-6 animate-[fade-in-up_0.4s_ease-out_both]"
                    style={{ animationDelay: "200ms" }}
                >
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2.5">
                        Pending Subscriptions
                    </p>
                    <div className="space-y-2">
                        {unassigned.map((sub) => (
                            <div
                                key={sub.id}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-md font-medium text-slate-900">
                                        {sub.plan === "yearly"
                                            ? "Yearly"
                                            : "Half-Yearly"}{" "}
                                        Plan
                                    </p>
                                    <p className="text-md text-slate-400 mt-0.5">
                                        Expires {fmtDate(sub.expires_at)}
                                    </p>
                                </div>
                                <Link
                                    href={`/dashboard/students/new?subscription=${sub.id}`}
                                >
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-md"
                                    >
                                        <UserPlus className="h-3 w-3 mr-1.5" />
                                        Assign Student
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

// ════════════════════════════════════════════════════════
// STUDENT DETAIL
// ════════════════════════════════════════════════════════

const TESTS_PER_PAGE = 10;

function StudentDetail({
    stats,
    analytics,
    analyticsLoading,
    analyticsDays,
    analyticsSubjectId,
    topicPage,
    loading,
    subscription,
    onAnalyticsDaysChange,
    onAnalyticsSubjectChange,
    onTopicPageChange,
    onBack,
}: {
    stats: StudentStats | null;
    analytics: ParentStudentAnalytics;
    analyticsLoading: boolean;
    analyticsDays: AnalyticsDaysFilter;
    analyticsSubjectId: string;
    topicPage: number;
    loading: boolean;
    subscription?: Subscription;
    onAnalyticsDaysChange: (value: AnalyticsDaysFilter) => void;
    onAnalyticsSubjectChange: (value: string) => void;
    onTopicPageChange: (page: number) => void;
    onBack: () => void;
}) {
    const [testPage, setTestPage] = useState(1);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400 mb-3" />
                <p className="text-md text-slate-400">Loading&hellip;</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-32">
                <p className="text-md text-slate-400 mb-4">
                    Could not load student data.
                </p>
                <Button variant="outline" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                    Go back
                </Button>
            </div>
        );
    }

    const { student, subjectStats, recentTests, summary } = stats;
    const subjectFilterOptions = (() => {
        const seen = new Set<string>();
        const rows: Array<{ id: string; name: string }> = [];

        for (const s of subjectStats) {
            const id = s.subject.id;
            if (!seen.has(id)) {
                seen.add(id);
                rows.push({ id, name: s.subject.name });
            }
        }

        for (const t of recentTests) {
            const id = t.subject?.id;
            const name = t.subject?.name;
            if (id && name && !seen.has(id)) {
                seen.add(id);
                rows.push({ id, name });
            }
        }

        return rows.sort((a, b) => a.name.localeCompare(b.name));
    })();
    const summaryView = {
        totalTests:
            analytics.summary.total_tests > 0
                ? analytics.summary.total_tests
                : summary.totalTests,
        avgPercentage:
            analytics.summary.total_tests > 0
                ? Math.round(analytics.summary.avg_percentage)
                : summary.avgPercentage,
        bestScore:
            analytics.summary.total_tests > 0
                ? Math.round(analytics.summary.best_percentage)
                : summary.bestScore,
        totalTimeSpent:
            analytics.summary.total_tests > 0
                ? analytics.summary.total_time_spent_secs
                : summary.totalTimeSpent,
    };

    return (
        <>
            {/* Back */}
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-md text-slate-400 hover:text-slate-700 transition-colors mb-5"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
            </button>

            {/* Student identity */}
            <div className="flex items-center gap-3 mb-6 animate-[fade-in-up_0.4s_ease-out_both]">
                <div className="w-10 h-10 rounded-full bg-[#1a2744] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {student.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-lg font-semibold text-[#1a2744]">
                        {student.full_name}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-md text-slate-400 font-mono">
                            {student.student_id}
                        </span>
                        {subscription && (
                            <Badge
                                variant="outline"
                                className={`text-[10px] leading-none px-1.5 py-0.5 border font-medium ${statusCls(subscription.status)}`}
                            >
                                {subscription.plan === "yearly"
                                    ? "Yearly"
                                    : "Half-Yearly"}{" "}
                                &middot; {statusLabel(subscription.status)}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats row — gap-px trick creates 1px internal borders */}
            <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden mb-6 animate-[fade-in-up_0.4s_ease-out_both]"
                style={{ animationDelay: "100ms" }}
            >
                <div className="bg-white p-4">
                    <p className="text-2xl font-bold text-[#1a2744] tabular-nums">
                        {summaryView.totalTests}
                    </p>
                    <p className="text-md text-slate-400 mt-0.5">Tests taken</p>
                </div>
                <div className="bg-white p-4">
                    <p
                        className={`text-2xl font-bold tabular-nums ${scoreFg(summaryView.avgPercentage)}`}
                    >
                        {summaryView.avgPercentage}
                        <span className="text-md font-normal text-slate-400">
                            %
                        </span>
                    </p>
                    <p className="text-md text-slate-400 mt-0.5">Avg. score</p>
                </div>
                <div className="bg-white p-4">
                    <p
                        className={`text-2xl font-bold tabular-nums ${scoreFg(summaryView.bestScore)}`}
                    >
                        {summaryView.bestScore}
                        <span className="text-md font-normal text-slate-400">
                            %
                        </span>
                    </p>
                    <p className="text-md text-slate-400 mt-0.5">Best score</p>
                </div>
                <div className="bg-white p-4">
                    <p className="text-2xl font-bold text-[#1a2744] tabular-nums">
                        {fmtTime(summaryView.totalTimeSpent)}
                    </p>
                    <p className="text-md text-slate-400 mt-0.5">
                        Practice time
                    </p>
                </div>
            </div>

            {/* Subject performance */}
            {subjectStats.length > 0 && (
                <section
                    className="mb-6 animate-[fade-in-up_0.4s_ease-out_both]"
                    style={{ animationDelay: "150ms" }}
                >
                    <h2 className="text-sm font-medium text-slate-900 mb-3">
                        Subjects
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        {subjectStats.map((s) => {
                            const acc = Math.round(s.overall_accuracy);
                            return (
                                <div
                                    key={s.id}
                                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow duration-200"
                                >
                                    {/* Header row */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-md font-medium text-slate-900">
                                                {s.subject.name}
                                            </p>
                                            <p className="text-md text-slate-400">
                                                {s.tests_taken} test
                                                {s.tests_taken !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] capitalize border-slate-200 text-slate-500"
                                        >
                                            {s.current_level}
                                        </Badge>
                                    </div>

                                    {/* Accuracy bar */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${progressBg(acc)}`}
                                                style={{
                                                    width: `${Math.min(acc, 100)}%`,
                                                }}
                                            />
                                        </div>
                                        <span
                                            className={`text-md font-semibold tabular-nums w-9 text-right ${scoreFg(acc)}`}
                                        >
                                            {acc}%
                                        </span>
                                    </div>

                                    {/* Difficulty split — inline text, no colored boxes */}
                                    <div className="flex items-center gap-4 text-md text-slate-400">
                                        <span>
                                            Easy{" "}
                                            <span className="font-medium text-slate-600">
                                                {pct(
                                                    s.easy_correct,
                                                    s.easy_attempted,
                                                )}
                                                %
                                            </span>
                                        </span>
                                        <span>
                                            Med{" "}
                                            <span className="font-medium text-slate-600">
                                                {pct(
                                                    s.medium_correct,
                                                    s.medium_attempted,
                                                )}
                                                %
                                            </span>
                                        </span>
                                        <span>
                                            Hard{" "}
                                            <span className="font-medium text-slate-600">
                                                {pct(
                                                    s.hard_correct,
                                                    s.hard_attempted,
                                                )}
                                                %
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Recent tests */}
            <section
                className="mb-6 animate-[fade-in-up_0.4s_ease-out_both]"
                style={{ animationDelay: "200ms" }}
            >
                <h2 className="text-sm font-medium text-slate-900 mb-3">
                    Recent Tests
                </h2>

                {recentTests.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
                        <p className="text-sm text-slate-400">
                            No tests completed yet
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                            {recentTests
                                .slice(
                                    (testPage - 1) * TESTS_PER_PAGE,
                                    testPage * TESTS_PER_PAGE,
                                )
                                .map((t) => {
                                    const p = Math.round(t.percentage || 0);
                                    return (
                                        <div
                                            key={t.id}
                                            className={`flex items-center gap-4 px-4 py-3 border-l-[3px] ${accentBorder(p)}`}
                                        >
                                            {/* Subject + date */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {t.subject?.name || "Test"}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {fmtDate(t.created_at)}
                                                </p>
                                            </div>

                                            {/* Score + marks */}
                                            <div className="text-right shrink-0">
                                                <p
                                                    className={`text-sm font-semibold tabular-nums ${scoreFg(p)}`}
                                                >
                                                    {p}%
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    {t.marks_obtained}/
                                                    {t.total_marks}
                                                </p>
                                            </div>

                                            {/* Time */}
                                            <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0 w-14 justify-end">
                                                <Clock className="h-3 w-3" />
                                                {fmtTime(t.time_spent_secs)}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Pagination */}
                        {recentTests.length > TESTS_PER_PAGE && (
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-xs text-slate-400 tabular-nums">
                                    {(testPage - 1) * TESTS_PER_PAGE + 1}&ndash;
                                    {Math.min(
                                        testPage * TESTS_PER_PAGE,
                                        recentTests.length,
                                    )}{" "}
                                    of {recentTests.length}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() =>
                                            setTestPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={testPage === 1}
                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setTestPage((p) =>
                                                Math.min(
                                                    Math.ceil(
                                                        recentTests.length /
                                                            TESTS_PER_PAGE,
                                                    ),
                                                    p + 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            testPage >=
                                            Math.ceil(
                                                recentTests.length /
                                                    TESTS_PER_PAGE,
                                            )
                                        }
                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            <section
                className="animate-[fade-in-up_0.4s_ease-out_both]"
                style={{ animationDelay: "250ms" }}
            >
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-3">
                    <h2 className="text-sm font-medium text-slate-900">
                        Advanced Analytics
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <label className="text-xs text-slate-500">
                            Date Range
                            <select
                                value={analyticsDays}
                                onChange={(e) =>
                                    onAnalyticsDaysChange(
                                        e.target.value as AnalyticsDaysFilter,
                                    )
                                }
                                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                            >
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="180">Last 180 days</option>
                                <option value="all">All time</option>
                            </select>
                        </label>
                        <label className="text-xs text-slate-500">
                            Subject
                            <select
                                value={analyticsSubjectId}
                                onChange={(e) =>
                                    onAnalyticsSubjectChange(e.target.value)
                                }
                                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700"
                            >
                                <option value="all">All subjects</option>
                                {subjectFilterOptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <StudentAnalyticsPanel
                    analytics={analytics}
                    analyticsLoading={analyticsLoading}
                    topicPage={topicPage}
                    onTopicPageChange={onTopicPageChange}
                />
            </section>
        </>
    );
}
