"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  BarChart3,
  ArrowRight,
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
  const percentage = test.percentage ?? 0;
  const totalQuestions = test.questions_order.length;
  const correct = test.answers?.filter((a) => a.is_correct).length || 0;
  const timeSpent = test.time_spent_secs || 0;

  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  const getGrade = (pct: number) => {
    if (pct >= 90) return { label: "Excellent!", color: "text-green-600", icon: Trophy };
    if (pct >= 70) return { label: "Great Job!", color: "text-blue-600", icon: CheckCircle2 };
    if (pct >= 50) return { label: "Good Effort!", color: "text-amber-600", icon: CheckCircle2 };
    return { label: "Keep Practicing!", color: "text-gray-600", icon: XCircle };
  };

  const grade = getGrade(percentage);
  const GradeIcon = grade.icon;

  return (
    <div className="min-h-screen bg-[#e8eef3] flex flex-col font-[family-name:var(--font-inter)]">
      <div className="bg-[#1a2744] text-white py-4 px-6">
        <h1 className="text-lg font-semibold">Test Complete</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Main result card */}
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-6">
              <GradeIcon className={`h-16 w-16 mx-auto ${grade.color}`} />
              <div>
                <h2 className={`text-3xl font-bold ${grade.color}`}>
                  {grade.label}
                </h2>
                <p className="text-gray-500 mt-1">{test.subject?.name}</p>
              </div>

              {/* Score */}
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={percentage >= 50 ? "#22c55e" : "#ef4444"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                      strokeDashoffset="62.75"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-5 w-5 mx-auto text-[#1a2744] mb-1" />
                <div className="text-lg font-bold text-gray-800">
                  {test.marks_obtained}/{test.total_marks}
                </div>
                <div className="text-xs text-gray-500">Marks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <div className="text-lg font-bold text-gray-800">
                  {correct}/{totalQuestions}
                </div>
                <div className="text-xs text-gray-500">Correct</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                <div className="text-lg font-bold text-gray-800">
                  {minutes}:{String(seconds).padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-500">Time</div>
              </CardContent>
            </Card>
          </div>

          {/* Score breakdown */}
          {test.score_breakdown && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-gray-800">Score Breakdown</h3>
                {(["easy", "medium", "hard"] as const).map((level) => {
                  const score = test.score_breakdown![level];
                  return (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            level === "easy"
                              ? "border-green-300 text-green-700"
                              : level === "medium"
                              ? "border-amber-300 text-amber-700"
                              : "border-red-300 text-red-700"
                          }
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {score.correct}/{score.total}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(score.percentage)}%
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onBackToDashboard}
            >
              Back to Dashboard
            </Button>
            <Button
              className="flex-1 bg-[#1a2744] hover:bg-[#1a2744]/90"
              onClick={onViewSolutions}
            >
              View Solutions
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
