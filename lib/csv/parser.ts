// ============================================
// CSV PARSER WITH IMAGE FLAG SUPPORT
// ============================================
// NOTE: Keep `CSV_UPLOAD_SPEC.md` in sync whenever parsing/validation behavior changes.

import { CSV_COLUMNS } from "./templates";
import { repairMojibakeText } from "@/lib/utils/text-encoding";

export interface ParseError {
    row: number;
    column?: string;
    message: string;
}

// Image requirement for a single question
export interface ImageRequirement {
    field: string; // e.g. "question", "option_a".."option_d", "passage", "solution_1".."solution_N"
    label: string;
    storagePath: string; // e.g., "questions/math/MR_001_q.png"
    number?: number; // Serial number for [img:N] syntax (1-based) or field index
}

// Parsed question with image flags
export interface ParsedQuestion {
    rowIndex: number;
    code: string;
    data: Record<string, string>;
    imageRequirements: ImageRequirement[];
    autoCode?: boolean; // true if code will be auto-generated at upload time
    tempImageCode?: string; // Temp code used for image paths when autoCode=true
}

// Parsed passage with image flag
export interface ParsedPassage {
    rowIndex: number;
    code: string;
    data: Record<string, string>;
    imageRequirements: ImageRequirement[];
}

// Result of CSV parsing
export interface ParseResult {
    success: boolean;
    type: string;
    questions: ParsedQuestion[];
    passages: ParsedPassage[];
    errors: ParseError[];
}

// Parse CSV text into rows
function parseCSVRows(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (insideQuotes) {
            if (char === '"' && nextChar === '"') {
                // Escaped quote
                currentCell += '"';
                i++;
            } else if (char === '"') {
                // End of quoted field
                insideQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                // Start of quoted field
                insideQuotes = true;
            } else if (char === ",") {
                // End of cell
                currentRow.push(repairMojibakeText(currentCell.trim()));
                currentCell = "";
            } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
                // End of row
                currentRow.push(repairMojibakeText(currentCell.trim()));
                if (currentRow.some((cell) => cell !== "")) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = "";
                if (char === "\r") i++;
            } else {
                currentCell += char;
            }
        }
    }

    // Last cell and row
    currentRow.push(repairMojibakeText(currentCell.trim()));
    if (currentRow.some((cell) => cell !== "")) {
        rows.push(currentRow);
    }

    return rows;
}

// Check if a value is "yes" (case-insensitive)
function isYes(value: string | undefined): boolean {
    return value?.toLowerCase() === "yes";
}

function parseStrictImageCount(
    value: string | undefined,
): { valid: boolean; count: number } {
    if (!value || value.trim() === "") return { valid: true, count: 0 };
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return { valid: false, count: 0 };
    const count = parseInt(trimmed, 10);
    if (count < 0 || count > 10) return { valid: false, count: 0 };
    return { valid: true, count };
}

function getHeaderIndexMap(headers: string[]): Map<string, number> {
    return new Map(headers.map((header, idx) => [header, idx]));
}

function buildRowData(
    row: string[],
    headerIndexMap: Map<string, number>,
    allowedColumns: string[],
): Record<string, string> {
    const rowData: Record<string, string> = {};

    for (const col of allowedColumns) {
        const idx = headerIndexMap.get(col);
        rowData[col] = idx !== undefined ? row[idx] || "" : "";
    }

    return rowData;
}

// Get storage path for an image
function getImageStoragePath(
    type: "question" | "passage",
    subjectSlug: string,
    code: string,
    field: string,
): string {
    const bucket = type === "passage" ? "passages" : "questions";
    // Dynamic suffix: question_N -> qN, solution_N -> sN
    const questionMatch = field.match(/^question_(\d+)$/);
    const solutionMatch = field.match(/^solution_(\d+)$/);
    const suffix =
        field === "question"
            ? "q"
            : questionMatch
              ? `q${questionMatch[1]}`
              : field === "option_a"
                ? "a"
                : field === "option_b"
                  ? "b"
                  : field === "option_c"
                    ? "c"
                    : field === "option_d"
                      ? "d"
                      : field === "passage"
                        ? "p"
                        : solutionMatch
                          ? `s${solutionMatch[1]}`
                          : "x";

    return `${bucket}/${subjectSlug}/${code}_${suffix}.png`;
}

