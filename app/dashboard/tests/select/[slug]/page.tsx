"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Clock, HelpCircle } from "lucide-react";
import { TEST_CONFIG } from "@/lib/config/test-rules";
import type { Subject } from "@/types/test";

interface SubjectWithCount extends Subject {
  question_count: number;
}

export default function PracticeTestSelectPage() {
  const router = useRouter();
  const params = useParams();
  const subjectSlug = params.slug as string;

  const [subject, setSubject] = useState<SubjectWithCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingTest, setStartingTest] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectSlug]);

  const fetchSubject = async () => {
    try {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");

      const data = await res.json();
      const found = (data.subjects || []).find(
        (s: SubjectWithCount) => s.slug === subjectSlug
      );

      if (!found) {
        setError("Subject not found");
        return;
      }

      setSubject(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testNumber: number) => {
    if (!subject) return;

    setStartingTest(testNumber);
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
      setError(err instanceof Error ? err.message : "Failed to create test");
      setStartingTest(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8eef3] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a2744]" />
      </div>
    );
  }

  if (error && !subject) {
    return (
      <div className="min-h-screen bg-[#e8eef3] font-[family-name:var(--font-inter)]">
        <header className="bg-[#1a2744] text-white py-3">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/tests")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </header>
        <main className="flex items-center justify-center p-6 mt-20">
          <Card className="w-full max-w-md bg-white p-6 text-center">
            <p className="text-red-600">{error}</p>
          </Card>
        </main>
      </div>
    );
  }

  if (!subject) return null;

  const testCount = TEST_CONFIG.practiceTests.optionsPerSubject;

  return (
    <div className="min-h-screen bg-[#e8eef3] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <header className="bg-[#1a2744] text-white py-3">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/tests")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-56px)] p-6">
        <Card className="w-full max-w-md bg-white shadow-lg">
          <CardContent className="p-8">
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#1a2744]">
                {subject.name}
              </h1>
              <div className="w-full h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-500 mt-4" />
            </div>

            {/* Info row */}
            <div className="flex items-center justify-center gap-6 mb-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{subject.duration_mins} min</span>
              </div>
              <div className="flex items-center gap-1">
                <HelpCircle className="h-4 w-4" />
                <span>{subject.total_questions} questions</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* Practice Test Buttons */}
            <div className="space-y-3">
              {Array.from({ length: testCount }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => !startingTest && handleStartTest(num)}
                  disabled={startingTest !== null}
                  className="w-full py-4 px-6 bg-[#1a2744] text-white font-medium rounded-md
                    hover:bg-[#1a2744]/90 transition-colors text-center disabled:opacity-70
                    flex items-center justify-center gap-2"
                >
                  {startingTest === num ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    TEST_CONFIG.practiceTests.labelTemplate(num)
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Questions are dynamically generated based on your performance
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
