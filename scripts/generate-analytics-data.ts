/**
 * Generate diverse student test data for analytics dashboards.
 *
 * Usage:
 *   npx tsx scripts/generate-analytics-data.ts
 *   npx tsx scripts/generate-analytics-data.ts --tests-per-student 10 --base-url http://localhost:3000
 */

import { config } from "dotenv";

config();

type QuestionType =
    | "mcq"
    | "passage_mcq"
    | "poem_mcq"
    | "fill_blank_dropdown"
    | "fill_missing_sentence"
    | "essay";

interface Subject {
    id: string;
    name: string;
    question_count: number;
}

interface TestQuestion {
    id: string;
    question_type: QuestionType;
    content?: {
        blanks?: Array<unknown>;
        sentences?: string[];
        correct_mapping?: Record<string, number>;
    };
}

interface CreatedTestResponse {
    test?: { id: string };
    questions?: TestQuestion[];
}

interface StudentCredential {
    studentId: string;
    password: string;
}

const DEFAULT_STUDENTS: StudentCredential[] = [
    { studentId: "STUMY8RY", password: "986788" },
    { studentId: "STUE5GGR", password: "986788" },
    { studentId: "STUWDJ8Z", password: "025251" },
    { studentId: "STUHZZXH", password: "123456" },
];

const args = process.argv.slice(2);
const BASE_URL =
    getArgValue("--base-url") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const TESTS_PER_STUDENT = Number.parseInt(
    getArgValue("--tests-per-student") || "8",
    10,
);

function getArgValue(name: string): string | undefined {
    const idx = args.indexOf(name);
    if (idx === -1) return undefined;
    return args[idx + 1];
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomMcqOption() {
    return pickRandom(["A", "B", "C", "D"]);
}

function buildRandomAnswer(question: TestQuestion): string | number[] | Record<string, number> {
    switch (question.question_type) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq":
            return getRandomMcqOption();

        case "fill_blank_dropdown": {
            const blankCount = question.content?.blanks?.length ?? 1;
            return Array.from({ length: Math.max(blankCount, 1) }, () =>
                randomInt(0, 3),
            );
        }

        case "fill_missing_sentence": {
            const mapping = question.content?.correct_mapping ?? {};
            const gapKeys = Object.keys(mapping);
            const sentenceCount = Math.max(question.content?.sentences?.length ?? 4, 1);
            const ans: Record<string, number> = {};
            if (gapKeys.length === 0) {
                ans.GAP_1 = randomInt(0, sentenceCount - 1);
            } else {
                for (const key of gapKeys) {
                    ans[key] = randomInt(0, sentenceCount - 1);
                }
            }
            return ans;
        }

        case "essay":
        default:
            return "This is a practice essay response generated for analytics data diversity.";
    }
}

async function fetchSubjects(): Promise<Subject[]> {
    const res = await fetch(`${BASE_URL}/api/subjects`);
    if (!res.ok) throw new Error(`Failed to fetch subjects: ${res.status}`);
    const data = (await res.json()) as { subjects?: Subject[] };
    const subjects = data.subjects ?? [];
    return subjects.filter((s) => s.question_count > 0);
}

async function loginStudent(cred: StudentCredential): Promise<string> {
    const res = await fetch(`${BASE_URL}/api/auth/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            studentId: cred.studentId,
            password: cred.password,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(
            `Login failed for ${cred.studentId}: ${res.status} ${body.slice(0, 120)}`,
        );
    }

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie || !setCookie.includes("student_session=")) {
        throw new Error(`No student_session cookie returned for ${cred.studentId}`);
    }

    const cookie = setCookie.split(";")[0];
    return cookie;
}

async function createTest(cookie: string, subjectId: string): Promise<CreatedTestResponse> {
    const res = await fetch(`${BASE_URL}/api/tests`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
        },
        body: JSON.stringify({
            subject_id: subjectId,
            start_immediately: true,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Create test failed: ${res.status} ${body.slice(0, 120)}`);
    }

    return (await res.json()) as CreatedTestResponse;
}

async function saveAnswer(
    cookie: string,
    testId: string,
    question: TestQuestion,
    timeSpentSecs: number,
) {
    const selected = buildRandomAnswer(question);
    const res = await fetch(`${BASE_URL}/api/tests/${testId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
        },
        body: JSON.stringify({
            action: "save_answer",
            question_id: question.id,
            selected,
            time_spent_secs: timeSpentSecs,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Save answer failed: ${res.status} ${body.slice(0, 120)}`);
    }
}