// Get field label for display
function getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
        question: "Question Image 1",
        option_a: "Option A Image",
        option_b: "Option B Image",
        option_c: "Option C Image",
        option_d: "Option D Image",
        passage: "Passage Image",
    };
    if (labels[field]) return labels[field];
    // Dynamic: question_N -> "Question Image N"
    const qMatch = field.match(/^question_(\d+)$/);
    if (qMatch) return `Question Image ${qMatch[1]}`;
    // Dynamic: solution_N -> "Solution Image N"
    const solMatch = field.match(/^solution_(\d+)$/);
    if (solMatch) return `Solution Image ${solMatch[1]}`;
    return field;
}

// Parse CSV for MCQ types (mcq, passage_mcq, poem_mcq)
function parseMCQ(
    rows: string[][],
    headers: string[],
    type: string,
): { questions: ParsedQuestion[]; errors: ParseError[] } {
    const questions: ParsedQuestion[] = [];
    const errors: ParseError[] = [];

    const baseRequired = [
        "difficulty",
        "question",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "answer",
        "question_images",
        "solution_images",
    ];

    const typeSpecificRequired =
        type === "mcq" ? [] : ["passage_code"];

    // `code` is optional (auto-generated if omitted or empty), `subject` is mandatory for all question types
    const requiredHeaders = ["subject", ...baseRequired, ...typeSpecificRequired];

    const deprecatedHeaders: Array<{ old: string; replacement: string }> = [
        { old: "question_image", replacement: "question_images" },
        { old: "solution_image", replacement: "solution_images" },
    ];

    const deprecatedFound = deprecatedHeaders.filter((h) =>
        headers.includes(h.old),
    );

    if (deprecatedFound.length > 0) {
        for (const header of deprecatedFound) {
            errors.push({
                row: 1,
                column: header.old,
                message: `Column '${header.old}' is not supported. Use '${header.replacement}' (numeric 0-10) instead.`,
            });
        }
        return { questions, errors };
    }

    const missing = requiredHeaders.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
        errors.push({
            row: 1,
            message: `Missing required columns: ${missing.join(", ")}`,
        });
        return { questions, errors };
    }

    // Parse each row
    const templateColumns = CSV_COLUMNS[type as keyof typeof CSV_COLUMNS] || [];
    const headerIndexMap = getHeaderIndexMap(headers);

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData = buildRowData(row, headerIndexMap, templateColumns);

        const code = rowData.code || "";
        const isAutoCode = !code;
        // Use a temp code for image paths when auto-generating codes
        const imageCode = isAutoCode ? `AUTO_${i + 1}` : code;

        // Get subject for storage path
        const subject =
            rowData.subject || rowData.passage_code?.split("_")[0] || "general";
        const subjectSlug = subject.toLowerCase().replace(/\s+/g, "-");

        // Determine image requirements
        const imageRequirements: ImageRequirement[] = [];
        let imageNumber = 1; // Counter for [img:N] syntax

        // Question images: dynamic count from question_images column (default 0)
        const questionImageCount = (() => {
            const parsed = parseStrictImageCount(rowData.question_images);
            if (!parsed.valid) {
                errors.push({
                    row: i + 1,
                    column: "question_images",
                    message:
                        "question_images must be a numeric value between 0 and 10",
                });
                return -1;
            }
            return parsed.count;
        })();

        if (questionImageCount === -1) continue;

        for (let qi = 1; qi <= questionImageCount; qi++) {
            const field = qi === 1 ? "question" : `question_${qi}`;
            imageRequirements.push({
                field,
                label: getFieldLabel(field),
                storagePath: getImageStoragePath(
                    "question",
                    subjectSlug,
                    imageCode,
                    field,
                ),
                number: imageNumber++,
            });
        }

        if (isYes(rowData.option_a_image)) {
            imageRequirements.push({
                field: "option_a",
                label: getFieldLabel("option_a"),
                storagePath: getImageStoragePath(
                    "question",
                    subjectSlug,
                    imageCode,
                    "option_a",
                ),
                number: imageNumber++,
            });
        }

        if (isYes(rowData.option_b_image)) {
            imageRequirements.push({
                field: "option_b",
                label: getFieldLabel("option_b"),
                storagePath: getImageStoragePath(
                    "question",
                    subjectSlug,
                    imageCode,
                    "option_b",
                ),
                number: imageNumber++,
            });
        }

        if (isYes(rowData.option_c_image)) {
            imageRequirements.push({
                field: "option_c",
                label: getFieldLabel("option_c"),
                storagePath: getImageStoragePath(
                    "question",
                    subjectSlug,
                    imageCode,
                    "option_c",
                ),
                number: imageNumber++,
            });
        }

        if (isYes(rowData.option_d_image)) {
            imageRequirements.push({
                field: "option_d",
                label: getFieldLabel("option_d"),
                storagePath: getImageStoragePath(
                    "question",
                    subjectSlug,
                    imageCode,
                    "option_d",
                ),
                number: imageNumber++,
            });
        }

        // Solution images (dynamic count from solution_images column, default 0)
        const solutionImageCount = (() => {
            const parsed = parseStrictImageCount(rowData.solution_images);
            if (!parsed.valid) {
                errors.push({
                    row: i + 1,
                    column: "solution_images",
                    message:
                        "solution_images must be a numeric value between 0 and 10",
                });
                return -1;
            }
            return parsed.count;
        })();

        if (solutionImageCount === -1) continue;

        for (let si = 1; si <= solutionImageCount; si++) {
            const field = `solution_${si}`;
            imageRequirements.push({
                field,
                label: getFieldLabel(field),
                storagePath: getImageStoragePath(
                    "question",
                    subjectSlug,
                    imageCode,
                    field,
                ),
                number: imageNumber++,
            });
        }

        // Validate required fields
        if (!rowData.subject) {
            errors.push({
                row: i + 1,
                column: "subject",
                message: "Subject is required",
            });
            continue;
        }

        if ((type === "passage_mcq" || type === "poem_mcq") && !rowData.passage_code) {
            errors.push({
                row: i + 1,
                column: "passage_code",
                message: "Passage code is required for passage/poem MCQ",
            });
            continue;
        }

        if (!rowData.question) {
            errors.push({
                row: i + 1,
                column: "question",
                message: "Question text is required",
            });
            continue;
        }

        if (
            !rowData.option_a ||
            !rowData.option_b ||
            !rowData.option_c ||
            !rowData.option_d
        ) {
            errors.push({
                row: i + 1,
                message: "All four options (A, B, C, D) are required",
            });
            continue;
        }

        if (!["A", "B", "C", "D"].includes(rowData.answer?.toUpperCase())) {
            errors.push({
                row: i + 1,
                column: "answer",
                message: "Answer must be A, B, C, or D",
            });
            continue;
        }

        if (
            !["easy", "medium", "hard"].includes(
                rowData.difficulty?.toLowerCase(),
            )
        ) {
            errors.push({
                row: i + 1,
                column: "difficulty",
                message: "Difficulty must be easy, medium, or hard",
            });
            continue;
        }

        questions.push({
            rowIndex: i + 1,
            code,
            data: rowData,
            imageRequirements,
            ...(isAutoCode ? { autoCode: true, tempImageCode: imageCode } : {}),
        });
    }

    return { questions, errors };
}

