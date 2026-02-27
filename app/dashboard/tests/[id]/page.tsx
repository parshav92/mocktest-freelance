"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, stripHtmlToText } from "@/lib/utils";
import {
    ArrowLeft,
    ArrowRight,
    Flag,
    Clock,
    Eye,
    EyeOff,
    Loader2,
    LogOut,
    Send,
} from "lucide-react";
import { TEST_CONFIG } from "@/lib/config/test-rules";
import { InstructionPages } from "@/components/test/instruction-pages";
import { QuestionRenderer } from "@/components/test/question-renderers";
import {
    ProgressSummary,
    PreSubmitSummary,
} from "@/components/test/progress-summary";
import {
    StartConfirmation,
    AntiCheatWarning,
} from "@/components/test/confirmation-modal";
import { PostSubmitResult } from "@/components/test/post-submit-result";
import { useTimer } from "@/hooks/use-timer";
import { useAntiCheat } from "@/hooks/use-anti-cheat";
import type {
    Test,
    QuestionForTest,
    Passage,
    InstructionPage,
} from "@/types/test";

// ============================================
// LOCAL STORAGE HELPERS (essay draft persistence)
// ============================================
const ESSAY_DRAFT_PREFIX = "test_essay_draft:";

function getLocalEssayDrafts(testId: string): Record<string, string> {
    try {
        const raw = localStorage.getItem(`${ESSAY_DRAFT_PREFIX}${testId}`);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveLocalEssayDraft(
    testId: string,
    questionId: string,
    content: string,
): void {
    try {
        const drafts = getLocalEssayDrafts(testId);
        drafts[questionId] = content;
        localStorage.setItem(
            `${ESSAY_DRAFT_PREFIX}${testId}`,
            JSON.stringify(drafts),
        );
    } catch {
        // Storage full or unavailable — silent fail
    }
}

function clearLocalEssayDrafts(testId: string): void {
    try {
        localStorage.removeItem(`${ESSAY_DRAFT_PREFIX}${testId}`);
    } catch {
        // Silent fail
    }
}

// ============================================
// TEST PHASES
// ============================================
type TestPhase =
    | "loading"
    | "instructions"
    | "confirmation"
    | "enter-fullscreen"
    | "testing"
    | "pre-submit"
    | "submitting"
    | "result";

export default function TestEnvironmentPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    // ============================================
    // STATE
    // ============================================
    const [phase, setPhase] = useState<TestPhase>("loading");
    const [error, setError] = useState<string | null>(null);

    // Test data
    const [test, setTest] = useState<Test | null>(null);
    const [questions, setQuestions] = useState<QuestionForTest[]>([]);
    const [subject, setSubject] = useState<{
        name: string;
        instructions: InstructionPage[] | null;
        duration_mins: number;
    } | null>(null);

    // Question state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<
        Record<string, string | number[] | Record<string, number>>
    >({});
    const [flaggedSet, setFlaggedSet] = useState<Set<string>>(new Set());
    const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());

    // UI state
    const [warningMessage, setWarningMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for auto-save debouncing
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<Record<string, unknown>>({});

    // ============================================
    // CURRENT QUESTION
    // ============================================
    const currentQuestion = questions[currentIndex] || null;
    const questionsOrder = test?.questions_order || [];

    // Memoize current answer to avoid unnecessary recalculations
    const currentAnswer = useMemo(
        () => (currentQuestion ? (answers[currentQuestion.id] ?? null) : null),
        [currentQuestion, answers],
    );

    // Memoize answered set to avoid recreation on every render
    // For essays, check that content is not empty (Tiptap emits <p></p> on init)
    const answeredSet = useMemo(() => {
        const set = new Set<string>();
        for (const [qId, answer] of Object.entries(answers)) {
            const question = questions.find((q) => q.id === qId);
            if (!question) continue;

            if (question.question_type === "essay") {
                // Essay: only count as answered if there's actual text content
                const text =
                    typeof answer === "string"
                        ? stripHtmlToText(answer).trim()
                        : "";
                if (text.length > 0) {
                    set.add(qId);
                }
            } else {
                // Other types: any answer counts
                set.add(qId);
            }
        }
        return set;
    }, [answers, questions]);

    // ============================================
    // TIMER
    // ============================================
    const timer = useTimer({
        durationMins: test?.duration_mins || 0,
        startedAt: test?.started_at || null,
        isRunning: phase === "testing",
        onTimeout: () =>
            handleAutoSubmit(
                "Time is up! Your test has been automatically submitted.",
            ),
    });

    // ============================================
    // ANTI-CHEAT
    // ============================================
    const antiCheat = useAntiCheat({
        enabled: phase === "testing",
        onAutoSubmit: () =>
            handleAutoSubmit(TEST_CONFIG.antiCheat.autoSubmitMessage),
        onWarning: (message) => setWarningMessage(message),
    });

    // ============================================
    // LOAD TEST DATA
    // ============================================
    const loadTest = useCallback(async () => {
        try {
            const res = await fetch(`/api/tests/${testId}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to load test");

            const testData: Test = data.test;
            const questionsData: QuestionForTest[] = data.questions;

            setTest(testData);
            setQuestions(questionsData);
            setSubject(
                testData.subject
                    ? {
                          name: testData.subject.name,
                          instructions: (() => {
                              const raw = testData.subject
                                  .instructions as unknown;
                              if (!raw) return null;
                              // DB stores { pages: [...] } JSONB
                              if (
                                  typeof raw === "object" &&
                                  raw !== null &&
                                  "pages" in raw
                              ) {
                                  return (raw as { pages: InstructionPage[] })
                                      .pages;
                              }
                              // Already an array
                              if (Array.isArray(raw))
                                  return raw as InstructionPage[];
                              return null;
                          })(),
                          duration_mins: testData.subject.duration_mins,
                      }
                    : null,
            );

            // Restore answers if resuming
            const restoredAnswers: Record<
                string,
                string | number[] | Record<string, number>
            > = {};
            if (testData.answers?.length) {
                for (const a of testData.answers) {
                    if (a.selected !== null && a.selected !== undefined) {
                        restoredAnswers[a.question_id] = a.selected as
                            | string
                            | number[]
                            | Record<string, number>;
                    }
                }
            }

            // Seed lastSavedRef with DB answers so they're skipped on submit
            // (they're already persisted — no need to re-save)
            for (const [qId, val] of Object.entries(restoredAnswers)) {
                lastSavedRef.current[qId] = val;
            }

            // Merge localStorage essay drafts (takes priority — more recent)
            const localDrafts = getLocalEssayDrafts(testId);
            for (const [qId, draft] of Object.entries(localDrafts)) {
                if (draft && testData.questions_order.includes(qId)) {
                    restoredAnswers[qId] = draft;
                    // Don't add to lastSavedRef — these need to be saved to DB on submit
                }
            }

            setAnswers(restoredAnswers);

            // Determine starting phase
            if (testData.status === "in_progress") {
                if (TEST_CONFIG.antiCheat.requireFullscreen) {
                    // Will enter fullscreen once component mounts and user interacts
                    setPhase("enter-fullscreen");
                } else {
                    setPhase("testing");
                }
                // Mark all as visited since we can't track from before
                setVisitedSet(new Set(testData.questions_order));
            } else if (
                testData.status === "submitted" ||
                testData.status === "ended_early"
            ) {
                // Already completed — show result
                setPhase("result");
            } else {
                // Not started — show instructions
                setPhase("instructions");
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load test",
            );
            setPhase("loading");
        }
    }, [testId]);

    useEffect(() => {
        loadTest();
    }, [loadTest]);

    // Cleanup debounce timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // ============================================
    // MARK VISITED ON INDEX CHANGE
    // ============================================
    useEffect(() => {
        if (phase === "testing" && currentQuestion) {
            setVisitedSet((prev) => {
                const next = new Set(prev);
                next.add(currentQuestion.id);
                return next;
            });
        }
    }, [currentIndex, currentQuestion, phase]);

    // ============================================
    // AUTO-SAVE ANSWER
    // ============================================
    const saveAnswer = useCallback(
        async (
            questionId: string,
            selected: string | number[] | Record<string, number>,
        ) => {
            // Skip if same as last saved
            if (
                JSON.stringify(lastSavedRef.current[questionId]) ===
                JSON.stringify(selected)
            ) {
                return;
            }

            try {
                await fetch(`/api/tests/${testId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "save_answer",
                        question_id: questionId,
                        selected,
                        time_spent_secs: 0,
                    }),
                });
                lastSavedRef.current[questionId] = selected;
            } catch {
                // Silent fail for auto-save — answer is preserved in state
            }
        },
        [testId],
    );

    const debouncedSave = useCallback(
        (
            questionId: string,
            selected: string | number[] | Record<string, number>,
        ) => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveAnswer(questionId, selected);
            }, TEST_CONFIG.navigation.autoSaveDebounceMs);
        },
        [saveAnswer],
    );

    // ============================================
    // HELPERS
    // ============================================
    /** Check if a question ID belongs to an essay question */
    const isEssayQuestion = useCallback(
        (questionId: string): boolean => {
            return questions.some(
                (q) => q.id === questionId && q.question_type === "essay",
            );
        },
        [questions],
    );

    // ============================================
    // HANDLERS
    // ============================================
    const handleAnswer = useCallback(
        (value: string | number[] | Record<string, number>) => {
            if (!currentQuestion) return;
            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));

            // Essays: save to localStorage only (no API call)
            // Other types: auto-save via API as before
            if (currentQuestion.question_type === "essay") {
                saveLocalEssayDraft(
                    testId,
                    currentQuestion.id,
                    value as string,
                );
            } else if (TEST_CONFIG.navigation.autoSaveOnNavigate) {
                debouncedSave(currentQuestion.id, value);
            }
        },
        [currentQuestion, debouncedSave, testId],
    );

    const handleNavigate = useCallback(
        (direction: "prev" | "next") => {
            // Save current answer before navigating (skip essays — they use localStorage)
            if (
                currentQuestion &&
                answers[currentQuestion.id] !== undefined &&
                !isEssayQuestion(currentQuestion.id)
            ) {
                saveAnswer(currentQuestion.id, answers[currentQuestion.id]);
            }

            if (direction === "next") {
                if (currentIndex < questions.length - 1) {
                    setCurrentIndex((i) => i + 1);
                } else {
                    // Last question — go to pre-submit
                    if (TEST_CONFIG.submit.showPreSubmitSummary) {
                        setPhase("pre-submit");
                    }
                }
            } else {
                if (
                    currentIndex > 0 &&
                    TEST_CONFIG.navigation.allowBackNavigation
                ) {
                    setCurrentIndex((i) => i - 1);
                }
            }
        },
        [
            currentQuestion,
            answers,
            saveAnswer,
            isEssayQuestion,
            currentIndex,
            questions.length,
        ],
    );

    const handleJumpTo = useCallback(
        (index: number) => {
            if (TEST_CONFIG.navigation.allowQuestionJump) {
                // Save current answer before jumping (skip essays — they use localStorage)
                if (
                    currentQuestion &&
                    answers[currentQuestion.id] !== undefined &&
                    !isEssayQuestion(currentQuestion.id)
                ) {
                    saveAnswer(currentQuestion.id, answers[currentQuestion.id]);
                }
                setCurrentIndex(index);
            }
        },
        [currentQuestion, answers, saveAnswer, isEssayQuestion],
    );

    const handleToggleFlag = useCallback(() => {
        if (!currentQuestion || !TEST_CONFIG.flag.enabled) return;
        setFlaggedSet((prev) => {
            const next = new Set(prev);
            if (next.has(currentQuestion.id)) {
                next.delete(currentQuestion.id);
            } else {
                next.add(currentQuestion.id);
            }
            return next;
        });
    }, [currentQuestion]);

    const handleInstructionsComplete = () => {
        // If opening in new tab with fullscreen required, skip the modal and go directly
        if (
            TEST_CONFIG.antiCheat.openInNewTab &&
            TEST_CONFIG.antiCheat.requireFullscreen
        ) {
            handleStartTest();
        } else if (TEST_CONFIG.instructions.requireStartConfirmation) {
            setPhase("confirmation");
        } else {
            handleStartTest();
        }
    };

    const handleStartTest = async () => {
        try {
            const res = await fetch(`/api/tests/${testId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to start test");

            // Open test in a new browser tab if configured
            if (TEST_CONFIG.antiCheat.openInNewTab) {
                const testUrl = `/dashboard/tests/${testId}?mode=test`;
                const newWindow = window.open(testUrl, "_blank");
                if (newWindow) {
                    router.replace("/dashboard");
                    return;
                }
                // Popup blocked — fall through to same-tab fullscreen
            }

            setTest(data.test);
            setQuestions(data.questions);

            // Enter fullscreen automatically
            if (TEST_CONFIG.antiCheat.requireFullscreen) {
                await antiCheat.enterFullscreen();
            }
            setPhase("testing");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to start test",
            );
        }
    };

    const handleEnterFullscreen = async () => {
        await antiCheat.enterFullscreen();
        setPhase("testing");
    };

    const handleWarningDismiss = async () => {
        setWarningMessage(null);
        // Re-enter fullscreen after user acknowledges the warning
        if (TEST_CONFIG.antiCheat.requireFullscreen) {
            await antiCheat.enterFullscreen();
        }
    };

    const handleSubmitTest = async () => {
        setIsSubmitting(true);
        setPhase("submitting");

        try {
            // Save all answers to DB sequentially before submitting.
            // Sequential to avoid race conditions — each saveAnswer reads
            // the full answers array from DB, merges one answer, and writes
            // back. Parallel writes would clobber each other.
            // Note: lastSavedRef is seeded with DB answers on load, so only
            // truly changed answers (e.g. essays from localStorage) hit the API.
            for (const [questionId, selected] of Object.entries(answers)) {
                await saveAnswer(questionId, selected);
            }

            const res = await fetch(`/api/tests/${testId}/submit`, {
                method: "POST",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit test");

            // Clear localStorage essay drafts after successful submit
            clearLocalEssayDrafts(testId);

            setTest(data.test);
            antiCheat.exitFullscreen();
            setPhase("result");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to submit test",
            );
            setPhase("testing");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAutoSubmit = useCallback(async (reason: string) => {
        setWarningMessage(null);
        // Don't set error before submit - let the submit handle its own errors
        // Show the reason after successful submit or as final message
        try {
            await handleSubmitTest();
            // After successful submit, show the reason (e.g., "Time is up!")
            setError(reason);
        } catch {
            // Submit failed - its own error is already set
        }
    }, []);

    const handleEndTestEarly = async () => {
        try {
            const res = await fetch(`/api/tests/${testId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end_early" }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to end test");

            setTest(data.test);
            antiCheat.exitFullscreen();
            setPhase("result");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to end test");
        }
    };

    // ============================================
    // PASSAGE DATA (memoized)
    // ============================================
    const passage = useMemo((): Passage | null => {
        if (!currentQuestion) return null;
        if (
            currentQuestion.question_type === "passage_mcq" ||
            currentQuestion.question_type === "poem_mcq"
        ) {
            return currentQuestion.passage || null;
        }
        return null;
    }, [currentQuestion]);

    // Check if adjacent questions share the same passage (for passage group indicator)
    const passageGroup = useMemo((): { start: number; end: number } | null => {
        if (!passage || !currentQuestion?.passage) return null;
        const passageId = currentQuestion.passage.id;

        let start = currentIndex;
        let end = currentIndex;

        while (start > 0 && questions[start - 1]?.passage?.id === passageId) {
            start--;
        }
        while (
            end < questions.length - 1 &&
            questions[end + 1]?.passage?.id === passageId
        ) {
            end++;
        }

        return { start, end };
    }, [passage, currentQuestion?.passage, currentIndex, questions]);

    // Derive isResuming from test data (test started more than 10 seconds ago)
    const isResuming = useMemo(() => {
        if (!test?.started_at) return false;
        const startedAt = new Date(test.started_at).getTime();
        const secondsSinceStart = (Date.now() - startedAt) / 1000;
        return secondsSinceStart > TEST_CONFIG.freshStartThresholdSecs;
    }, [test?.started_at]);

    // ============================================
    // RENDER PHASES
    // ============================================

    // LOADING
    if (phase === "loading") {
        if (error) {
            return (
                <div className="min-h-screen  flex items-center justify-center bg-[#e8eef3] font-[family-name:var(--font-inter)]">
                    <div className="bg-white p-8 rounded-xl shadow-sm border max-w-md text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button
                            onClick={() => router.push("/dashboard")}
                            className="bg-[#1a2744]"
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e8eef3] font-[family-name:var(--font-inter)]">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a2744]" />
            </div>
        );
    }

    // INSTRUCTIONS
    if (phase === "instructions" && subject) {
        return (
            <InstructionPages
                subjectName={subject.name}
                subjectInstructions={subject.instructions}
                onComplete={handleInstructionsComplete}
            />
        );
    }

    // CONFIRMATION MODAL (shown over instructions background)
    if (phase === "confirmation" && subject) {
        return (
            <>
                <InstructionPages
                    subjectName={subject.name}
                    subjectInstructions={subject.instructions}
                    onComplete={() => {}}
                />
                <StartConfirmation
                    open={true}
                    onConfirm={handleStartTest}
                    onCancel={() => setPhase("instructions")}
                    loading={false}
                />
            </>
        );
    }

    // ENTER FULLSCREEN GATE (minimal - just the required user gesture)
    if (phase === "enter-fullscreen") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a2744] font-[family-name:var(--font-inter)]">
                <div className="text-center max-w-sm mx-auto p-8">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                    <h2 className="text-white text-xl font-semibold mb-3">
                        {isResuming ? "Ready to Continue" : "Ready to Begin"}
                    </h2>
                    <p className="text-white/50 text-sm mb-8">
                        {isResuming
                            ? "Click below to resume your test"
                            : "Click below to start your test"}
                    </p>
                    <Button
                        onClick={handleEnterFullscreen}
                        className="bg-white text-[#1a2744] hover:bg-white/90 font-semibold text-base px-10 py-3 h-auto"
                    >
                        {isResuming ? "Resume Test" : "Start Test"}
                    </Button>
                </div>
            </div>
        );
    }

    // PRE-SUBMIT SUMMARY
    if (phase === "pre-submit") {
        return (
            <PreSubmitSummary
                totalQuestions={questions.length}
                answeredSet={answeredSet}
                flaggedSet={flaggedSet}
                questionsOrder={questionsOrder}
                onGoBack={() => setPhase("testing")}
                onSubmit={handleSubmitTest}
                isSubmitting={isSubmitting}
            />
        );
    }

    // SUBMITTING
    if (phase === "submitting") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8eef3] font-[family-name:var(--font-inter)] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#1a2744]" />
                <p className="text-gray-600 font-medium">
                    Submitting your test...
                </p>
            </div>
        );
    }

    // RESULT
    if (phase === "result" && test) {
        const isEssayTest =
            questions.length > 0 &&
            questions.every((q) => q.question_type === "essay");
        return (
            <PostSubmitResult
                test={test}
                isEssayTest={isEssayTest}
                onBackToDashboard={() => router.push("/dashboard")}
            />
        );
    }

    // ============================================
    // MAIN TEST ENVIRONMENT
    // ============================================
    if (phase !== "testing" || !currentQuestion || !test) return null;

    const isFlagged = flaggedSet.has(currentQuestion.id);
    const hasPassage = !!passage;

    // Determine layout: 2-column split for standalone MCQ/essay, stacked for passage-based or inline types
    const questionLayout: "split" | "stacked" =
        !hasPassage &&
        (currentQuestion.question_type === "mcq" ||
            currentQuestion.question_type === "essay")
            ? "split"
            : "stacked";

    return (
        <div className="h-screen flex flex-col bg-[#e8eef3] font-[family-name:var(--font-inter)] select-none">
            {/* Anti-cheat warning */}
            <AntiCheatWarning
                open={!!warningMessage}
                message={warningMessage || ""}
                onDismiss={handleWarningDismiss}
            />

            {/* ============================================ */}
            {/* HEADER BAR */}
            {/* ============================================ */}
            <header className="bg-[#1a2744] text-white px-4 py-2.5 flex items-center justify-between z-10 shrink-0">
                {/* Left: Subject name + question counter */}
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-semibold hidden md:block">
                        {subject?.name}
                    </h1>
                    <Badge
                        variant="outline"
                        className="border-white/30 text-white text-xs"
                    >
                        Q {currentIndex + 1} / {questions.length}
                    </Badge>
                    {passageGroup && (
                        <span className="text-xs text-white/60">
                            Passage Q{passageGroup.start + 1}-
                            {passageGroup.end + 1}
                        </span>
                    )}
                </div>

                {/* Center: Timer */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={timer.toggleHidden}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title={timer.isHidden ? "Show timer" : "Hide timer"}
                    >
                        {timer.isHidden ? (
                            <EyeOff className="h-4 w-4 text-white/60" />
                        ) : (
                            <Eye className="h-4 w-4 text-white/60" />
                        )}
                    </button>
                    {!timer.isHidden && (
                        <div
                            className={`flex items-center gap-1.5 font-mono text-lg font-bold ${
                                timer.isCritical
                                    ? "text-red-400 animate-pulse"
                                    : timer.isWarning
                                      ? "text-amber-400"
                                      : "text-white"
                            }`}
                        >
                            <Clock className="h-4 w-4" />
                            {timer.formatted}
                        </div>
                    )}
                </div>

                {/* Right: Progress + Actions */}
                <div className="flex items-center gap-2">
                    <ProgressSummary
                        totalQuestions={questions.length}
                        currentIndex={currentIndex}
                        answeredSet={answeredSet}
                        visitedSet={visitedSet}
                        flaggedSet={flaggedSet}
                        questionsOrder={questionsOrder}
                        onJumpTo={handleJumpTo}
                    />

                    {timer.isInGracePeriod && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEndTestEarly}
                            className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
                        >
                            <LogOut className="h-3.5 w-3.5 mr-1" />
                            End Test
                        </Button>
                    )}
                </div>
            </header>

            {/* ============================================ */}
            {/* SPLIT PANEL CONTENT */}
            {/* ============================================ */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT PANEL: Passage (if applicable) */}
                {hasPassage && passage && (
                    <div className="w-1/2 border-r bg-white flex flex-col overflow-y-auto">
                        {/* Passage header */}
                        <div className="border-b px-4 py-2.5 shrink-0 bg-gray-50">
                            <span className="text-sm font-medium text-[#1a2744]">
                                {passage.passage_type === "poem"
                                    ? "Poem"
                                    : passage.title || "Extract"}
                            </span>
                        </div>
                        {/* Passage content */}
                        <ScrollArea className="flex-1">
                            <div className="p-6 md:p-8">
                                {passage.title && (
                                    <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                                        {passage.title}
                                    </h3>
                                )}
                                {passage.image_url && (
                                    <div className="mb-4">
                                        <img
                                            src={passage.image_url}
                                            alt={
                                                passage.title || "Passage image"
                                            }
                                            className="max-w-full rounded-lg"
                                        />
                                    </div>
                                )}
                                <div
                                    className={`leading-relaxed text-gray-800 ${
                                        passage.passage_type === "poem"
                                            ? "whitespace-pre-line italic"
                                            : ""
                                    }`}
                                >
                                    {passage.content}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* RIGHT PANEL (or full width): Question + Options */}
                <div
                    className={`${hasPassage ? "w-1/2" : "w-full"} flex flex-col bg-white`}
                >
                    <ScrollArea className="flex-1  ">
                        <div
                            className={cn(
                                "p-6 md:p-8",
                                questionLayout === "stacked" &&
                                    "max-w-3xl mx-auto",
                            )}
                        >
                            {/* Question number */}
                            <div className="flex items-center justify-between mb-6 overflow">
                                <div className="flex items-center gap-3">
                                    <span className="bg-[#1a2744] text-white text-sm font-bold px-3 py-1 rounded-lg">
                                        Q{currentIndex + 1}
                                    </span>
                                </div>
                            </div>

                            {/* Question content */}
                            <QuestionRenderer
                                question={currentQuestion}
                                answer={currentAnswer}
                                onAnswer={handleAnswer}
                                layout={questionLayout}
                            />
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* ============================================ */}
            {/* BOTTOM NAVIGATION BAR */}
            {/* ============================================ */}
            <footer className="border-t bg-white px-4 py-3 flex items-center justify-between shrink-0">
                {/* Left: Back */}
                <Button
                    variant="outline"
                    onClick={() => handleNavigate("prev")}
                    disabled={
                        currentIndex === 0 ||
                        !TEST_CONFIG.navigation.allowBackNavigation
                    }
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                {/* Center: Flag + Submit (on last question) */}
                <div className="flex items-center gap-3">
                    {TEST_CONFIG.flag.enabled && (
                        <Button
                            variant={isFlagged ? "default" : "outline"}
                            onClick={handleToggleFlag}
                            className={`gap-2 ${
                                isFlagged
                                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                                    : ""
                            }`}
                        >
                            <Flag
                                className={`h-4 w-4 ${isFlagged ? "fill-current" : ""}`}
                            />
                            {isFlagged ? "Flagged" : "Flag"}
                        </Button>
                    )}

                    {currentIndex === questions.length - 1 && (
                        <Button
                            onClick={() => {
                                if (TEST_CONFIG.submit.showPreSubmitSummary) {
                                    // Save current non-essay answer first
                                    if (
                                        currentQuestion &&
                                        answers[currentQuestion.id] !==
                                            undefined &&
                                        !isEssayQuestion(currentQuestion.id)
                                    ) {
                                        saveAnswer(
                                            currentQuestion.id,
                                            answers[currentQuestion.id],
                                        );
                                    }
                                    setPhase("pre-submit");
                                } else {
                                    handleSubmitTest();
                                }
                            }}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Send className="h-4 w-4" />
                            Submit Test
                        </Button>
                    )}
                </div>

                {/* Right: Next */}
                <Button
                    onClick={() => handleNavigate("next")}
                    disabled={currentIndex === questions.length - 1}
                    className="gap-2 bg-[#1a2744] hover:bg-[#1a2744]/90"
                >
                    Next
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </footer>

            {/* Error toast */}
            {error && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-3 text-white/70 hover:text-white"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}