async function endEarly(cookie: string, testId: string) {
    const res = await fetch(`${BASE_URL}/api/tests/${testId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
        },
        body: JSON.stringify({ action: "end_early" }),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`End early failed: ${res.status} ${body.slice(0, 120)}`);
    }
}

async function submitTest(cookie: string, testId: string) {
    const res = await fetch(`${BASE_URL}/api/tests/${testId}/submit`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
        },
        body: "{}",
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Submit failed: ${res.status} ${body.slice(0, 120)}`);
    }
}

async function runForStudent(
    cred: StudentCredential,
    subjects: Subject[],
): Promise<{ submitted: number; endedEarly: number; failed: number }> {
    const cookie = await loginStudent(cred);
    let submitted = 0;
    let endedEarly = 0;
    let failed = 0;

    for (let i = 0; i < TESTS_PER_STUDENT; i++) {
        try {
            const subject = subjects[i % subjects.length];
            const created = await createTest(cookie, subject.id);
            const testId = created.test?.id;
            const questions = created.questions ?? [];

            if (!testId || questions.length === 0) {
                throw new Error("No test ID or empty questions in create response");
            }

            const modeRoll = Math.random();
            const shouldEndEarly = modeRoll < 0.25; // 25% ended early

            const answerCount = shouldEndEarly
                ? randomInt(1, Math.min(4, questions.length))
                : randomInt(
                      Math.max(4, Math.floor(questions.length * 0.4)),
                      questions.length,
                  );

            const shuffled = [...questions].sort(() => Math.random() - 0.5);
            for (const q of shuffled.slice(0, answerCount)) {
                const timeSpentSecs = shouldEndEarly
                    ? randomInt(5, 25)
                    : randomInt(20, 120);
                await saveAnswer(cookie, testId, q, timeSpentSecs);
                await sleep(randomInt(80, 220));
            }

            if (shouldEndEarly) {
                await endEarly(cookie, testId);
                endedEarly++;
            } else {
                await submitTest(cookie, testId);
                submitted++;
            }
        } catch (error) {
            failed++;
            console.error(
                `[${cred.studentId}] test ${i + 1}/${TESTS_PER_STUDENT} failed:`,
                error instanceof Error ? error.message : String(error),
            );
        }

        await sleep(randomInt(120, 350));
    }

    return { submitted, endedEarly, failed };
}

async function main() {
    console.log(`\nGenerating analytics test data on ${BASE_URL}`);
    console.log(
        `Students: ${DEFAULT_STUDENTS.map((s) => s.studentId).join(", ")} | tests/student: ${TESTS_PER_STUDENT}\n`,
    );

    const health = await fetch(BASE_URL).catch(() => null);
    if (!health || !health.ok) {
        throw new Error(`Cannot reach ${BASE_URL}. Start dev server first.`);
    }

    const subjects = await fetchSubjects();
    if (subjects.length === 0) {
        throw new Error("No subjects with questions found.");
    }

    console.log(
        `Subjects used: ${subjects.map((s) => s.name).join(", ")}\n`,
    );

    let totalSubmitted = 0;
    let totalEndedEarly = 0;
    let totalFailed = 0;

    for (const cred of DEFAULT_STUDENTS) {
        try {
            const result = await runForStudent(cred, subjects);
            totalSubmitted += result.submitted;
            totalEndedEarly += result.endedEarly;
            totalFailed += result.failed;

            console.log(
                `[${cred.studentId}] submitted=${result.submitted}, ended_early=${result.endedEarly}, failed=${result.failed}`,
            );
        } catch (error) {
            totalFailed += TESTS_PER_STUDENT;
            console.error(
                `[${cred.studentId}] skipped due to login/setup error:`,
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    console.log("\nDone generating analytics data:");
    console.log(`- submitted tests: ${totalSubmitted}`);
    console.log(`- ended early tests: ${totalEndedEarly}`);
    console.log(`- failed attempts: ${totalFailed}\n`);
}

main().catch((error) => {
    console.error("Analytics data generation failed:", error);
    process.exit(1);
});