// Parse CSV for fill_blank type
function parseFillBlank(
    rows: string[][],
    headers: string[],
): { questions: ParsedQuestion[]; errors: ParseError[] } {
    const questions: ParsedQuestion[] = [];
    const errors: ParseError[] = [];

    // Validate required headers
    const required = ["subject", "difficulty", "passage_text", "blank_1_options"];
    const missing = required.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
        errors.push({
            row: 1,
            message: `Missing required columns: ${missing.join(", ")}`,
        });
        return { questions, errors };
    }

    const blankOptionColumns = headers.filter((header) =>
        /^blank_\d+_options$/.test(header),
    );
    const templateColumns = [
        ...new Set([...CSV_COLUMNS.fill_blank, ...blankOptionColumns]),
    ];
    const headerIndexMap = getHeaderIndexMap(headers);

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData = buildRowData(row, headerIndexMap, templateColumns);

        const code = rowData.code || "";
        const isAutoCode = !code;

        if (!rowData.subject) {
            errors.push({
                row: i + 1,
                column: "subject",
                message: "Subject is required",
            });
            continue;
        }

        if (
            !["easy", "medium", "hard"].includes(
                rowData.difficulty?.toLowerCase(),
            )
        ) {
            errors.push({
                row: i + 1,
                column: "difficulty",
                message: "Difficulty must be easy, medium, or hard",
            });
            continue;
        }

        if (!rowData.passage_text) {
            errors.push({
                row: i + 1,
                column: "passage_text",
                message: "Passage text is required",
            });
            continue;
        }

        // Count blanks in passage text
        const blankMatches = rowData.passage_text.match(/\[\d+\]/g) || [];
        const blankCount = blankMatches.length;

        if (blankCount === 0) {
            errors.push({
                row: i + 1,
                column: "passage_text",
                message:
                    "Passage must contain at least one blank marker like [1]",
            });
            continue;
        }

        // Validate blank options exist
        for (let b = 1; b <= blankCount; b++) {
            const optionsKey = `blank_${b}_options`;
            if (!rowData[optionsKey]) {
                errors.push({
                    row: i + 1,
                    column: optionsKey,
                    message: `Options for blank ${b} are required`,
                });
            }
        }

        questions.push({
            rowIndex: i + 1,
            code,
            data: rowData,
            imageRequirements: [], // Fill blank doesn't have images
            ...(isAutoCode ? { autoCode: true } : {}),
        });
    }

    return { questions, errors };
}

