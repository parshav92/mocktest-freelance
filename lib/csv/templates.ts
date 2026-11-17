// ============================================
// CSV TEMPLATES FOR QUESTION UPLOAD
// ============================================
// NOTE: Keep `CSV_UPLOAD_SPEC.md` in sync whenever template columns/samples change.

/**
 * CSV Templates - Designed for non-technical users
 *
 * Key Design Decisions:
 * 1. Separate CSV for each question type (simpler)
 * 2. Flat structure (no JSON in columns for MCQ)
 * 3. `question_images` / `solution_images` accept numeric counts only (0-10)
 * 4. Blanks in fill-blank use [1], [2] markers
 */

// Column definitions for each question type
export const CSV_COLUMNS = {
    // Standard MCQ (Math, Thinking Skills)
    mcq: [
        "code", // (Optional) Unique identifier (e.g., MR_001). If empty/missing, auto-generated.
        "subject", // Subject slug (mathematical-reasoning, thinking-skills)
        "difficulty", // easy, medium, hard
        "topic", // (Optional) Broad topic label (e.g., Algebra)
        "subtopic", // (Optional) Narrow subtopic label (e.g., Linear equations)
        "question", // Question text
        "option_a", // Option A text
        "option_b", // Option B text
        "option_c", // Option C text
        "option_d", // Option D text
        "answer", // Correct answer: A, B, C, or D
        "solution", // (Optional) Explanation
        "question_images", // (Optional) number of question images (0 = none)
        "option_a_image", // (Optional) yes/no - has option A image?
        "option_b_image", // (Optional) yes/no - has option B image?
        "option_c_image", // (Optional) yes/no - has option C image?
        "option_d_image", // (Optional) yes/no - has option D image?
        "solution_images", // (Optional) number of solution images (0 = none)
    ],

    // Passage-based MCQ (Reading) - used for both extract and poem passages
    passage_mcq: [
        "code", // (Optional) Question code (e.g., RD_MCQ_001). If empty/missing, auto-generated.
        "subject", // Subject slug (required)
        "passage_code", // Reference to extract or poem passage(s) - comma-separated for multiple (e.g., RD_P_001 or RD_P_001,RD_P_002)
        "difficulty", // easy, medium, hard
        "topic", // (Optional) Broad topic label
        "subtopic", // (Optional) Narrow subtopic label
        "question", // Question text
        "option_a", // Option A
        "option_b", // Option B
        "option_c", // Option C
        "option_d", // Option D
        "answer", // A, B, C, or D
        "solution", // (Optional) Explanation
        "question_images", // (Optional) number of question images (0 = none)
        "option_a_image", // (Optional) yes/no
        "option_b_image", // (Optional) yes/no
        "option_c_image", // (Optional) yes/no
        "option_d_image", // (Optional) yes/no
        "solution_images", // (Optional) number of solution images (0 = none)
    ],

    // Fill-in-the-blank with dropdowns (Reading)
    fill_blank: [
        "code", // (Optional) Question code. If empty/missing, auto-generated.
        "subject", // Subject slug (required)
        "difficulty", // easy, medium, hard
        "topic", // (Optional) Broad topic label
        "subtopic", // (Optional) Narrow subtopic label
        "passage_text", // Text with [1], [2] etc for blanks, in order
        "blank_1_options", // 2+ unique options separated by | (pipe), first is correct (shuffled in test)
        "blank_2_options", // Options for blank 2 (if any)
        "blank_3_options", // Options for blank 3 (if any)
        "blank_4_options", // Options for blank 4 (if any)
        "blank_5_options", // Options for blank 5 (if any). Add blank_6_options, blank_7_options, … for more blanks.
        "solution", // (Optional) Explanation shown on the review page
    ],

    // Fill missing sentence (Reading) - drag and drop sentences into gaps
    fill_missing_sentence: [
        "code", // (Optional) Question code (e.g., RD_FMS_001). If empty/missing, auto-generated.
        "subject", // Subject slug (required)
        "difficulty", // easy, medium, hard
        "topic", // (Optional) Broad topic label
        "subtopic", // (Optional) Narrow subtopic label
        "passage_with_gaps", // Text with {GAP_1}, {GAP_2} etc for gaps, in order
        "sentences", // Sentences separated by | (pipe): 1st fills GAP_1, 2nd fills GAP_2, …; extras are distractors (shuffled in test)
        "solution", // (Optional) Explanation shown on the review page
    ],

    // Passages for reading comprehension
    passage: [
        "code", // Passage code starting with the subject prefix (e.g., RD_P_001)
        "type", // extract or poem
        "title", // (Optional) Title
        "content", // Full passage text
        "has_image", // (Optional) yes/no - has passage image?
    ],

    // Essay prompts (Writing)
    essay: [
        "code", // (Optional) Question code. If empty/missing, auto-generated.
        "subject", // Subject slug (required)
        "difficulty", // easy, medium, hard
        "topic", // Main writing style (Narrative, Persuasive, Informative)
        "subtopic", // Sub-style / genre (must match writing_marking_criteria)
        "prompt", // Essay prompt/topic
        "word_limit", // Max words (e.g., 300)
        "time_mins", // (Optional) Suggested minutes, shown to the student only (not a timer)
        // Marking criteria are resolved from writing_marking_criteria at evaluation time.
    ],
};

