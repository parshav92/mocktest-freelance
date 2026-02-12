import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/auth/admin";

// GET - List all active subjects (public for students)
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subjects")
    .select(
      `
      id,
      name,
      slug,
      description,
      icon,
      duration_mins,
      total_questions,
      instructions,
      display_order
    `
    )
    .eq("is_active", true)
    .order("display_order");

  if (error) {
    return errorResponse(error.message, 500);
  }

  // Get question counts per subject
  const { data: counts } = await supabase
    .from("questions")
    .select("subject_id")
    .eq("is_active", true);

  const questionCounts: Record<string, number> = {};
  if (counts) {
    for (const q of counts) {
      questionCounts[q.subject_id] = (questionCounts[q.subject_id] || 0) + 1;
    }
  }

  // Add question counts to subjects
  const subjects = data?.map((s) => ({
    ...s,
    question_count: questionCounts[s.id] || 0,
  }));

  return successResponse({ subjects });
}