// Parse CSV for fill_missing_sentence type
function parseFillMissingSentence(
    rows: string[][],
    headers: string[],
): { questions: ParsedQuestion[]; errors: ParseError[] } {
    const questions: ParsedQuestion[] = [];
    const errors: ParseError[] = [];

    // Validate required headers
    const required = ["subject", "difficulty", "passage_with_gaps", "sentences"];
    const missing = required.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
        errors.push({
            row: 1,
            message: `Missing required columns: ${missing.join(", ")}`,
        });
        return { questions, errors };
    }

    const templateColumns = CSV_COLUMNS.fill_missing_sentence;
    const headerIndexMap = getHeaderIndexMap(headers);

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData = buildRowData(row, headerIndexMap, templateColumns);

        const code = rowData.code || "";
        const isAutoCode = !code;

        if (!rowData.subject) {
            errors.push({
                row: i + 1,
                column: "subject",
                message: "Subject is required",
            });
            continue;
        }

        if (
            !["easy", "medium", "hard"].includes(
                rowData.difficulty?.toLowerCase(),
            )
        ) {
            errors.push({
                row: i + 1,
                column: "difficulty",
                message: "Difficulty must be easy, medium, or hard",
            });
            continue;
        }

        if (!rowData.passage_with_gaps) {
            errors.push({
                row: i + 1,
                column: "passage_with_gaps",
                message: "Passage with gaps is required",
            });
            continue;
        }

        // Count gap markers like {GAP_1}, {GAP_2}
        const gapMatches =
            rowData.passage_with_gaps.match(/\{GAP_\d+\}/g) || [];
        const gapCount = gapMatches.length;

        if (gapCount === 0) {
            errors.push({
                row: i + 1,
                column: "passage_with_gaps",
                message:
                    "Passage must contain at least one gap marker like {GAP_1}",
            });
            continue;
        }

        if (!rowData.sentences) {
            errors.push({
                row: i + 1,
                column: "sentences",
                message: "Sentences are required",
            });
            continue;
        }

        const sentenceList = rowData.sentences
            .split("|")
            .map((s: string) => s.trim())
            .filter(Boolean);

        if (sentenceList.length < gapCount) {
            errors.push({
                row: i + 1,
                column: "sentences",
                message: `Need at least ${gapCount} sentences (one per gap), found ${sentenceList.length}`,
            });
            continue;
        }

        questions.push({
            rowIndex: i + 1,
            code,
            data: rowData,
            imageRequirements: [],
            ...(isAutoCode ? { autoCode: true } : {}),
        });
    }

    return { questions, errors };
}

// Parse CSV for passages
function parsePassages(
    rows: string[][],
    headers: string[],
): { passages: ParsedPassage[]; errors: ParseError[] } {
    const passages: ParsedPassage[] = [];
    const errors: ParseError[] = [];

    // Validate required headers
    const required = ["code", "type", "content"];
    const missing = required.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
        errors.push({
            row: 1,
            message: `Missing required columns: ${missing.join(", ")}`,
        });
        return { passages, errors };
    }

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData: Record<string, string> = {};

        headers.forEach((header, idx) => {
            rowData[header] = row[idx] || "";
        });

        const code = rowData.code;
        if (!code) {
            errors.push({
                row: i + 1,
                column: "code",
                message: "Code is required",
            });
            continue;
        }

        if (
            !rowData.type ||
            !["extract", "poem", "article"].includes(rowData.type.toLowerCase())
        ) {
            errors.push({
                row: i + 1,
                column: "type",
                message: "Type must be extract, poem, or article",
            });
            continue;
        }

        if (!rowData.content) {
            errors.push({
                row: i + 1,
                column: "content",
                message: "Content is required",
            });
            continue;
        }

        const imageRequirements: ImageRequirement[] = [];
        if (isYes(rowData.has_image)) {
            imageRequirements.push({
                field: "passage",
                label: "Passage Image",
                storagePath: getImageStoragePath(
                    "passage",
                    "reading",
                    code,
                    "passage",
                ),
            });
        }

        passages.push({
            rowIndex: i + 1,
            code,
            data: rowData,
            imageRequirements: imageRequirements.map((ir, idx) => ({
                ...ir,
                number: idx + 1,
            })),
        });
    }

    return { passages, errors };
}

