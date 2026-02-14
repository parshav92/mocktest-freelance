"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import type { Test } from "@/types/test";

interface PostSubmitResultProps {
  test: Test;
  onViewSolutions: () => void;
  onBackToDashboard: () => void;
}

export function PostSubmitResult({
  test,
  onViewSolutions,
  onBackToDashboard,
}: PostSubmitResultProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const percentage = test.percentage ?? 0;
  const totalQuestions = test.questions_order.length;
  const correct = test.answers?.filter((a) => a.is_correct).length || 0;
  const incorrect = totalQuestions - correct;
  const timeSpent = test.time_spent_secs || 0;
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;
  const avgTimeSecs =
    totalQuestions > 0 ? Math.round(timeSpent / totalQuestions) : 0;

  const getHeadline = (pct: number) => {
    if (pct >= 90) return "Outstanding performance.";
    if (pct >= 75) return "Strong result overall.";
    if (pct >= 60) return "Solid effort, room to grow.";
    if (pct >= 40) return "Accuracy needs improvement.";
    return "Keep practicing consistently.";
  };

  const getSubtext = (pct: number) => {
    if (pct >= 90)
      return "You demonstrated excellent command across all difficulty levels.";
    if (pct >= 75)
      return "A few tricky questions slipped through. Review the solutions to close the gaps.";
    if (pct >= 60)
      return "You have a good foundation. Focus on medium and hard level questions next.";
    if (pct >= 40)
      return "Spend more time on fundamentals before attempting harder questions.";
    return "Consider reviewing the concepts first, then re-attempt a practice test.";
  };

  const getRecommendation = (pct: number) => {
    if (pct >= 90)
      return "Challenge yourself with harder subjects or timed practice to maintain your edge.";
    if (pct >= 75)
      return "Review incorrect answers carefully and retry similar question types.";
    if (pct >= 60)
      return "Focus on one weak area at a time. Consistent daily practice yields the best gains.";
    if (pct >= 40)
      return "Go through solutions for every missed question before your next attempt.";
    return "Start with easy-level questions to build confidence, then gradually increase difficulty.";
  };

  const circumference = 2 * Math.PI * 54;
  const strokeOffset = circumference - (percentage / 100) * circumference;
  const progressColor =
    percentage >= 75
      ? "#22c55e"
      : percentage >= 50
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 font-[family-name:var(--font-inter)]">
      {/* Thin top accent */}
      <div className="h-1 bg-[#1a2744]" />

      <div className="w-full max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {/* ================================================
            HERO SECTION
        ================================================ */}
        <div
          className={`transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-6">
            {test.subject?.name} — Test Complete
          </p>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">
            {/* Left: Score + headline */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-4 mb-3">
                <span className="text-6xl md:text-7xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                  {Math.round(percentage)}
                  <span className="text-3xl md:text-4xl font-bold text-slate-400">
                    %
                  </span>
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">
                {getHeadline(percentage)}
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                {getSubtext(percentage)}
              </p>
            </div>

            {/* Right: Progress ring */}
            <div className="shrink-0 self-center md:self-auto">
              <div className="relative w-36 h-36 md:w-40 md:h-40">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 120 120"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="7"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke={progressColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={mounted ? strokeOffset : circumference}
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-medium text-slate-500">
                    {correct}/{totalQuestions}
                  </span>
                  <span className="text-[11px] text-slate-400">correct</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 my-10" />

        {/* ================================================
            STATS CARDS
        ================================================ */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all duration-700 delay-200 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <BarChart3 className="h-5 w-5 text-slate-400 mb-3" />
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {test.marks_obtained}
              <span className="text-base font-normal text-slate-400">
                /{test.total_marks}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Total Marks</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <CheckCircle2 className="h-5 w-5 text-slate-400 mb-3" />
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {correct}
              <span className="text-base font-normal text-slate-400">
                {" "}
                correct
              </span>
              <span className="text-sm font-normal text-slate-300 ml-1">
                / {incorrect} wrong
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Out of {totalQuestions} questions</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <Clock className="h-5 w-5 text-slate-400 mb-3" />
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {minutes}
              <span className="text-base font-normal text-slate-400">m </span>
              {String(seconds).padStart(2, "0")}
              <span className="text-base font-normal text-slate-400">s</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Time Taken</p>
          </div>
        </div>

        {/* ================================================
            INSIGHTS
        ================================================ */}
      

        {/* ================================================
            ACTIONS
        ================================================ */}
        <div
          className={`mt-10 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 transition-all duration-700 delay-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <Button
            variant="outline"
            onClick={onBackToDashboard}
            className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            onClick={onViewSolutions}
            className="w-full sm:w-auto bg-[#1a2744] hover:bg-[#1a2744]/90 shadow-sm transition-colors"
          >
            Review Solutions
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
