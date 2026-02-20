"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
    LogOut,
    GraduationCap,
    Clock,
    CheckCircle2,
    ArrowRight,
    FileText,
    Eye,
    Loader2,
} from "lucide-react";
import type { Test, Subject } from "@/types/test";

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
    const [recentTests, setRecentTests] = useState<Test[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [startingSubject, setStartingSubject] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [leftHeight, setLeftHeight] = useState<number | null>(null);
    const rightCardRef = useRef<HTMLDivElement>(null);

    // Sync left section height to the right card
    const syncHeight = useCallback(() => {
        if (rightCardRef.current) {
            setLeftHeight(rightCardRef.current.offsetHeight);
        }
    }, []);

    useEffect(() => {
        syncHeight();
        const observer = new ResizeObserver(syncHeight);
        if (rightCardRef.current) observer.observe(rightCardRef.current);
        window.addEventListener("resize", syncHeight);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", syncHeight);
        };
    }, [syncHeight, loading]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch both in parallel for better performance
            const [testsRes, subjectsRes] = await Promise.all([
                fetch("/api/tests?status=submitted&limit=5"),
                fetch("/api/subjects"),
            ]);

            if (testsRes.ok) {
                const testsData = await testsRes.json();
                setRecentTests(testsData.tests || []);
            }

            if (subjectsRes.ok) {
                const subjectsData = await subjectsRes.json();
                setSubjects(subjectsData.subjects || []);
            }
        } catch {
            // Silent fail for tests, show error for subjects
        } finally {
            setLoading(false);
        }
    };

    const handleStartTest = async (subject: Subject) => {
        if (user.isReadOnly) return;

        setStartingSubject(subject.id);
        setError(null);

        try {
            const res = await fetch("/api/tests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject_id: subject.id,
                    start_immediately: false,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create test");
            }

            router.push(`/dashboard/tests/${data.test.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start test");
            setStartingSubject(null);
        }
    };

    const handleSignOut = async () => {
        await fetch("/api/auth/student/logout", { method: "POST" });
        router.push("/auth");
        router.refresh();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (secs: number | null) => {
        if (!secs) return "--";
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}:${String(s).padStart(2, "0")}`;
    };

    return (
        <div className="min-h-screen bg-[#e8eef3] font-[family-name:var(--font-inter)]">
            {/* Header */}
            <header className="bg-[#1a2744] text-white">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white/10">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold">{user.fullName}</p>
                            <p className="text-sm text-white/70">
                                {user.studentCode}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-white hover:bg-white/10"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </header>

            {/* Main Content - Split Layout */}
            <main className="container mx-auto px-4 py-8">
                {/* Read-only banner */}
                {user.isReadOnly && (
                    <div className="mb-6 p-4 rounded-lg bg-amber-100 border border-amber-300">
                        <p className="text-sm text-amber-800">
                            <strong>Read-only mode:</strong> Your subscription
                            has expired. You can view scores but cannot take new
                            tests.
                        </p>
                    </div>
                )}
                <div className="mb-4">
                    <h2 className="text-2xl font-bold text-[#1a2744]">
                        Your Scores{" "}
                        <span className="text-gray-600 text-sm mt-1 ">
                            Recent test performance and results
                        </span>
                    </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* LEFT HALF: Previous Test Scores */}
                    <div
                        className="relative"
                        style={
                            leftHeight
                                ? { height: leftHeight, overflow: "hidden" }
                                : undefined
                        }
                    >
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : recentTests.length === 0 ? (
                            <Card className="bg-white">
                                <CardContent className="py-12 text-center">
                                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">
                                        No tests completed yet
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Take your first practice test to see
                                        your scores here
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recentTests.map((test) => (
                                    <Card
                                        key={test.id}
                                        className="bg-white hover:shadow-md transition-shadow shrink-0"
                                    >
                                        <CardContent className="px-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-[#1a2744]">
                                                            {test.subject
                                                                ?.name ||
                                                                "Test"}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${
                                                                (test.percentage ||
                                                                    0) >= 70
                                                                    ? "border-green-300 text-green-700"
                                                                    : (test.percentage ||
                                                                            0) >=
                                                                        50
                                                                      ? "border-amber-300 text-amber-700"
                                                                      : "border-red-300 text-red-700"
                                                            }`}
                                                        >
                                                            {Math.round(
                                                                test.percentage ||
                                                                    0,
                                                            )}
                                                            %
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            {
                                                                test.marks_obtained
                                                            }
                                                            /{test.total_marks}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {formatTime(
                                                                test.time_spent_secs,
                                                            )}
                                                        </span>
                                                        <span>
                                                            {formatDate(
                                                                test.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/tests/${test.id}/review`,
                                                        )
                                                    }
                                                    className="text-[#1a2744]"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Gradient overlay with View All Tests button */}
                        {!loading && recentTests.length > 0 && leftHeight && (
                            <div
                                className="absolute bottom-0 left-0 right-0 flex items-end justify-center pb-4 pointer-events-none"
                                style={{ height: 120 }}
                            >
                                {/* Gradient background */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background:
                                            "linear-gradient(to bottom, rgba(232,238,243,0) 0%, rgba(232,238,243,0.6) 30%, rgba(232,238,243,0.3) 70%, rgba(232,238,243,1) 50%)",
                                        backdropFilter: "blur(1px)",
                                    }}
                                />
                                <Button
                                    className="relative pointer-events-auto bg-[#1a2744] hover:bg-[#1a2744]/90 shadow-lg px-6"
                                    onClick={() =>
                                        router.push("/dashboard/scores")
                                    }
                                >
                                    View All Scores
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT HALF: Subject Selection */}
                    <div ref={rightCardRef} className="flex items-start">
                        <Card className="bg-white w-full">
                            <CardContent className="p-8">
                                {/* Title */}
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-[#1a2744] leading-tight">
                                        Selective High School Placement
                                    </h2>
                                    <h3 className="text-2xl font-bold text-[#1a2744]">
                                        Practice Test
                                    </h3>
                                    <div className="w-full h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-500 mt-4" />
                                </div>

                                {error && (
                                    <div className="mb-6 p-3 rounded bg-red-100 text-red-700 text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                {/* Subject Buttons */}
                                <div className="space-y-3">
                                    {subjects.map((subject) => (
                                        <button
                                            key={subject.id}
                                            onClick={() => handleStartTest(subject)}
                                            disabled={user.isReadOnly || startingSubject !== null}
                                            className="w-full py-4 px-6 bg-[#1a2744] text-white font-medium rounded-md
                                                hover:bg-[#1a2744]/90 transition-colors text-center
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                flex items-center justify-center gap-2"
                                        >
                                            {startingSubject === subject.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Starting...
                                                </>
                                            ) : (
                                                subject.name
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {subjects.length === 0 && !loading && (
                                    <p className="text-center text-gray-500">
                                        No subjects available at the moment.
                                    </p>
                                )}

                                {user.isReadOnly && subjects.length > 0 && (
                                    <p className="text-xs text-amber-600 mt-4 text-center">
                                        Subscription required to take new tests
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