// Parse CSV for essay prompts
function parseEssay(
    rows: string[][],
    headers: string[],
): { questions: ParsedQuestion[]; errors: ParseError[] } {
    const questions: ParsedQuestion[] = [];
    const errors: ParseError[] = [];

    // Validate required headers
    const required = [
        "subject",
        "difficulty",
        "topic",
        "subtopic",
        "prompt",
        "word_limit",
        "time_mins",
    ];
    const missing = required.filter((col) => !headers.includes(col));
    if (missing.length > 0) {
        errors.push({
            row: 1,
            message: `Missing required columns: ${missing.join(", ")}`,
        });
        return { questions, errors };
    }

    const templateColumns = CSV_COLUMNS.essay;
    const headerIndexMap = getHeaderIndexMap(headers);

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData = buildRowData(row, headerIndexMap, templateColumns);

        const code = rowData.code || "";
        const isAutoCode = !code;

        if (!rowData.subject) {
            errors.push({
                row: i + 1,
                column: "subject",
                message: "Subject is required",
            });
            continue;
        }

        if (
            !["easy", "medium", "hard"].includes(
                rowData.difficulty?.toLowerCase(),
            )
        ) {
            errors.push({
                row: i + 1,
                column: "difficulty",
                message: "Difficulty must be easy, medium, or hard",
            });
            continue;
        }

        if (!rowData.prompt) {
            errors.push({
                row: i + 1,
                column: "prompt",
                message: "Prompt is required",
            });
            continue;
        }

        if (!rowData.topic?.trim()) {
            errors.push({
                row: i + 1,
                column: "topic",
                message:
                    "Topic is required (Narrative, Persuasive, or Informative)",
            });
            continue;
        }

        if (!rowData.subtopic?.trim()) {
            errors.push({
                row: i + 1,
                column: "subtopic",
                message: "Subtopic is required (writing sub-style/genre)",
            });
            continue;
        }

        if (!rowData.word_limit || isNaN(parseInt(rowData.word_limit))) {
            errors.push({
                row: i + 1,
                column: "word_limit",
                message: "Word limit must be a number",
            });
            continue;
        }

        if (!rowData.time_mins || isNaN(parseInt(rowData.time_mins))) {
            errors.push({
                row: i + 1,
                column: "time_mins",
                message: "Time in minutes must be a number",
            });
            continue;
        }

        questions.push({
            rowIndex: i + 1,
            code,
            data: rowData,
            imageRequirements: [], // Essays don't have images
            ...(isAutoCode ? { autoCode: true } : {}),
        });
    }

    return { questions, errors };
}

// Main parse function
export function parseCSV(csvText: string, type: string): ParseResult {
    const rows = parseCSVRows(csvText);

    if (rows.length < 2) {
        return {
            success: false,
            type,
            questions: [],
            passages: [],
            errors: [
                {
                    row: 0,
                    message:
                        "CSV must have a header row and at least one data row",
                },
            ],
        };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());

    const result: ParseResult = {
        success: false,
        type,
        questions: [],
        passages: [],
        errors: [],
    };

    switch (type) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq": {
            const { questions, errors } = parseMCQ(rows, headers, type);
            result.questions = questions;
            result.errors = errors;
            break;
        }

        case "fill_blank": {
            const { questions, errors } = parseFillBlank(rows, headers);
            result.questions = questions;
            result.errors = errors;
            break;
        }

        case "fill_missing_sentence": {
            const { questions, errors } = parseFillMissingSentence(
                rows,
                headers,
            );
            result.questions = questions;
            result.errors = errors;
            break;
        }

        case "passage": {
            const { passages, errors } = parsePassages(rows, headers);
            result.passages = passages;
            result.errors = errors;
            break;
        }

        case "essay": {
            const { questions, errors } = parseEssay(rows, headers);
            result.questions = questions;
            result.errors = errors;
            break;
        }

        default:
            result.errors.push({
                row: 0,
                message: `Unknown question type: ${type}`,
            });
    }

    result.success = result.errors.length === 0;
    return result;
}

// Check if any items have image requirements
export function hasImageRequirements(result: ParseResult): boolean {
    const questionImages = result.questions.some(
        (q) => q.imageRequirements.length > 0,
    );
    const passageImages = result.passages.some(
        (p) => p.imageRequirements.length > 0,
    );
    return questionImages || passageImages;
}

// Get total image count
export function getTotalImageCount(result: ParseResult): number {
    const questionImages = result.questions.reduce(
        (sum, q) => sum + q.imageRequirements.length,
        0,
    );
    const passageImages = result.passages.reduce(
        (sum, p) => sum + p.imageRequirements.length,
        0,
    );
    return questionImages + passageImages;
}
