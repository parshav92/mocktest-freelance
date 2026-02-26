// ============================================
// FREE TRIAL — HARDCODED TEST DATA
// ============================================
// 4 trial tests (1 per subject) with static questions.
// No database involved — all data lives here.
// ============================================

import type {
    QuestionType,
    DifficultyLevel,
    QuestionContent,
    MCQContent,
    FillBlankContent,
    EssayContent,
    Passage,
    InstructionPage,
} from "@/types/test";

// ── Shared types ───────────────────────────────────────

export interface TrialQuestion {
    id: string;
    code: string;
    question_type: QuestionType;
    difficulty: DifficultyLevel;
    content: QuestionContent;
    marks: number;
    passage?: Passage;
    /** The correct answer — used for local grading + review */
    correct_answer: unknown;
    /** Explanation shown in review */
    solution_text: string | null;
}

export interface TrialTest {
    slug: string;
    subjectName: string;
    subjectSlug: string;
    icon: string;
    description: string;
    durationMins: number;
    instructions: InstructionPage[];
    questions: TrialQuestion[];
}

// ── Reading ────────────────────────────────────────────

const readingPassage: Passage = {
    id: "trial-passage-1",
    subject_id: "trial-reading",
    code: "TRIAL_RP_01",
    passage_type: "extract",
    title: "The Wonders of the Deep Sea",
    content: `<p>The deep sea remains one of the last unexplored frontiers on Earth. Below 200 metres, sunlight fades to nothing, and the ocean becomes a world of perpetual darkness. Yet life thrives here in extraordinary ways.</p>
<p>Creatures of the deep have evolved remarkable adaptations. The anglerfish dangles a glowing lure above its gaping mouth, attracting prey in the pitch-black water. Giant tube worms cluster around hydrothermal vents, drawing energy not from sunlight but from the chemicals spewing from the Earth's crust. These communities exist entirely independent of the sun — a discovery that <strong>revolutionised</strong> our understanding of where life can survive.</p>
<p>Despite the crushing pressure — over 1,000 times atmospheric pressure at the deepest point — the Mariana Trench teems with living organisms. Scientists have found shrimp-like amphipods, sea cucumbers, and even fish at depths exceeding 8,000 metres. Each expedition reveals species never seen before, suggesting we have barely scratched the surface of deep-sea biodiversity.</p>
<p>The deep ocean also plays a critical role in regulating Earth's climate. Cold, dense water sinks near the poles and travels along the ocean floor, carrying dissolved carbon dioxide away from the atmosphere. This <strong>thermohaline circulation</strong> acts as a vast conveyor belt, distributing heat and nutrients across the globe. Disrupting this system could have <strong>far-reaching consequences</strong> for weather patterns worldwide.</p>`,
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

const readingQuestions: TrialQuestion[] = [
    {
        id: "trial-r-1",
        code: "TRIAL_R01",
        question_type: "passage_mcq",
        difficulty: "easy",
        content: {
            question:
                "According to the passage, at what depth does sunlight disappear in the ocean?",
            options: [
                { label: "A", text: "100 metres" },
                { label: "B", text: "200 metres" },
                { label: "C", text: "500 metres" },
                { label: "D", text: "1,000 metres" },
            ],
        } as MCQContent,
        marks: 1,
        passage: readingPassage,
        correct_answer: { label: "B" },
        solution_text:
            "The passage states 'Below 200 metres, sunlight fades to nothing.'",
    },
    {
        id: "trial-r-2",
        code: "TRIAL_R02",
        question_type: "passage_mcq",
        difficulty: "easy",
        content: {
            question:
                "How does the anglerfish attract prey?",
            options: [
                { label: "A", text: "By releasing a strong scent" },
                { label: "B", text: "By moving very quickly" },
                { label: "C", text: "By dangling a glowing lure" },
                { label: "D", text: "By camouflaging with the seabed" },
            ],
        } as MCQContent,
        marks: 1,
        passage: readingPassage,
        correct_answer: { label: "C" },
        solution_text:
            "The passage says 'The anglerfish dangles a glowing lure above its gaping mouth, attracting prey.'",
    },
    {
        id: "trial-r-3",
        code: "TRIAL_R03",
        question_type: "passage_mcq",
        difficulty: "medium",
        content: {
            question:
                "The word 'revolutionised' (paragraph 2) most closely means:",
            options: [
                { label: "A", text: "Destroyed" },
                { label: "B", text: "Fundamentally changed" },
                { label: "C", text: "Slightly improved" },
                { label: "D", text: "Confirmed" },
            ],
        } as MCQContent,
        marks: 1,
        passage: readingPassage,
        correct_answer: { label: "B" },
        solution_text:
            "'Revolutionised' means to completely change something. The discovery of life independent of sunlight fundamentally changed how scientists viewed where life could survive.",
    },
    {
        id: "trial-r-4",
        code: "TRIAL_R04",
        question_type: "passage_mcq",
        difficulty: "medium",
        content: {
            question:
                "What is the main purpose of the final paragraph?",
            options: [
                { label: "A", text: "To describe deep-sea creatures" },
                { label: "B", text: "To explain the dangers of deep-sea diving" },
                { label: "C", text: "To highlight the deep ocean's role in regulating climate" },
                { label: "D", text: "To argue for more ocean exploration funding" },
            ],
        } as MCQContent,
        marks: 1,
        passage: readingPassage,
        correct_answer: { label: "C" },
        solution_text:
            "The final paragraph discusses thermohaline circulation and how the deep ocean regulates Earth's climate, including distributing heat and nutrients.",
    },
    {
        id: "trial-r-5",
        code: "TRIAL_R05",
        question_type: "fill_blank_dropdown",
        difficulty: "medium",
        content: {
            passage_text:
                "The deep sea is a place of ___ darkness where creatures have evolved ___ adaptations to survive. Scientists believe we have only ___ the surface of deep-sea biodiversity.",
            blanks: [
                {
                    position: 1,
                    options: ["perpetual", "occasional", "partial", "moderate"],
                    correct_index: 0,
                },
                {
                    position: 2,
                    options: ["ordinary", "remarkable", "simple", "dangerous"],
                    correct_index: 1,
                },
                {
                    position: 3,
                    options: ["scratched", "broken", "polished", "covered"],
                    correct_index: 0,
                },
            ],
        } as FillBlankContent,
        marks: 3,
        correct_answer: { answers: [0, 1, 0] },
        solution_text:
            "From the passage: 'perpetual darkness', 'remarkable adaptations', and 'barely scratched the surface'.",
    },
];

// ── Mathematical Reasoning ─────────────────────────────

const mathQuestions: TrialQuestion[] = [
    {
        id: "trial-m-1",
        code: "TRIAL_M01",
        question_type: "mcq",
        difficulty: "easy",
        content: {
            question: "What is the value of 3² + 4²?",
            options: [
                { label: "A", text: "7" },
                { label: "B", text: "12" },
                { label: "C", text: "25" },
                { label: "D", text: "49" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "C" },
        solution_text: "3² + 4² = 9 + 16 = 25",
    },
    {
        id: "trial-m-2",
        code: "TRIAL_M02",
        question_type: "mcq",
        difficulty: "easy",
        content: {
            question:
                "A shop offers a 20% discount on a jacket priced at $80. What is the sale price?",
            options: [
                { label: "A", text: "$60" },
                { label: "B", text: "$64" },
                { label: "C", text: "$68" },
                { label: "D", text: "$72" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "B" },
        solution_text:
            "20% of $80 = $16. Sale price = $80 − $16 = $64.",
    },
    {
        id: "trial-m-3",
        code: "TRIAL_M03",
        question_type: "mcq",
        difficulty: "medium",
        content: {
            question:
                "If the perimeter of a rectangle is 36 cm and its length is 12 cm, what is its width?",
            options: [
                { label: "A", text: "4 cm" },
                { label: "B", text: "6 cm" },
                { label: "C", text: "8 cm" },
                { label: "D", text: "12 cm" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "B" },
        solution_text:
            "Perimeter = 2(l + w). 36 = 2(12 + w). 18 = 12 + w. w = 6 cm.",
    },
    {
        id: "trial-m-4",
        code: "TRIAL_M04",
        question_type: "mcq",
        difficulty: "medium",
        content: {
            question:
                "A train travels 240 km in 3 hours. If it continues at the same speed, how far will it travel in 5 hours?",
            options: [
                { label: "A", text: "360 km" },
                { label: "B", text: "380 km" },
                { label: "C", text: "400 km" },
                { label: "D", text: "420 km" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "C" },
        solution_text:
            "Speed = 240 ÷ 3 = 80 km/h. In 5 hours = 80 × 5 = 400 km.",
    },
    {
        id: "trial-m-5",
        code: "TRIAL_M05",
        question_type: "mcq",
        difficulty: "hard",
        content: {
            question:
                "What is the smallest number that is divisible by both 12 and 18?",
            options: [
                { label: "A", text: "24" },
                { label: "B", text: "36" },
                { label: "C", text: "48" },
                { label: "D", text: "72" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "B" },
        solution_text: "LCM of 12 and 18: 12 = 2² × 3, 18 = 2 × 3². LCM = 2² × 3² = 36.",
    },
];

// ── Thinking Skills ────────────────────────────────────

const thinkingQuestions: TrialQuestion[] = [
    {
        id: "trial-t-1",
        code: "TRIAL_T01",
        question_type: "mcq",
        difficulty: "easy",
        content: {
            question:
                "If all Bloops are Razzies and all Razzies are Lazzies, which statement must be true?",
            options: [
                { label: "A", text: "All Lazzies are Bloops" },
                { label: "B", text: "All Bloops are Lazzies" },
                { label: "C", text: "All Razzies are Bloops" },
                { label: "D", text: "Some Lazzies are not Razzies" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "B" },
        solution_text:
            "Bloops → Razzies → Lazzies. So all Bloops must be Lazzies (transitive property).",
    },
    {
        id: "trial-t-2",
        code: "TRIAL_T02",
        question_type: "mcq",
        difficulty: "easy",
        content: {
            question:
                "Look at the sequence: 2, 6, 18, 54, ___. What comes next?",
            options: [
                { label: "A", text: "108" },
                { label: "B", text: "162" },
                { label: "C", text: "148" },
                { label: "D", text: "216" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "B" },
        solution_text:
            "Each number is multiplied by 3: 2 × 3 = 6, 6 × 3 = 18, 18 × 3 = 54, 54 × 3 = 162.",
    },
    {
        id: "trial-t-3",
        code: "TRIAL_T03",
        question_type: "mcq",
        difficulty: "medium",
        content: {
            question:
                "Five friends — Amy, Ben, Cam, Dee, and Eve — are sitting in a row. Amy is not at either end. Ben is immediately to the right of Amy. Cam is at the left end. Who is sitting in the middle?",
            options: [
                { label: "A", text: "Amy" },
                { label: "B", text: "Ben" },
                { label: "C", text: "Dee" },
                { label: "D", text: "Eve" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "A" },
        solution_text:
            "Cam is position 1 (left end). Amy is not at either end, so positions 2, 3, or 4. Ben is directly right of Amy. If Amy is at position 3 (middle), Ben is at position 4. This works: Cam, ?, Amy, Ben, ? with Dee and Eve filling positions 2 and 5.",
    },
    {
        id: "trial-t-4",
        code: "TRIAL_T04",
        question_type: "mcq",
        difficulty: "medium",
        content: {
            question:
                "A cube has sides of length 3 cm. If the cube is painted red on all faces and then cut into 1 cm cubes, how many small cubes have exactly two red faces?",
            options: [
                { label: "A", text: "8" },
                { label: "B", text: "12" },
                { label: "C", text: "6" },
                { label: "D", text: "24" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "B" },
        solution_text:
            "Small cubes with exactly 2 painted faces sit along the edges of the cube (not at corners). Each edge of a 3 cm cube has 1 such cube (the middle one). A cube has 12 edges → 12 small cubes with exactly 2 red faces.",
    },
    {
        id: "trial-t-5",
        code: "TRIAL_T05",
        question_type: "mcq",
        difficulty: "hard",
        content: {
            question:
                "In a class of 30 students, 18 play cricket, 15 play football, and 3 play neither. How many students play both cricket and football?",
            options: [
                { label: "A", text: "3" },
                { label: "B", text: "6" },
                { label: "C", text: "9" },
                { label: "D", text: "12" },
            ],
        } as MCQContent,
        marks: 1,
        correct_answer: { label: "B" },
        solution_text:
            "Students who play at least one sport = 30 − 3 = 27. Using inclusion-exclusion: 27 = 18 + 15 − Both. Both = 33 − 27 = 6.",
    },
];

// ── Writing ────────────────────────────────────────────

const writingQuestions: TrialQuestion[] = [
    {
        id: "trial-w-1",
        code: "TRIAL_W01",
        question_type: "essay",
        difficulty: "medium",
        content: {
            prompt:
                "Write a persuasive essay on the following topic:\n\n\"Schools should replace all textbooks with tablets and digital devices.\"\n\nDo you agree or disagree? Present your argument with clear reasons and examples.",
            word_limit: 400,
            time_mins: 20,
            rubric: {
                content: 10,
                structure: 5,
                language: 5,
            },
        } as EssayContent,
        marks: 20,
        correct_answer: {},
        solution_text: null,
    },
];

// ── Subject instructions ───────────────────────────────

const readingInstructions: InstructionPage[] = [
    {
        title: "Free Trial — Reading",
        content:
            "<p>You have <strong>10 minutes</strong> to complete <strong>5 questions</strong> in this trial test.</p><br/><p>This test includes passage-based multiple choice questions and a fill-in-the-blanks exercise.</p><p>Read each passage carefully before answering the questions.</p><p>You will <strong>not</strong> lose marks for incorrect answers, so attempt all questions.</p>",
    },
];

const mathInstructions: InstructionPage[] = [
    {
        title: "Free Trial — Mathematical Reasoning",
        content:
            "<p>You have <strong>10 minutes</strong> to complete <strong>5 questions</strong> in this trial test.</p><br/><p>For each question there are four possible answers. Choose the <strong>one</strong> correct answer.</p><p>You will <strong>not</strong> lose marks for incorrect answers, so attempt all questions.</p><br/><p>Calculators are <strong>not</strong> allowed.</p>",
    },
];

const thinkingInstructions: InstructionPage[] = [
    {
        title: "Free Trial — Thinking Skills",
        content:
            "<p>You have <strong>10 minutes</strong> to complete <strong>5 questions</strong> in this trial test.</p><br/><p>This test assesses your ability to think logically and solve problems.</p><p>For each question there are four possible answers. Choose the <strong>one</strong> correct answer.</p><p>You will <strong>not</strong> lose marks for incorrect answers, so attempt all questions.</p>",
    },
];

const writingInstructions: InstructionPage[] = [
    {
        title: "Free Trial — Writing",
        content:
            "<p>You have <strong>20 minutes</strong> to complete <strong>1 task</strong> in this trial test.</p><br/><p><em>The task provides an opportunity for you to show how well you can choose, develop and organise ideas and communicate them effectively in writing.</em></p><p>You will receive a <strong>higher mark</strong> if you produce an original and engaging response.</p><br/><p>Calculators and dictionaries are <strong>not</strong> allowed.</p><p>This test will <strong>not</strong> be marked automatically.</p>",
    },
];

// ── Exported registry ──────────────────────────────────

export const TRIAL_TESTS: TrialTest[] = [
    {
        slug: "reading",
        subjectName: "Reading",
        subjectSlug: "reading",
        icon: "book-open",
        description: "Passage comprehension & fill-in-the-blanks",
        durationMins: 10,
        instructions: readingInstructions,
        questions: readingQuestions,
    },
    {
        slug: "mathematical-reasoning",
        subjectName: "Mathematical Reasoning",
        subjectSlug: "mathematical-reasoning",
        icon: "calculator",
        description: "Problem solving & logical reasoning",
        durationMins: 10,
        instructions: mathInstructions,
        questions: mathQuestions,
    },
    {
        slug: "thinking-skills",
        subjectName: "Thinking Skills",
        subjectSlug: "thinking-skills",
        icon: "brain",
        description: "Critical thinking & pattern recognition",
        durationMins: 10,
        instructions: thinkingInstructions,
        questions: thinkingQuestions,
    },
    {
        slug: "writing",
        subjectName: "Writing",
        subjectSlug: "writing",
        icon: "pencil",
        description: "Persuasive essay writing",
        durationMins: 20,
        instructions: writingInstructions,
        questions: writingQuestions,
    },
];

export function getTrialTest(slug: string): TrialTest | undefined {
    return TRIAL_TESTS.find((t) => t.slug === slug);
}
