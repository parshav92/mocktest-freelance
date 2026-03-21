// ============================================
// CSV TEMPLATES FOR QUESTION UPLOAD
// ============================================

/**
 * CSV Templates - Designed for non-technical users
 *
 * Key Design Decisions:
 * 1. Separate CSV for each question type (simpler)
 * 2. Flat structure (no JSON in columns for MCQ)
 * 3. Image columns are yes/no flags - actual images uploaded in preview step
 * 4. Blanks in fill-blank use [1], [2] markers
 */

// Column definitions for each question type
export const CSV_COLUMNS = {
    // Standard MCQ (Math, Thinking Skills)
    mcq: [
        "code", // Unique identifier (e.g., MR_001)
        "subject", // Subject slug (mathematical-reasoning, thinking-skills)
        "difficulty", // easy, medium, hard
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

    // Passage-based MCQ (Reading)
    passage_mcq: [
        "code", // Question code (e.g., RD_MCQ_001)
        "passage_code", // Reference to passage(s) - comma-separated for multiple (e.g., RD_P_001 or RD_P_001,RD_P_002)
        "difficulty", // easy, medium, hard
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

    // Poem-based MCQ (Reading)
    poem_mcq: [
        "code", // Question code
        "passage_code", // Reference to poem passage(s) - comma-separated for multiple
        "difficulty", // easy, medium, hard
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
        "code", // Question code
        "passage_code", // (Optional) Reference to passage
        "difficulty", // easy, medium, hard
        "passage_text", // Text with [1], [2] etc for blanks
        "blank_1_options", // Options separated by | (pipe), first is correct
        "blank_2_options", // Options for blank 2 (if any)
        "blank_3_options", // Options for blank 3 (if any)
        "blank_4_options", // Options for blank 4 (if any)
        "blank_5_options", // Options for blank 5 (if any)
    ],

    // Fill missing sentence (Reading) - drag and drop sentences into gaps
    fill_missing_sentence: [
        "code", // Question code (e.g., RD_FMS_001)
        "difficulty", // easy, medium, hard
        "passage_with_gaps", // Text with {GAP_1}, {GAP_2} etc for gaps
        "sentences", // Available sentences separated by | (pipe)
    ],

    // Passages for reading comprehension
    passage: [
        "code", // Passage code (e.g., RD_P_001)
        "type", // extract, poem, article
        "title", // (Optional) Title
        "content", // Full passage text
        "has_image", // (Optional) yes/no - has passage image?
    ],

    // Essay prompts (Writing)
    essay: [
        "code", // Question code
        "difficulty", // easy, medium, hard
        "prompt", // Essay prompt/topic
        "word_limit", // Max words (e.g., 300)
        "time_mins", // Time limit in minutes
        "rubric", // Scoring rubric: category:points|category:points
    ],
};

// Sample data for each template
export const CSV_SAMPLES = {
    mcq: `code,subject,difficulty,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
MR_001,mathematical-reasoning,easy,What is 15 + 27?,32,42,52,62,B,Add tens then ones to get 42,0,no,no,no,no,0
MR_002,mathematical-reasoning,medium,Look at the shape and find its area:,12 sq cm,24 sq cm,36 sq cm,48 sq cm,B,Area = length × width,2,no,no,no,no,2
TS_001,thinking-skills,easy,Which shape comes next?,Shape 1,Shape 2,Shape 3,Shape 4,C,The pattern alternates,1,yes,yes,yes,yes,0`,

    passage_mcq: `code,passage_code,difficulty,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
RD_MCQ_001,RD_P_001,easy,What is the main idea of the passage?,Friendship,Adventure,Nature,Science,A,The passage discusses friendship,0,no,no,no,no,0
RD_MCQ_002,RD_P_001,medium,What does the author mean by 'stood tall'?,Was very tall,Was brave,Was proud,Was angry,B,Context shows bravery,1,no,no,no,no,0
RD_MCQ_003,"RD_P_001,RD_P_002",medium,Compare the two extracts. What theme do they share?,Friendship,Loss,Growth,Conflict,C,Both passages explore growth,0,no,no,no,no,0`,

    poem_mcq: `code,passage_code,difficulty,question,option_a,option_b,option_c,option_d,answer,solution,question_images,option_a_image,option_b_image,option_c_image,option_d_image,solution_images
RD_POEM_001,RD_POEM_P_001,easy,What rhyme scheme does the poem follow?,ABAB,AABB,ABBA,Free verse,B,Lines 1-2 and 3-4 rhyme,0,no,no,no,no,0`,

    fill_blank: `code,passage_code,difficulty,passage_text,blank_1_options,blank_2_options,blank_3_options,blank_4_options,blank_5_options
RD_FB_001,,easy,"The cat [1] on the mat. It was [2] comfortable.",sat|sit|set,very|much|more,,,
RD_FB_002,,medium,"Reading books [1] your vocabulary and [2] your imagination.",improves|reduces|stops,expands|shrinks|limits,,,`,

    fill_missing_sentence: `code,difficulty,passage_with_gaps,sentences
RD_FMS_001,easy,"The park was beautiful in spring. {GAP_1} Birds sang in the trees. {GAP_2} Children played on the swings.","Flowers bloomed everywhere.|Families enjoyed picnics on the grass."
RD_FMS_002,medium,"The science experiment was exciting. First we gathered all the materials. {GAP_1} We observed carefully and took notes. {GAP_2} Our results matched our predictions.","Then we mixed the chemicals together.|Finally we discussed what we learned."`,

    passage: `code,type,title,content,has_image
RD_P_001,extract,The Loyal Friend,"Once upon a time, there lived two friends named Tom and Jerry...",no
RD_POEM_P_001,poem,The Morning Sun,"The sun rises in the east so bright, Spreading warmth and golden light...",no`,

    essay: `code,difficulty,prompt,word_limit,time_mins,rubric
WR_001,easy,Write about your best friend and why they are special to you.,150,15,content:10|structure:5|grammar:5
WR_002,medium,Describe a time when you faced a challenge and how you overcame it.,250,20,content:15|structure:10|grammar:5|creativity:5`,
};

// Get CSV header row for a question type
export function getCSVHeader(type: keyof typeof CSV_COLUMNS): string {
    return CSV_COLUMNS[type].join(",");
}

// Get full template (header + samples) for download
export function getCSVTemplate(type: keyof typeof CSV_COLUMNS): string {
    const header = getCSVHeader(type);
    const samples = CSV_SAMPLES[type];
    return `${header}\n${samples}`;
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
    poem_mcq: "poem_mcq",
    fill_blank: "fill_blank_dropdown",
    fill_blank_dropdown: "fill_blank_dropdown",
    fill_missing_sentence: "fill_missing_sentence",
    essay: "essay",
} as const;
