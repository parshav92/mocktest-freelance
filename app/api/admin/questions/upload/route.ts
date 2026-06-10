import { NextRequest, NextResponse } from "next/server";
// NOTE: Keep `CSV_UPLOAD_SPEC.md` in sync whenever upload transformation rules change.
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import { getCSVTemplate } from "@/lib/csv/templates";
import type { ParsedQuestion, ParsedPassage } from "@/lib/csv/parser";
import {
    loadValidWritingSubtopicKeys,
    validateWritingTopicPair,
    canonicalizeWritingMainTopic,
} from "@/lib/services/writing-marking-criteria.service";
import { WRITING_TOTAL_MARKS } from "@/lib/types/writing-marking-criteria";

// GET - Download template
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get("template");

    if (!templateType) {
        return errorResponse("Template type required", 400);
    }

    const validTypes = [
        "mcq",
        "passage_mcq",
        "poem_mcq",
        "fill_blank",
        "fill_missing_sentence",
        "passage",
        "essay",
    ];
    if (!validTypes.includes(templateType)) {
        return errorResponse(
            `Invalid type. Use: ${validTypes.join(", ")}`,
            400,
        );
    }

    try {
        const template = getCSVTemplate(
            templateType as keyof typeof import("@/lib/csv/templates").CSV_COLUMNS,
        );

        return new NextResponse(template, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="${templateType}_template.csv"`,
            },
        });
    } catch {
        return errorResponse("Failed to generate template", 500);
    }
}

// POST - Upload questions/passages with images
export async function POST(request: NextRequest) {
    // Check admin auth
    const auth = await requireAdmin();
    if (!auth.isAdmin) {
        return errorResponse(auth.error, auth.status);
    }

    try {
        const formData = await request.formData();
        const uploadType = formData.get("type") as string | null;
        const dataJson = formData.get("data") as string | null;

        if (!uploadType) {
            return errorResponse("Upload type is required", 400);
        }

        if (!dataJson) {
            return errorResponse("Data is required", 400);
        }

        const validTypes = [
            "mcq",
            "passage_mcq",
            "poem_mcq",
            "fill_blank",
            "fill_missing_sentence",
            "passage",
            "essay",
        ];
        if (!validTypes.includes(uploadType)) {
            return errorResponse(
                `Invalid type. Use: ${validTypes.join(", ")}`,
                400,
            );
        }

        // Parse the data
        const parsedData = JSON.parse(dataJson) as {
            questions: ParsedQuestion[];
            passages: ParsedPassage[];
        };

        // Get images from form data
        const images = formData.getAll("images") as File[];
        const imagePaths = formData.getAll("imagePaths") as string[];

        // Create map of storage path -> file
        const imageMap = new Map<string, File>();
        for (let i = 0; i < images.length; i++) {
            if (images[i] && imagePaths[i]) {
                imageMap.set(imagePaths[i], images[i]);
            }
        }

        // Get Supabase client
        const supabase = await createClient();

        // Upload images to storage first
        const uploadedImageUrls = new Map<string, string>();

        for (const [storagePath, file] of imageMap) {
            // Extract bucket from path (e.g., "questions/math/MR_001_q.png" -> "questions")
            const [bucket, ...pathParts] = storagePath.split("/");
            const filePath = pathParts.join("/");

            // Convert file to buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);

            // Upload to storage
            const { error } = await supabase.storage
                .from(bucket)
                .upload(filePath, buffer, {
                    contentType: file.type || "image/png",
                    upsert: true,
                });

            if (error) {
                console.error(`Failed to upload ${storagePath}:`, error);
                return errorResponse(
                    `Failed to upload image: ${storagePath}`,
                    500,
                );
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);
            uploadedImageUrls.set(storagePath, urlData.publicUrl);
        }

        // Insert data based on type
        let result;

        if (uploadType === "passage") {
            result = await insertPassages(
                supabase,
                parsedData.passages,
                uploadedImageUrls,
            );
        } else {
            result = await insertQuestions(
                supabase,
                parsedData.questions,
                uploadType,
                uploadedImageUrls,
                auth.userId,
            );
        }

        return successResponse(result);
    } catch (error) {
        console.error("Upload error:", error);
        return errorResponse(
            error instanceof Error ? error.message : "Upload failed",
            500,
        );
    }
}

/**
 * Extract prefix from a question/passage code
 * e.g., "RD_P_001" -> "RD", "MR_MCQ_001" -> "MR"
 */
function extractCodePrefix(code: string): string {
    const match = (code || "").toUpperCase().match(/^([A-Z]{2,5})_/);
    return match ? match[1] : "";
}

function parseImageCount(value: string | undefined): number {
    if (!value || value.trim() === "") return 0;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return 0;
    const count = parseInt(trimmed, 10);
    if (count < 0) return 0;
    if (count > 10) return 10;
    return count;
}

function toNullableText(value: string | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * Insert parsed passages into database
 */
async function insertPassages(
    supabase: Awaited<ReturnType<typeof createClient>>,
    passages: ParsedPassage[],
    imageUrls: Map<string, string>,
) {
    if (passages.length === 0) {
        return { inserted: 0, batchId: null };
    }

    // Get subject IDs and code_prefix mappings
    const { data: subjects, error: subjectError } = await supabase
        .from("subjects")
        .select("id, slug, code_prefix");

    if (subjectError || !subjects) {
        throw new Error("Failed to fetch subjects");
    }

    // Map: code_prefix -> subject_id (e.g., "RD" -> uuid)
    const prefixToSubjectId = new Map(
        subjects
            .filter((s) => s.code_prefix)
            .map((s) => [s.code_prefix.toUpperCase(), s.id]),
    );

    // Check for duplicate codes
    const codes = passages.map((p) => p.code);
    const { data: existing } = await supabase
        .from("passages")
        .select("code")
        .in("code", codes);

    const existingCodes = new Set((existing || []).map((e) => e.code));
    const duplicates = codes.filter((c) => existingCodes.has(c));

    if (duplicates.length > 0) {
        throw new Error(`Duplicate passage codes: ${duplicates.join(", ")}`);
    }

    // Prepare passages for insert
    const passagesToInsert = passages.map((p) => {
        // Infer subject from code prefix
        const prefix = extractCodePrefix(p.code);
        const subjectId = prefixToSubjectId.get(prefix);

        if (!subjectId) {
            throw new Error(
                `Cannot determine subject for passage "${p.code}". Code prefix "${prefix}" not recognized. Available prefixes: ${Array.from(prefixToSubjectId.keys()).join(", ")}`,
            );
        }

        // Get image URL if exists
        let imageUrl = null;
        for (const req of p.imageRequirements) {
            const url = imageUrls.get(req.storagePath);
            if (url) {
                imageUrl = url;
                break;
            }
        }

        return {
            code: p.code,
            subject_id: subjectId,
            passage_type: p.data.type.toLowerCase(), // CSV column is 'type', DB column is 'passage_type' — normalize to lowercase
            title: p.data.title || null,
            content: p.data.content,
            image_url: imageUrl,
        };
    });

    // Insert passages
    const { data, error } = await supabase
        .from("passages")
        .insert(passagesToInsert)
        .select("id, code");

    if (error) {
        throw new Error(`Failed to insert passages: ${error.message}`);
    }

    return {
        inserted: data?.length || 0,
        passages: data,
    };
}

/**
 * Map upload type to code abbreviation for auto-generated question codes
 */
function getQuestionTypeCode(uploadType: string): string {
    switch (uploadType) {
        case "mcq":
            return "MCQ";
        case "passage_mcq":
            return "MCQ";
        case "poem_mcq":
            return "POEM_MCQ";
        case "fill_blank":
            return "FIB";
        case "fill_missing_sentence":
            return "FMS";
        case "essay":
            return "ESSAY";
        default:
            return "MCQ";
    }
}

/**
 * Insert parsed questions into database
 */
async function insertQuestions(
    supabase: Awaited<ReturnType<typeof createClient>>,
    questions: ParsedQuestion[],
    uploadType: string,
    imageUrls: Map<string, string>,
    uploadedBy: string,
) {
    if (questions.length === 0) {
        return { inserted: 0, batchId: null };
    }

    const validWritingSubtopicKeys =
        uploadType === "essay"
            ? await loadValidWritingSubtopicKeys(supabase)
            : null;

    if (uploadType === "essay") {
        for (const q of questions) {
            const topic = q.data.topic?.trim() || "";
            const subtopic = q.data.subtopic?.trim() || "";
            const validationError = validateWritingTopicPair(
                validWritingSubtopicKeys!,
                topic,
                subtopic,
            );
            if (validationError) {
                throw new Error(
                    `Row ${q.rowIndex}: ${validationError}`,
                );
            }
        }
    }

    // Get subject IDs and code_prefix mappings
    const { data: subjects, error: subjectError } = await supabase
        .from("subjects")
        .select("id, slug, code_prefix");

    if (subjectError || !subjects) {
        throw new Error("Failed to fetch subjects");
    }

    // Map: slug -> subject_id
    const subjectMap = new Map(subjects.map((s) => [s.slug, s.id]));
    // Map: code_prefix -> slug (e.g., "RD" -> "reading")
    const prefixToSlug = new Map(
        subjects
            .filter((s) => s.code_prefix)
            .map((s) => [s.code_prefix.toUpperCase(), s.slug]),
    );

    // Get passage IDs if any questions reference passages
    // Support comma-separated passage codes (e.g., "RD_P_001,RD_P_002")
    const passageCodes = [
        ...new Set(
            questions
                .filter((q) => q.data.passage_code)
                .flatMap((q) =>
                    q.data
                        .passage_code!.split(",")
                        .map((c) => c.trim())
                        .filter(Boolean),
                ),
        ),
    ];

    let passageMap = new Map<string, string>();

    if (passageCodes.length > 0) {
        const { data: passages, error: passageError } = await supabase
            .from("passages")
            .select("id, code")
            .in("code", passageCodes);

        if (passageError) {
            throw new Error("Failed to fetch passages");
        }

        passageMap = new Map((passages || []).map((p) => [p.code, p.id]));

        // Check for missing passages
        const missingPassages = passageCodes.filter(
            (code) => !passageMap.has(code),
        );
        if (missingPassages.length > 0) {
            throw new Error(
                `Passages not found: ${missingPassages.join(", ")}. Upload passages first.`,
            );
        }
    }

    // Infer subject slug from various sources (using DB prefix map)
    function inferSubjectSlug(data: Record<string, string>): string {
        // 1. If subject is explicitly provided in CSV, use it
        if (data.subject)
            return data.subject.toLowerCase().replace(/\s+/g, "-");
        // 2. Infer from referenced passage code prefix (passage_mcq/poem_mcq)
        if (data.passage_code) {
            const firstPassageCode = data.passage_code
                .split(",")
                .map((c) => c.trim())
                .find(Boolean);
            const passagePrefix = extractCodePrefix(firstPassageCode || "");
            if (passagePrefix && prefixToSlug.has(passagePrefix)) {
                return prefixToSlug.get(passagePrefix)!;
            }
        }
        // 3. Infer from question code prefix using DB mapping
        const prefix = extractCodePrefix(data.code);
        if (prefix && prefixToSlug.has(prefix)) {
            return prefixToSlug.get(prefix)!;
        }
        return "";
    }

    // --- Auto-generate codes for questions without codes ---
    const autoCodeQuestions = questions.filter((q) => q.autoCode);
    if (autoCodeQuestions.length > 0) {
        const typeCode = getQuestionTypeCode(uploadType);

        // Group auto-code questions by subject
        const subjectGroups = new Map<
            string,
            {
                subjectId: string;
                prefix: string;
                questions: ParsedQuestion[];
            }
        >();

        for (const q of autoCodeQuestions) {
            const slug = inferSubjectSlug(q.data);
            const subjectId = subjectMap.get(slug);
            if (!subjectId) {
                throw new Error(
                    `Cannot determine subject for auto-code question at row ${q.rowIndex}. Subject "${q.data.subject || "unknown"}" not found.`,
                );
            }

            const subject = subjects.find((s) => s.id === subjectId);
            const prefix =
                subject?.code_prefix?.toUpperCase() ||
                slug.toUpperCase().slice(0, 2);

            const key = `${subjectId}_${typeCode}`;
            if (!subjectGroups.has(key)) {
                subjectGroups.set(key, {
                    subjectId,
                    prefix,
                    questions: [],
                });
            }
            subjectGroups.get(key)!.questions.push(q);
        }

        // Reserve codes for each (subject, type) group
        for (const [, group] of subjectGroups) {
            const { data: startAt, error: rpcError } = await supabase.rpc(
                "reserve_question_codes",
                {
                    p_subject_id: group.subjectId,
                    p_question_type: typeCode,
                    p_batch_size: group.questions.length,
                },
            );

            if (rpcError) {
                throw new Error(
                    `Failed to reserve question codes: ${rpcError.message}`,
                );
            }

            // Assign sequential codes: PREFIX_TYPE_NNNN
            group.questions.forEach((q, idx) => {
                const num = (startAt as number) + idx;
                q.code = `${group.prefix}_${typeCode}_${String(num).padStart(4, "0")}`;
                q.autoCode = false; // Mark as resolved
            });
        }

        // Remap image URL keys from temp codes to real codes
        // so findImageUrl can match images to questions by real code
        for (const q of autoCodeQuestions) {
            if (q.tempImageCode && q.code) {
                const tempCode = q.tempImageCode;
                const realCode = q.code;
                const keysToRemap: string[] = [];
                for (const [path] of imageUrls) {
                    if (path.includes(tempCode)) {
                        keysToRemap.push(path);
                    }
                }
                for (const oldPath of keysToRemap) {
                    const url = imageUrls.get(oldPath)!;
                    const newPath = oldPath.replace(tempCode, realCode);
                    imageUrls.set(newPath, url);
                    imageUrls.delete(oldPath);
                }
            }
        }
    }

    // Check for duplicate codes (only for manually-specified codes;
    // auto-generated codes are guaranteed unique by the counter)
    const manualCodes = questions
        .filter((q) => q.code)
        .map((q) => q.code);

    if (manualCodes.length > 0) {
        const { data: existing } = await supabase
            .from("questions")
            .select("code")
            .in("code", manualCodes);

        const existingCodes = new Set(
            (existing || []).map((e) => e.code),
        );
        const duplicates = manualCodes.filter((c) =>
            existingCodes.has(c),
        );

        if (duplicates.length > 0) {
            throw new Error(
                `Duplicate question codes: ${duplicates.join(", ")}`,
            );
        }
    }

    // Get first question's subject_id for the batch
    const firstQuestion = questions[0];
    const subjectSlug = inferSubjectSlug(firstQuestion.data);
    const batchSubjectId = subjectMap.get(subjectSlug);

    if (!batchSubjectId) {
        throw new Error(
            `Invalid subject: "${subjectSlug || firstQuestion.data.subject || "unknown"}". Ensure the subject slug exists in the database.`,
        );
    }

    // Create upload batch record
    const { data: batch, error: batchError } = await supabase
        .from("question_upload_batches")
        .insert({
            uploaded_by: uploadedBy,
            subject_id: batchSubjectId,
            filename: `upload_${Date.now()}.csv`,
            total_questions: questions.length,
            successful: 0,
            failed: 0,
            status: "processing",
        })
        .select("id")
        .single();

    if (batchError || !batch) {
        console.error("Batch creation error:", batchError);
        throw new Error(
            `Failed to create upload batch: ${batchError?.message || "Unknown error"}`,
        );
    }

    // Prepare questions for insert
    const questionsToInsert = questions.map((q) => {
        const qSubjectSlug = inferSubjectSlug(q.data);
        const subjectId = subjectMap.get(qSubjectSlug);

        // Build content object based on question type
        let content: Record<string, unknown> = {};
        let correctAnswer: Record<string, unknown> | null = null;

        if (
            uploadType === "mcq" ||
            uploadType === "passage_mcq" ||
            uploadType === "poem_mcq"
        ) {
            const questionImages: string[] = [];
            const qImgCount = parseImageCount(q.data.question_images);
            for (let qi = 1; qi <= qImgCount; qi++) {
                const field = qi === 1 ? "question" : `question_${qi}`;
                const url = findImageUrl(imageUrls, q.code, field);
                if (url) questionImages.push(url);
            }

            // Build options with optional image URLs
            const options = [
                {
                    label: "A",
                    text: q.data.option_a,
                    image_url: findImageUrl(imageUrls, q.code, "option_a"),
                },
                {
                    label: "B",
                    text: q.data.option_b,
                    image_url: findImageUrl(imageUrls, q.code, "option_b"),
                },
                {
                    label: "C",
                    text: q.data.option_c,
                    image_url: findImageUrl(imageUrls, q.code, "option_c"),
                },
                {
                    label: "D",
                    text: q.data.option_d,
                    image_url: findImageUrl(imageUrls, q.code, "option_d"),
                },
            ];

            content = {
                question: q.data.question,
                question_image: questionImages[0] || null,
                question_images:
                    questionImages.length > 0 ? questionImages : undefined,
                options,
            };

            correctAnswer = { label: q.data.answer?.toUpperCase() };
        } else if (uploadType === "fill_blank") {

            // Parse blanks. CSV convention: first option is the correct one.
            const blanks: Array<{
                position: number;
                options: string[];
                correct_index: number;
                correct: string;
            }> = [];
            for (let i = 1; i <= 5; i++) {
                const optionsStr = q.data[`blank_${i}_options`];
                if (optionsStr) {
                    const opts = optionsStr
                        .split("|")
                        .map((o: string) => o.trim());
                    const correctIndex = 0;
                    blanks.push({
                        position: i,
                        options: opts,
                        correct_index: correctIndex,
                        // Keep text for compatibility with older review screens.
                        correct: opts[correctIndex] || "",
                    });
                }
            }

            content = {
                passage_text: q.data.passage_text,
                blanks,
            };

            correctAnswer = {
                blanks: blanks.map((b) => ({
                    position: b.position,
                    correct_index: b.correct_index,
                    correct: b.correct,
                })),
            };
        } else if (uploadType === "fill_missing_sentence") {
            // Parse sentences from pipe-separated string
            const sentences = q.data.sentences
                .split("|")
                .map((s: string) => s.trim())
                .filter(Boolean);

            // Build correct_mapping from gap order: GAP_1 -> 0, GAP_2 -> 1, etc.
            const gapMatches =
                (q.data.passage_with_gaps || "").match(/\{(GAP_\d+)\}/g) || [];
            const correctMapping: Record<string, number> = {};
            gapMatches.forEach((gap, idx) => {
                const key = gap.replace(/[{}]/g, ""); // "GAP_1"
                correctMapping[key] = idx;
            });

            content = {
                passage_with_gaps: q.data.passage_with_gaps,
                sentences,
                correct_mapping: correctMapping,
            };

            correctAnswer = { mapping: correctMapping };
        } else if (uploadType === "essay") {
            content = {
                prompt: q.data.prompt,
                word_limit: parseInt(q.data.word_limit, 10),
                time_mins: parseInt(q.data.time_mins, 10),
            };
            correctAnswer = {};
        }

        // Build passage_ids array from comma-separated passage codes
        const passageIds: string[] = q.data.passage_code
            ? q.data.passage_code
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean)
                .map((code) => passageMap.get(code)!)
                .filter(Boolean)
            : [];

        // Build solution_images array from uploaded solution images (dynamic count)
        const solutionImages: string[] = [];
        const solImgCount = parseImageCount(q.data.solution_images);
        for (let si = 1; si <= solImgCount; si++) {
            const url = findImageUrl(imageUrls, q.code, `solution_${si}`);
            if (url) solutionImages.push(url);
        }

        return {
            subject_id: subjectId || null,
            passage_ids: passageIds,
            code: q.code,
            question_type: getQuestionType(uploadType),
            difficulty: q.data.difficulty?.toLowerCase() || "medium",
            topic: toNullableText(
                uploadType === "essay"
                    ? canonicalizeWritingMainTopic(q.data.topic || "") ||
                      q.data.topic
                    : q.data.topic,
            ),
            subtopic: toNullableText(q.data.subtopic),
            content,
            correct_answer: correctAnswer,
            solution_text: q.data.solution || null,
            solution_images: solutionImages,
            marks: uploadType === "essay" ? WRITING_TOTAL_MARKS : 1,
            is_active: true,
        };
    });

    // Insert questions
    const { data, error } = await supabase
        .from("questions")
        .insert(questionsToInsert)
        .select("id, code");

    if (error) {
        // Update batch status
        await supabase
            .from("question_upload_batches")
            .update({
                status: "failed",
                failed: questions.length,
                errors: [{ message: error.message }],
            })
            .eq("id", batch.id);

        throw new Error(`Failed to insert questions: ${error.message}`);
    }

    // Update batch status
    await supabase
        .from("question_upload_batches")
        .update({
            status: "completed",
            successful: data?.length || 0,
        })
        .eq("id", batch.id);

    return {
        inserted: data?.length || 0,
        batchId: batch.id,
        questions: data,
    };
}

/**
 * Find image URL for a field.
 * Extension-agnostic: matches any path whose basename (without extension)
 * ends with `<code><fieldSuffix>`. This handles .png, .webp, .jpg, etc.
 */
function findImageUrl(
    imageUrls: Map<string, string>,
    code: string,
    field: string,
): string | null {
    // Dynamic suffix: question_N -> _qN, solution_N -> _sN
    const questionMatch = field.match(/^question_(\d+)$/);
    const solutionMatch = field.match(/^solution_(\d+)$/);
    const fieldSuffix =
        field === "question"
            ? "_q"
            : questionMatch
                ? `_q${questionMatch[1]}`
                : field === "option_a"
                    ? "_a"
                    : field === "option_b"
                        ? "_b"
                        : field === "option_c"
                            ? "_c"
                            : field === "option_d"
                                ? "_d"
                                : solutionMatch
                                    ? `_s${solutionMatch[1]}`
                                    : "";

    if (!fieldSuffix) return null;

    const baseSuffix = `${code}${fieldSuffix}`;

    for (const [path, url] of imageUrls) {
        // Strip extension from the path's filename before comparing
        const withoutExt = path.replace(/\.[^/.]+$/, "");
        if (withoutExt.endsWith(baseSuffix)) {
            return url;
        }
    }
    return null;
}

/**
 * Map upload type to question_type enum
 */
function getQuestionType(uploadType: string): string {
    switch (uploadType) {
        case "mcq":
            return "mcq";
        case "passage_mcq":
            return "passage_mcq";
        case "poem_mcq":
            return "poem_mcq";
        case "fill_blank":
            return "fill_blank_dropdown";
        case "fill_missing_sentence":
            return "fill_missing_sentence";
        case "essay":
            return "essay";
        default:
            return "mcq";
    }
}
