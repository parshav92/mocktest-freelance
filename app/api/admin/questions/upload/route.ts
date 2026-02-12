import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import { getCSVTemplate } from "@/lib/csv/templates";
import type { ParsedQuestion, ParsedPassage } from "@/lib/csv/parser";

// GET - Download template
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const templateType = searchParams.get("template");

  if (!templateType) {
    return errorResponse("Template type required", 400);
  }

  const validTypes = ["mcq", "passage_mcq", "poem_mcq", "fill_blank", "passage", "essay"];
  if (!validTypes.includes(templateType)) {
    return errorResponse(`Invalid type. Use: ${validTypes.join(", ")}`, 400);
  }

  try {
    const template = getCSVTemplate(templateType as keyof typeof import("@/lib/csv/templates").CSV_COLUMNS);

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

    const validTypes = ["mcq", "passage_mcq", "poem_mcq", "fill_blank", "passage", "essay"];
    if (!validTypes.includes(uploadType)) {
      return errorResponse(`Invalid type. Use: ${validTypes.join(", ")}`, 400);
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
        return errorResponse(`Failed to upload image: ${storagePath}`, 500);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      uploadedImageUrls.set(storagePath, urlData.publicUrl);
    }

    // Insert data based on type
    let result;

    if (uploadType === "passage") {
      result = await insertPassages(
        supabase,
        parsedData.passages,
        uploadedImageUrls
      );
    } else {
      result = await insertQuestions(
        supabase,
        parsedData.questions,
        uploadType,
        uploadedImageUrls,
        auth.userId
      );
    }

    return successResponse(result);
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Upload failed",
      500
    );
  }
}

/**
 * Insert parsed passages into database
 */
async function insertPassages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  passages: ParsedPassage[],
  imageUrls: Map<string, string>
) {
  if (passages.length === 0) {
    return { inserted: 0, batchId: null };
  }

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
      type: p.data.type,
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
 * Insert parsed questions into database
 */
async function insertQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questions: ParsedQuestion[],
  uploadType: string,
  imageUrls: Map<string, string>,
  uploadedBy: string
) {
  if (questions.length === 0) {
    return { inserted: 0, batchId: null };
  }

  // Get subject IDs
  const { data: subjects, error: subjectError } = await supabase
    .from("subjects")
    .select("id, slug");

  if (subjectError || !subjects) {
    throw new Error("Failed to fetch subjects");
  }

  const subjectMap = new Map(subjects.map((s) => [s.slug, s.id]));

  // Get passage IDs if any questions reference passages
  const passageCodes = [
    ...new Set(questions.filter((q) => q.data.passage_code).map((q) => q.data.passage_code!)),
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
    const missingPassages = passageCodes.filter((code) => !passageMap.has(code));
    if (missingPassages.length > 0) {
      throw new Error(`Passages not found: ${missingPassages.join(", ")}. Upload passages first.`);
    }
  }

  // Check for duplicate codes
  const codes = questions.map((q) => q.code);
  const { data: existing } = await supabase
    .from("questions")
    .select("code")
    .in("code", codes);

  const existingCodes = new Set((existing || []).map((e) => e.code));
  const duplicates = codes.filter((c) => existingCodes.has(c));

  if (duplicates.length > 0) {
    throw new Error(`Duplicate question codes: ${duplicates.join(", ")}`);
  }

  // Get first question's subject_id for the batch
  const firstQuestion = questions[0];
  const subjectSlug = firstQuestion.data.subject || "general";
  const batchSubjectId = subjectMap.get(subjectSlug.toLowerCase().replace(/\s+/g, "-"));

  if (!batchSubjectId) {
    throw new Error(`Invalid subject: ${subjectSlug}`);
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
    throw new Error(`Failed to create upload batch: ${batchError?.message || "Unknown error"}`);
  }

  // Prepare questions for insert
  const questionsToInsert = questions.map((q) => {
    const subjectSlug = q.data.subject || "general";
    const subjectId = subjectMap.get(subjectSlug.toLowerCase().replace(/\s+/g, "-"));

    // Build content object based on question type
    let content: Record<string, unknown> = {};
    let correctAnswer: Record<string, unknown> | null = null;

    if (uploadType === "mcq" || uploadType === "passage_mcq" || uploadType === "poem_mcq") {
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
        question_image_url: findImageUrl(imageUrls, q.code, "question"),
        options,
      };

      correctAnswer = { label: q.data.answer?.toUpperCase() };
    } else if (uploadType === "fill_blank") {
      // Parse blanks
      const blanks: Array<{ options: string[]; correct: string }> = [];
      for (let i = 1; i <= 5; i++) {
        const optionsStr = q.data[`blank_${i}_options`];
        if (optionsStr) {
          const opts = optionsStr.split("|").map((o: string) => o.trim());
          blanks.push({
            options: opts,
            correct: opts[0], // First option is correct
          });
        }
      }

      content = {
        passage_text: q.data.passage_text,
        blanks,
      };

      correctAnswer = { blanks: blanks.map((b) => b.correct) };
    } else if (uploadType === "essay") {
      // Parse rubric
      const rubric: Record<string, number> = {};
      if (q.data.rubric) {
        const rubricParts = q.data.rubric.split("|");
        for (const part of rubricParts) {
          const [category, points] = part.split(":");
          if (category && points) {
            rubric[category.trim()] = parseInt(points.trim(), 10);
          }
        }
      }

      content = {
        prompt: q.data.prompt,
        word_limit: parseInt(q.data.word_limit, 10),
        time_mins: parseInt(q.data.time_mins, 10),
        rubric,
      };

      correctAnswer = null; // Essays don't have a correct answer
    }

    return {
      subject_id: subjectId || null,
      passage_id: q.data.passage_code ? passageMap.get(q.data.passage_code) : null,
      code: q.code,
      question_type: getQuestionType(uploadType),
      difficulty: q.data.difficulty?.toLowerCase() || "medium",
      content,
      correct_answer: correctAnswer,
      solution_text: q.data.solution || null,
      marks: 1,
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
 * Find image URL for a field
 */
function findImageUrl(
  imageUrls: Map<string, string>,
  code: string,
  field: string
): string | null {
  // Look for any path ending with the code and field suffix
  for (const [path, url] of imageUrls) {
    const suffix =
      field === "question" ? "_q.png" :
      field === "option_a" ? "_a.png" :
      field === "option_b" ? "_b.png" :
      field === "option_c" ? "_c.png" :
      field === "option_d" ? "_d.png" : "";

    if (path.endsWith(`${code}${suffix}`)) {
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
    case "essay":
      return "essay";
    default:
      return "mcq";
  }
}
