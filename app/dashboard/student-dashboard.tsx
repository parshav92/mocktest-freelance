"use client";

import { useEffect, useState } from "react";
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
import type { Test } from "@/types/test";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentTests();
  }, []);

  const fetchRecentTests = async () => {
    try {
      const res = await fetch("/api/tests?status=submitted&limit=5");
      if (res.ok) {
        const data = await res.json();
        setRecentTests(data.tests || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
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
              <p className="text-sm text-white/70">{user.studentCode}</p>
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
              <strong>Read-only mode:</strong> Your subscription has expired.
              You can view scores but cannot take new tests.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* LEFT HALF: Previous Test Scores */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1a2744]">Your Scores</h2>
              <p className="text-gray-600 mt-1">
                Recent test performance and results
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : recentTests.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No tests completed yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Take your first practice test to see your scores here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentTests.map((test) => (
                  <Card
                    key={test.id}
                    className="bg-white hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#1a2744]">
                              {test.subject?.name || "Test"}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                (test.percentage || 0) >= 70
                                  ? "border-green-300 text-green-700"
                                  : (test.percentage || 0) >= 50
                                  ? "border-amber-300 text-amber-700"
                                  : "border-red-300 text-red-700"
                              }`}
                            >
                              {Math.round(test.percentage || 0)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {test.marks_obtained}/{test.total_marks}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(test.time_spent_secs)}
                            </span>
                            <span>{formatDate(test.created_at)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/dashboard/tests/${test.id}/review`)
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

                {recentTests.length >= 5 && (
                  <Button
                    variant="link"
                    className="w-full text-[#1a2744]"
                    onClick={() => router.push("/dashboard/scores")}
                  >
                    View all scores
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT HALF: Take Practice Test CTA */}
          <div className="flex items-start">
            <Card className="bg-white w-full">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#1a2744]/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-[#1a2744]" />
                </div>

                <h2 className="text-2xl font-bold text-[#1a2744] mb-3">
                  Ready to Practice?
                </h2>

                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Challenge yourself with practice tests designed to help you
                  prepare for the Selective High School Placement Test.
                </p>

                <div className="space-y-3 text-sm text-gray-500 mb-8">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>4 subject areas available</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Adaptive difficulty based on your level</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Detailed solutions for every question</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="bg-[#1a2744] hover:bg-[#1a2744]/90 px-8"
                  onClick={() => router.push("/dashboard/tests")}
                  disabled={user.isReadOnly}
                >
                  Take Practice Test
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>

                {user.isReadOnly && (
                  <p className="text-xs text-amber-600 mt-3">
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
