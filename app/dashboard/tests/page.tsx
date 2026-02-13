"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import type { Subject } from "@/types/test";

export default function SubjectSelectionPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data.subjects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubject = (subject: Subject) => {
    router.push(`/dashboard/tests/select/${subject.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8eef3] flex items-center justify-center font-[family-name:var(--font-inter)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a2744]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8eef3] font-[family-name:var(--font-inter)]">
      {/* Header */}
      <header className="bg-[#1a2744] text-white py-3">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-56px)] p-6">
        <Card className="w-full max-w-md bg-white shadow-lg">
          <CardContent className="p-8">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#1a2744] leading-tight">
                Selective High School Placement
              </h1>
              <h2 className="text-2xl font-bold text-[#1a2744]">
                Practice Test
              </h2>
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
                  onClick={() => handleSelectSubject(subject)}
                  className="w-full py-4 px-6 bg-[#1a2744] text-white font-medium rounded-md
                    hover:bg-[#1a2744]/90 transition-colors text-center"
                >
                  {subject.name}
                </button>
              ))}
            </div>

            {subjects.length === 0 && !error && (
              <p className="text-center text-gray-500">
                No subjects available at the moment.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
