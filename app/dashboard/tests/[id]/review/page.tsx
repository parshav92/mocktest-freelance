"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    Trophy,
    Target,
    Loader2,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

interface ReviewQuestion {
    question_number: number;
    question: {
        id: string;
        code: string;
        question_type: string;
        difficulty: string;
        content: Record<string, unknown>;
        marks: number;
        correct_answer: Record<string, unknown>;
        solution_text: string | null;
        passage?: {
            title: string;
            content: string;
        };
    };
    student_answer: unknown;
    is_correct: boolean;
    marks_earned: number;
    time_spent_secs: number;
    was_attempted: boolean;
}

interface ReviewData {
    test: {
        id: string;
        status: string;
        started_at: string;
        ended_at: string;
        subject: {
            name: string;
            slug: string;
        };
    };
    questions: ReviewQuestion[];
    summary: {
        total_questions: number;
        attempted: number;
        unattempted: number;
        correct: number;
        incorrect: number;
        marks_obtained: number;
        total_marks: number;
        percentage: number;
        time_spent_secs: number;
        duration_mins: number;
        score_breakdown: {
            easy: { total: number; correct: number; percentage: number };
            medium: { total: number; correct: number; percentage: number };
            hard: { total: number; correct: number; percentage: number };
        };
    };
    is_read_only: boolean;
}

