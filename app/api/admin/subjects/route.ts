import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";

// Available icons for subjects
export const SUBJECT_ICONS = [
  "book-open",
  "pencil",
  "calculator",
  "brain",
  "flask",
  "globe",
  "music",
  "palette",
  "code",
  "microscope",
  "atom",
  "lightbulb",
  "compass",
  "ruler",
  "library",
  "graduation-cap",
  "languages",
  "history",
] as const;

export type SubjectIcon = (typeof SUBJECT_ICONS)[number];

interface CreateSubjectBody {
  name: string;
  slug: string;
  code_prefix: string;
  description?: string;
  icon: SubjectIcon;
  duration_mins: number;
  total_questions: number;
  instructions?: {
    pages: Array<{
      title: string;
      content: string;
    }>;
  };
  template?: {
    easy_count: number;
    medium_count: number;
    hard_count: number;
  };
}

/**
 * GET /api/admin/subjects
 * List all subjects (including inactive) for admin management
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return errorResponse(auth.error, auth.status);
  }

  try {
    const supabase = await createClient();

    // Get all subjects with their default template
    const { data: subjects, error } = await supabase
      .from("subjects")
      .select(`
        id,
        name,
        slug,
        code_prefix,
        description,
        icon,
        duration_mins,
        total_questions,
        instructions,
        is_active,
        display_order,
        created_at,
        updated_at,
        subject_templates!inner (
          id,
          name,
          is_default,
          easy_count,
          medium_count,
          hard_count
        )
      `)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching subjects:", error);
      return errorResponse("Failed to fetch subjects", 500);
    }

    // Get question counts per subject
    const { data: questionCounts } = await supabase
      .from("questions")
      .select("subject_id")
      .eq("is_active", true);

    const countMap = new Map<string, number>();
    (questionCounts || []).forEach((q) => {
      countMap.set(q.subject_id, (countMap.get(q.subject_id) || 0) + 1);
    });

    // Enrich subjects with question counts and flatten template
    const enrichedSubjects = (subjects || []).map((s) => ({
      ...s,
      question_count: countMap.get(s.id) || 0,
      default_template: s.subject_templates?.find((t: { is_default: boolean }) => t.is_default) || null,
    }));

    return successResponse({
      subjects: enrichedSubjects,
      available_icons: SUBJECT_ICONS,
    });
  } catch (error) {
    console.error("Error in subjects GET:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/admin/subjects
 * Create a new subject
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return errorResponse(auth.error, auth.status);
  }

  try {
    const body: CreateSubjectBody = await request.json();

    // Validate required fields
    if (!body.name || !body.slug || !body.code_prefix || !body.icon) {
      return errorResponse("Missing required fields: name, slug, code_prefix, icon", 400);
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return errorResponse("Slug must be lowercase letters, numbers, and hyphens only", 400);
    }

    // Validate code_prefix format (2-5 uppercase letters)
    if (!/^[A-Z]{2,5}$/.test(body.code_prefix.toUpperCase())) {
      return errorResponse("Code prefix must be 2-5 uppercase letters", 400);
    }

    // Validate icon
    if (!SUBJECT_ICONS.includes(body.icon)) {
      return errorResponse(`Invalid icon. Must be one of: ${SUBJECT_ICONS.join(", ")}`, 400);
    }

    // Validate duration
    if (!body.duration_mins || body.duration_mins < 1 || body.duration_mins > 180) {
      return errorResponse("Duration must be between 1 and 180 minutes", 400);
    }

    // Validate total_questions
    if (!body.total_questions || body.total_questions < 1 || body.total_questions > 100) {
      return errorResponse("Total questions must be between 1 and 100", 400);
    }

    const supabase = await createClient();

    // Check for existing slug
    const { data: existingSlug } = await supabase
      .from("subjects")
      .select("id")
      .eq("slug", body.slug)
      .single();

    if (existingSlug) {
      return errorResponse(`Subject with slug "${body.slug}" already exists`, 409);
    }

    // Check for existing code_prefix
    const { data: existingPrefix } = await supabase
      .from("subjects")
      .select("id")
      .eq("code_prefix", body.code_prefix.toUpperCase())
      .single();

    if (existingPrefix) {
      return errorResponse(`Subject with code prefix "${body.code_prefix}" already exists`, 409);
    }

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from("subjects")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newDisplayOrder = (maxOrder?.display_order || 0) + 1;

    // Create subject
    const { data: newSubject, error: subjectError } = await supabase
      .from("subjects")
      .insert({
        name: body.name,
        slug: body.slug,
        code_prefix: body.code_prefix.toUpperCase(),
        description: body.description || null,
        icon: body.icon,
        duration_mins: body.duration_mins,
        total_questions: body.total_questions,
        instructions: body.instructions || null,
        is_active: true,
        display_order: newDisplayOrder,
      })
      .select()
      .single();

    if (subjectError) {
      console.error("Error creating subject:", subjectError);
      return errorResponse(`Failed to create subject: ${subjectError.message}`, 500);
    }

    // Create default template
    const template = body.template || {
      easy_count: 25,
      medium_count: 10,
      hard_count: 5,
    };

    const { error: templateError } = await supabase
      .from("subject_templates")
      .insert({
        subject_id: newSubject.id,
        name: "Initial Assessment",
        is_default: true,
        easy_count: template.easy_count,
        medium_count: template.medium_count,
        hard_count: template.hard_count,
      });

    if (templateError) {
      console.error("Error creating template:", templateError);
      // Subject was created, just log the template error
    }

    return successResponse({
      subject: newSubject,
      message: "Subject created successfully",
    });
  } catch (error) {
    console.error("Error in subjects POST:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
