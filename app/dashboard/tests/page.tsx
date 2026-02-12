"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Calculator,
  Brain,
  PenTool,
  ArrowRight,
  Clock,
  HelpCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { Subject } from "@/types/test";

interface SubjectWithCount extends Subject {
  question_count: number;
}

interface AccessStatus {
  can_take_new_tests: boolean;
  is_in_grace_period: boolean;
  subscription_status: string | null;
  message: string;
}

const iconMap: Record<string, React.ReactNode> = {
  "book-open": <BookOpen className="h-6 w-6" />,
  calculator: <Calculator className="h-6 w-6" />,
  brain: <Brain className="h-6 w-6" />,
  pencil: <PenTool className="h-6 w-6" />,
};

export default function TestSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([]);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingTest, setStartingTest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch subjects and access status in parallel
      const [subjectsRes, accessRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/tests/access-status"),
      ]);

      if (!subjectsRes.ok) {
        throw new Error("Failed to fetch subjects");
      }

      const subjectsData = await subjectsRes.json();
      setSubjects(subjectsData.subjects || []);

      if (accessRes.ok) {
        const accessData = await accessRes.json();
        setAccessStatus(accessData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (subjectId: string) => {
    if (!accessStatus?.can_take_new_tests) {
      setError("You cannot start new tests. Please check your subscription.");
      return;
    }

    setStartingTest(subjectId);
    setError(null);

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          start_immediately: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start test");
      }

      // Navigate to the test page
      router.push(`/dashboard/tests/${data.test.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start test");
      setStartingTest(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Practice Tests</h1>
        <p className="text-muted-foreground mt-2">
          Select a subject to start your practice test
        </p>
      </div>

      {/* Access Status Banner */}
      {accessStatus && !accessStatus.can_take_new_tests && (
        <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {accessStatus.is_in_grace_period
                  ? "Subscription in Grace Period"
                  : "Subscription Required"}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {accessStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {subjects.map((subject) => (
          <Card key={subject.id} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {iconMap[subject.icon || "book-open"] || (
                    <BookOpen className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <CardTitle>{subject.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subject.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{subject.duration_mins} mins</span>
                </div>
                <div className="flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                  <span>{subject.total_questions} questions</span>
                </div>
              </div>

              {subject.question_count < subject.total_questions && (
                <Badge variant="secondary" className="mb-4">
                  {subject.question_count} questions available
                </Badge>
              )}

              <Button
                className="w-full"
                onClick={() => handleStartTest(subject.id)}
                disabled={
                  !accessStatus?.can_take_new_tests ||
                  startingTest === subject.id ||
                  subject.question_count === 0
                }
              >
                {startingTest === subject.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Test
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Subjects Available</h3>
          <p className="text-muted-foreground">
            Please check back later for available tests.
          </p>
        </div>
      )}
    </div>
  );
}