// Sample data for each template
export const CSV_SAMPLES = {
    mcq: `code,subject,difficulty,topic,subtopic,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
MR_001,mathematical-reasoning,easy,Arithmetic,Addition,What is 15 + 27?,32,42,52,62,B,Add tens then ones to get 42,0,no,no,no,no,0
MR_002,mathematical-reasoning,medium,Geometry,Area,Look at the shape and find its area:,12 sq cm,24 sq cm,36 sq cm,48 sq cm,B,Area = length × width,2,no,no,no,no,2
TS_001,thinking-skills,easy,Pattern Recognition,Visual sequence,Which shape comes next?,Shape 1,Shape 2,Shape 3,Shape 4,C,The pattern alternates,1,yes,yes,yes,yes,0`,

    passage_mcq: `code,subject,passage_code,difficulty,topic,subtopic,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
RD_MCQ_001,reading,RD_P_001,easy,Comprehension,Main idea,What is the main idea of the passage?,Friendship,Adventure,Nature,Science,A,The passage discusses friendship,0,no,no,no,no,0
RD_MCQ_002,reading,RD_P_001,medium,Inference,Author intent,What does the author mean by 'stood tall'?,Was very tall,Was brave,Was proud,Was angry,B,Context shows bravery,1,no,no,no,no,0
RD_MCQ_003,reading,"RD_P_001,RD_P_002",medium,Comparison,Theme comparison,Compare the two extracts. What theme do they share?,Friendship,Loss,Growth,Conflict,C,Both passages explore growth,0,no,no,no,no,0
RD_MCQ_004,reading,RD_POEM_P_001,easy,Poetry analysis,Rhyme scheme,What rhyme scheme does the poem follow?,ABAB,AABB,ABBA,Free verse,B,Lines 1-2 and 3-4 rhyme,0,no,no,no,no,0`,

    fill_blank: `code,subject,difficulty,topic,subtopic,passage_text,blank_1_options,blank_2_options,blank_3_options,blank_4_options,blank_5_options,solution
RD_FB_001,reading,easy,Grammar,Verb usage,"The cat [1] on the mat. It was [2] comfortable.",sat|sit|set,very|much|more,,,,"Past tense 'sat' fits the story; 'very' modifies the adjective."
RD_FB_002,reading,medium,Vocabulary,Reading impact,"Reading books [1] your vocabulary and [2] your imagination.",improves|reduces|stops,expands|shrinks|limits,,,,`,

    fill_missing_sentence: `code,subject,difficulty,topic,subtopic,passage_with_gaps,sentences,solution
RD_FMS_001,reading,easy,Sequencing,Context fit,"The park was beautiful in spring. {GAP_1} Birds sang in the trees. {GAP_2} Children played on the swings.","Flowers bloomed everywhere.|Families enjoyed picnics on the grass.|It was snowing heavily.","The third sentence is a distractor; snow does not fit a spring scene."
RD_FMS_002,reading,medium,Process writing,Logical flow,"The science experiment was exciting. First we gathered all the materials. {GAP_1} We observed carefully and took notes. {GAP_2} Our results matched our predictions.","Then we mixed the chemicals together.|Finally we discussed what we learned.",`,

    passage: `code,type,title,content,has_image
RD_P_001,extract,The Loyal Friend,"Once upon a time, there lived two friends named Tom and Jerry...",no
RD_POEM_P_001,poem,The Morning Sun,"The sun rises in the east so bright, Spreading warmth and golden light...",no`,

    essay: `code,subject,difficulty,topic,subtopic,prompt,word_limit,time_mins
WR_001,writing,medium,Narrative,Imaginative / Adventure,"For years, everyone in your town has been warned never to go beyond a tall fence at the edge of the community. One day, the gate is left open. Write a story about someone who decides to cross the fence.",400,30
WR_002,writing,medium,Persuasive,Argumentative / Speech,"Your local council is planning to close the town's physical library and replace it with a digital hub. Write a letter to the Mayor expressing your opinion on this change.",400,`,
};

// Get CSV header row for a question type
export function getCSVHeader(type: keyof typeof CSV_COLUMNS): string {
    return CSV_COLUMNS[type].join(",");
}

// Get full template (header + samples) for download; each sample block starts with its header row
export function getCSVTemplate(type: keyof typeof CSV_COLUMNS): string {
    return CSV_SAMPLES[type];
}

// Subject slug mapping
export const SUBJECT_SLUGS = {
    "mathematical-reasoning": "mathematical-reasoning",
    math: "mathematical-reasoning",
    maths: "mathematical-reasoning",
    "thinking-skills": "thinking-skills",
    thinking: "thinking-skills",
    reading: "reading",
    writing: "writing",
} as const;

// Question type mapping from CSV type to database type
export const QUESTION_TYPE_MAP = {
    mcq: "mcq",
    passage_mcq: "passage_mcq",
    fill_blank: "fill_blank_dropdown",
    fill_blank_dropdown: "fill_blank_dropdown",
    fill_missing_sentence: "fill_missing_sentence",
    essay: "essay",
} as const;