export default function TestReviewPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    const [reviewData, setReviewData] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
        new Set(),
    );

    useEffect(() => {
        fetchReview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId]);

    const fetchReview = async () => {
        try {
            const res = await fetch(`/api/tests/${testId}/review`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load review");
            }

            setReviewData(data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load review",
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestion = (index: number) => {
        setExpandedQuestions((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage >= 80) return "text-green-600 dark:text-green-400";
        if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !reviewData) {
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

    const { test, questions, summary } = reviewData;

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            {/* Header */}
            <header className="bg-white dark:bg-neutral-900 border-b">
                <div className="container mx-auto px-4 py-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/dashboard/tests")}
                        className="mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Tests
                    </Button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {test.subject.name} - Results
                            </h1>
                            <p className="text-muted-foreground">
                                {new Date(test.ended_at).toLocaleDateString(
                                    "en-AU",
                                    {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    },
                                )}
                            </p>
                        </div>

                        <Badge
                            variant={
                                test.status === "submitted"
                                    ? "default"
                                    : "secondary"
                            }
                            className="w-fit"
                        >
                            {test.status === "submitted"
                                ? "Completed"
                                : test.status === "ended_early"
                                  ? "Ended Early"
                                  : "Abandoned"}
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                    <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Score
                                    </p>
                                    <p
                                        className={`text-2xl font-bold ${getPercentageColor(summary.percentage)}`}
                                    >
                                        {summary.percentage.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Correct
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {summary.correct}/
                                        {summary.total_questions}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                    <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Marks
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {summary.marks_obtained}/
                                        {summary.total_marks}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                                    <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Time
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {formatTime(summary.time_spent_secs)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Difficulty Breakdown */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Performance by Difficulty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {(["easy", "medium", "hard"] as const).map(
                                (level) => {
                                    const data = summary.score_breakdown[level];
                                    return (
                                        <div
                                            key={level}
                                            className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium capitalize">
                                                    {level}
                                                </span>
                                                <Badge variant="outline">
                                                    {data.correct}/{data.total}
                                                </Badge>
                                            </div>
                                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${
                                                        data.percentage >= 80
                                                            ? "bg-green-500"
                                                            : data.percentage >=
                                                                60
                                                              ? "bg-yellow-500"
                                                              : "bg-red-500"
                                                    }`}
                                                    style={{
                                                        width: `${data.percentage}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {data.percentage}% correct
                                            </p>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Questions List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Question Review</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {questions.map((item, idx) => (
                            <div
                                key={item.question.id}
                                className={`border rounded-lg overflow-hidden ${
                                    item.is_correct
                                        ? "border-green-200 dark:border-green-800"
                                        : "border-red-200 dark:border-red-800"
                                }`}
                            >
                                {/* Question Header */}
                                <button
                                    onClick={() => toggleQuestion(idx)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {item.is_correct ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                        <span className="font-medium">
                                            Question {item.question_number}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="capitalize"
                                        >
                                            {item.question.difficulty}
                                        </Badge>
                                        <Badge variant="outline">
                                            {item.question.question_type.replace(
                                                /_/g,
                                                " ",
                                            )}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-muted-foreground">
                                            {item.marks_earned}/
                                            {item.question.marks} marks
                                        </span>
                                        {expandedQuestions.has(idx) ? (
                                            <ChevronUp className="h-5 w-5" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5" />
                                        )}
                                    </div>
                                </button>

                                {/* Question Details */}
                                {expandedQuestions.has(idx) && (
                                    <div className="p-4 pt-0 border-t">
                                        {/* Passage */}
                                        {item.question.passage && (
                                            <div className="mb-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                                                <h4 className="font-medium mb-2">
                                                    {item.question.passage
                                                        .title || "Passage"}
                                                </h4>
                                                <p className="text-sm whitespace-pre-wrap">
                                                    {
                                                        item.question.passage
                                                            .content
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        {/* Question Content */}
                                        <div className="mb-4">
                                            <h4 className="font-medium mb-2">
                                                Question:
                                            </h4>
                                            <QuestionDisplay
                                                question={item.question}
                                                studentAnswer={
                                                    item.student_answer
                                                }
                                                wasAttempted={
                                                    item.was_attempted
                                                }
                                            />
                                        </div>

                                        {/* Solution */}
                                        {item.question.solution_text && (
                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">
                                                    Solution:
                                                </h4>
                                                <p className="text-sm">
                                                    {
                                                        item.question
                                                            .solution_text
                                                    }
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

// Question Display Component
function QuestionDisplay({
    question,
    studentAnswer,
    wasAttempted,
}: {
    question: ReviewQuestion["question"];
    studentAnswer: unknown;
    wasAttempted: boolean;
}) {
    const content = question.content;
    const correctAnswer = question.correct_answer;

    switch (question.question_type) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq": {
            const questionText = content.question as string;
            const options = content.options as Array<{
                label: string;
                text?: string;
                image_url?: string;
            }>;
            const correctLabel = (
                correctAnswer as { label: string }
            ).label.toUpperCase();
            const studentLabel = (studentAnswer as string)?.toUpperCase();

            return (
                <div>
                    <p className="mb-4">{questionText}</p>
                    <div className="space-y-2">
                        {options.map((option, index) => {
                            const optionLabel = option.label.toUpperCase();
                            const isCorrect = optionLabel === correctLabel;
                            const isSelected = optionLabel === studentLabel;

                            return (
                                <div
                                    key={`mcq-opt-${index}`}
                                    className={`p-3 rounded-lg border ${
                                        isCorrect
                                            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                                            : isSelected
                                              ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                                              : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                isCorrect
                                                    ? "bg-green-500 text-white"
                                                    : isSelected
                                                      ? "bg-red-500 text-white"
                                                      : "bg-neutral-300 dark:bg-neutral-600 text-white"
                                            }`}
                                        >
                                            {optionLabel}
                                        </span>
                                        <span className="flex-1">
                                            {option.text}
                                        </span>
                                        {isCorrect && (
                                            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                                        )}
                                        {isSelected && !isCorrect && (
                                            <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {!wasAttempted && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                            Not attempted
                        </p>
                    )}
                </div>
            );
        }

        case "fill_blank_dropdown": {
            const passageText = content.passage_text as string;
            const blanks = content.blanks as Array<{
                position: number;
                options: string[];
                correct_index: number;
            }>;
            const studentAnswers = (studentAnswer as number[]) || [];
            const correctAnswers = (correctAnswer as { answers: number[] })
                .answers;

            return (
                <div>
                    <p className="mb-4">Fill in the blanks:</p>
                    <p className="mb-4 text-muted-foreground">{passageText}</p>
                    <div className="space-y-2">
                        {blanks.map((blank, idx) => {
                            const isCorrect =
                                studentAnswers[idx] === correctAnswers[idx];
                            const studentOption =
                                blank.options[studentAnswers[idx]];
                            const correctOption =
                                blank.options[correctAnswers[idx]];

                            return (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <span className="font-medium">
                                        Blank {idx + 1}:
                                    </span>
                                    <span
                                        className={
                                            isCorrect
                                                ? "text-green-600"
                                                : "text-red-600 line-through"
                                        }
                                    >
                                        {studentOption || "Not answered"}
                                    </span>
                                    {!isCorrect && (
                                        <>
                                            <span>→</span>
                                            <span className="text-green-600">
                                                {correctOption}
                                            </span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        case "essay": {
            const prompt = content.prompt as string;
            const essayText = studentAnswer as string;

            return (
                <div>
                    <p className="mb-4 font-medium">{prompt}</p>
                    <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                        <p className="whitespace-pre-wrap">
                            {essayText || "No response"}
                        </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Essays are evaluated by AI. Score may vary.
                    </p>
                </div>
            );
        }

        default:
            return (
                <p className="text-muted-foreground">
                    Question type not supported for review
                </p>
            );
    }
}
