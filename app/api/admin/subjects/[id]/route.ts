import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import type { TypeQuotas } from "@/types/test";

interface PatchSubjectBody {
  duration_mins?: number;
  template?: {
    easy_count?: number;
    medium_count?: number;
    hard_count?: number;
    type_quotas?: TypeQuotas | null;
  };
}

/**
 * GET /api/admin/subjects/[id]
 * Get a single subject with its default template (including type_quotas)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return errorResponse(auth.error, auth.status);

  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data: subject, error } = await supabase
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
        is_active,
        subject_templates (
          id,
          name,
          is_default,
          easy_count,
          medium_count,
          hard_count,
          type_quotas
        )
      `)
      .eq("id", id)
      .single();

    if (error || !subject) {
      return errorResponse("Subject not found", 404);
    }

    const defaultTemplate =
      (subject.subject_templates as Array<{
        id: string;
        name: string;
        is_default: boolean;
        easy_count: number;
        medium_count: number;
        hard_count: number;
        type_quotas: TypeQuotas | null;
      }>)?.find((t) => t.is_default) ?? null;

    return successResponse({ subject: { ...subject, default_template: defaultTemplate } });
  } catch (err) {
    console.error("Error fetching subject:", err);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/admin/subjects/[id]
 * Update subject duration and/or default template distribution + type_quotas
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return errorResponse(auth.error, auth.status);

  const { id } = await params;

  try {
    const body: PatchSubjectBody = await request.json();
    const supabase = await createClient();

    // Validate subject exists
    const { data: existingSubject, error: fetchError } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingSubject) {
      return errorResponse("Subject not found", 404);
    }

    // Update subject duration if provided
    if (body.duration_mins !== undefined) {
      if (body.duration_mins < 1 || body.duration_mins > 180) {
        return errorResponse("Duration must be between 1 and 180 minutes", 400);
      }

      const { error: subjectError } = await supabase
        .from("subjects")
        .update({ duration_mins: body.duration_mins, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (subjectError) {
        console.error("Error updating subject:", subjectError);
        return errorResponse("Failed to update subject duration", 500);
      }
    }

    // Update default template if provided
    if (body.template !== undefined) {
      // Find the default template
      const { data: templates, error: templateFetchError } = await supabase
        .from("subject_templates")
        .select("id")
        .eq("subject_id", id)
        .eq("is_default", true)
        .single();

      if (templateFetchError || !templates) {
        return errorResponse("Default template not found for this subject", 404);
      }

      const templateUpdate: Record<string, unknown> = {};
      if (body.template.easy_count !== undefined) templateUpdate.easy_count = body.template.easy_count;
      if (body.template.medium_count !== undefined) templateUpdate.medium_count = body.template.medium_count;
      if (body.template.hard_count !== undefined) templateUpdate.hard_count = body.template.hard_count;
      // Explicitly allow null to clear type_quotas
      if ("type_quotas" in body.template) templateUpdate.type_quotas = body.template.type_quotas;

      if (Object.keys(templateUpdate).length > 0) {
        const { error: templateError } = await supabase
          .from("subject_templates")
          .update(templateUpdate)
          .eq("id", templates.id);

        if (templateError) {
          console.error("Error updating template:", templateError);
          return errorResponse("Failed to update template", 500);
        }
      }
    }

    return successResponse({ message: "Subject updated successfully" });
  } catch (err) {
    console.error("Error in subjects PATCH:", err);
    return errorResponse("Internal server error", 500);
  }
}
