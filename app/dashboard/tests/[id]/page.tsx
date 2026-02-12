"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import type { Test, QuestionForTest, TestAnswer } from "@/types/test";

interface TestData {
  test: Test;
  questions: QuestionForTest[];
  is_read_only: boolean;
  can_continue: boolean;
}

export default function TestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [testData, setTestData] = useState<TestData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, TestAnswer["selected"]>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch test data
  useEffect(() => {
    fetchTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // Start timer when test loads
  useEffect(() => {
    if (testData?.test.status === "in_progress" && testData.test.started_at) {
      const startTime = new Date(testData.test.started_at).getTime();
      const duration = testData.test.duration_mins * 60 * 1000;
      const endTime = startTime + duration;

      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          // Time's up - auto submit
          handleSubmit();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testData?.test.status, testData?.test.started_at]);

  // Load existing answers
  useEffect(() => {
    if (testData?.test.answers) {
      const existingAnswers: Record<string, TestAnswer["selected"]> = {};
      for (const answer of testData.test.answers) {
        existingAnswers[answer.question_id] = answer.selected;
      }
      setAnswers(existingAnswers);
    }
  }, [testData?.test.answers]);

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load test");
      }

      setTestData(data);

      // If test is completed, redirect to review
      if (["submitted", "ended_early", "abandoned"].includes(data.test.status)) {
        router.replace(`/dashboard/tests/${testId}/review`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = useCallback(
    async (questionId: string, selected: TestAnswer["selected"]) => {
      setSaving(true);
      try {
        await fetch(`/api/tests/${testId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_answer",
            question_id: questionId,
            selected,
            time_spent_secs: 0, // TODO: Track per-question time
          }),
        });
      } catch (err) {
        console.error("Failed to save answer:", err);
      } finally {
        setSaving(false);
      }
    },
    [testId]
  );

  const handleAnswerChange = (questionId: string, selected: TestAnswer["selected"]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selected }));

    // Debounce auto-save
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveAnswer(questionId, selected);
    }, 500);
  };

  const handleEndEarly = async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end_early" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to end test");
      }

      router.push("/dashboard/tests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end test");
      setShowEndConfirm(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setShowSubmitConfirm(false);

    try {
      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit test");
      }

      router.push(`/dashboard/tests/${testId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit test");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = testData?.questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(
    (id) => answers[id] !== null && answers[id] !== undefined
  ).length;

  // Check if within grace period (first 3 minutes)
  const isInGracePeriod = () => {
    if (!testData?.test.started_at || !testData.test.duration_mins) return false;
    const startTime = new Date(testData.test.started_at).getTime();
    const elapsed = (Date.now() - startTime) / (1000 * 60);
    return elapsed <= 3;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !testData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/dashboard/tests")}>
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!testData || !currentQuestion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold">
                {testData.test.subject?.name || "Test"}
              </h1>
              <Badge variant="outline">
                Question {currentIndex + 1} of {testData.questions.length}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  timeLeft < 300
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span className="font-mono font-semibold">
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Save indicator */}
              {saving && (
                <span className="text-sm text-muted-foreground">Saving...</span>
              )}

              {/* End Early (only in grace period) */}
              {isInGracePeriod() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEndConfirm(true)}
                >
                  <X className="h-4 w-4 mr-2" />
                  End Test
                </Button>
              )}

              {/* Submit */}
              <Button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                {/* Passage (if any) */}
                {currentQuestion.passage && (
                  <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <h3 className="font-semibold mb-2">
                      {currentQuestion.passage.title || "Passage"}
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">
                        {currentQuestion.passage.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Question */}
                <div className="mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Badge variant="secondary">
                      Q{currentIndex + 1}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {currentQuestion.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      {currentQuestion.marks} mark{currentQuestion.marks > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <QuestionRenderer
                    question={currentQuestion}
                    selectedAnswer={answers[currentQuestion.id]}
                    onAnswerChange={(selected) =>
                      handleAnswerChange(currentQuestion.id, selected)
                    }
                  />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <Button
                    onClick={() =>
                      setCurrentIndex((i) =>
                        Math.min(testData.questions.length - 1, i + 1)
                      )
                    }
                    disabled={currentIndex === testData.questions.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Questions</h3>
                <div className="text-sm text-muted-foreground mb-4">
                  {answeredCount} of {testData.questions.length} answered
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {testData.questions.map((q, idx) => {
                    const isAnswered =
                      answers[q.id] !== null && answers[q.id] !== undefined;
                    const isCurrent = idx === currentIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`
                          w-full aspect-square rounded-lg text-sm font-medium
                          flex items-center justify-center transition-colors
                          ${
                            isCurrent
                              ? "bg-blue-600 text-white"
                              : isAnswered
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          }
                        `}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-neutral-100 dark:bg-neutral-800" />
                    <span>Not answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-600" />
                    <span>Current</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* End Early Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">End Test Early?</h2>
                <p className="text-muted-foreground mb-6">
                  You are still within the grace period. Ending now will discard
                  all your answers. Are you sure?
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowEndConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleEndEarly}>
                    Yes, End Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Submit Test?</h2>
                <p className="text-muted-foreground mb-2">
                  You have answered {answeredCount} of{" "}
                  {testData.questions.length} questions.
                </p>
                {answeredCount < testData.questions.length && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm mb-4">
                    {testData.questions.length - answeredCount} questions are
                    unanswered!
                  </p>
                )}
                <div className="flex gap-3 justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowSubmitConfirm(false)}
                  >
                    Review Answers
                  </Button>
                  <Button onClick={handleSubmit}>Submit Test</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Question Renderer Component
function QuestionRenderer({
  question,
  selectedAnswer,
  onAnswerChange,
}: {
  question: QuestionForTest;
  selectedAnswer: TestAnswer["selected"];
  onAnswerChange: (selected: TestAnswer["selected"]) => void;
}) {
  const content = question.content as unknown as Record<string, unknown>;

  switch (question.question_type) {
    case "mcq":
    case "passage_mcq":
    case "poem_mcq":
      return (
        <MCQQuestion
          questionText={content.question_text as string}
          questionImage={content.question_image as string | undefined}
          options={content.options as Array<{ key: string; text?: string; image?: string }>}
          selectedAnswer={selectedAnswer as string | null}
          onAnswerChange={onAnswerChange}
        />
      );

    case "fill_blank_dropdown":
      return (
        <FillBlankQuestion
          passageText={content.passage_text as string}
          blanks={content.blanks as Array<{ position: number; options: string[] }>}
          selectedAnswers={selectedAnswer as number[] | null}
          onAnswerChange={onAnswerChange}
        />
      );

    case "essay":
      return (
        <EssayQuestion
          prompt={content.prompt as string}
          wordLimit={content.word_limit as number}
          currentText={selectedAnswer as string | null}
          onAnswerChange={onAnswerChange}
        />
      );

    default:
      return (
        <div className="text-muted-foreground">
          Question type not supported: {question.question_type}
        </div>
      );
  }
}

// MCQ Question Component
function MCQQuestion({
  questionText,
  questionImage,
  options,
  selectedAnswer,
  onAnswerChange,
}: {
  questionText: string;
  questionImage?: string;
  options: Array<{ key: string; text?: string; image?: string }>;
  selectedAnswer: string | null;
  onAnswerChange: (selected: string) => void;
}) {
  return (
    <div>
      <p className="text-lg mb-4">{questionText}</p>
      {questionImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={questionImage}
          alt="Question"
          className="max-w-md mb-4 rounded-lg"
        />
      )}
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.key}
            onClick={() => onAnswerChange(option.key)}
            className={`
              w-full p-4 rounded-lg border text-left transition-colors
              ${
                selectedAnswer === option.key
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <span
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${
                    selectedAnswer === option.key
                      ? "bg-blue-500 text-white"
                      : "bg-neutral-200 dark:bg-neutral-700"
                  }
                `}
              >
                {option.key}
              </span>
              <div className="flex-1">
                {option.text && <span>{option.text}</span>}
                {option.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.image}
                    alt={`Option ${option.key}`}
                    className="max-w-xs mt-2 rounded"
                  />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Fill in the Blank Question Component
function FillBlankQuestion({
  passageText,
  blanks,
  selectedAnswers,
  onAnswerChange,
}: {
  passageText: string;
  blanks: Array<{ position: number; options: string[] }>;
  selectedAnswers: number[] | null;
  onAnswerChange: (selected: number[]) => void;
}) {
  const handleBlankChange = (position: number, optionIndex: number) => {
    const newAnswers = [...(selectedAnswers || new Array(blanks.length).fill(-1))];
    newAnswers[position - 1] = optionIndex;
    onAnswerChange(newAnswers);
  };

  // Replace blanks with dropdowns
  const parts = passageText.split(/___/);

  return (
    <div className="prose dark:prose-invert max-w-none">
      <p className="text-lg leading-relaxed">
        {parts.map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < blanks.length && (
              <select
                value={selectedAnswers?.[idx] ?? -1}
                onChange={(e) =>
                  handleBlankChange(idx + 1, parseInt(e.target.value))
                }
                className="mx-1 px-2 py-1 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600"
              >
                <option value={-1}>Select...</option>
                {blanks[idx]?.options.map((option, optIdx) => (
                  <option key={optIdx} value={optIdx}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}

// Essay Question Component
function EssayQuestion({
  prompt,
  wordLimit,
  currentText,
  onAnswerChange,
}: {
  prompt: string;
  wordLimit: number;
  currentText: string | null;
  onAnswerChange: (selected: string) => void;
}) {
  const wordCount = (currentText || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div>
      <p className="text-lg mb-4">{prompt}</p>
      <div className="mb-2 text-sm text-muted-foreground">
        Word limit: {wordLimit} words | Current: {wordCount} words
      </div>
      <textarea
        value={currentText || ""}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Write your essay here..."
        className="w-full h-64 p-4 rounded-lg border bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 resize-none"
      />
      {wordCount > wordLimit && (
        <p className="text-red-500 text-sm mt-2">
          You have exceeded the word limit!
        </p>
      )}
    </div>
  );
}
