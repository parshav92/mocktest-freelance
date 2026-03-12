import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TrialTestItem {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    duration_mins: number;
    question_count: number;
}

export default async function FreeTrialPage() {
    // ── Auth gate: only logged-in parents ──────────────
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "parent") redirect("/auth");

    // ── Fetch free trial tests from DB ─────────────────
    const { data: rawTests } = await supabase
        .from("custom_tests")
        .select(
            `
            id,
            name,
            slug,
            description,
            duration_mins,
            custom_test_questions(count)
            `,
        )
        .eq("is_active", true)
        .eq("visibility", "free_trial")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

    const tests: TrialTestItem[] = (rawTests || []).map((t) => ({
        id: t.id as string,
        name: t.name as string,
        slug: t.slug as string,
        description: t.description as string | null,
        duration_mins: t.duration_mins as number,
        question_count:
            (t.custom_test_questions as unknown as { count: number }[])?.[0]
                ?.count ?? 0,
    }));

    return (
        <div className="min-h-screen bg-[#e8eef3]">
            {/* Header */}
            <header className="bg-[#1a2744] text-white">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white/10">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold">Free Trial</p>
                            <p className="text-sm text-white/70">
                                {profile.full_name}
                            </p>
                        </div>
                    </div>
                    <Link href="/dashboard">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Dashboard
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-lg mx-auto">
                    <Card className="bg-white w-full">
                        <CardContent className="p-8">
                            {/* Title */}
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-[#1a2744] leading-tight">
                                    Selective High School Placement
                                </h2>
                                <h3 className="text-2xl font-bold text-[#1a2744]">
                                    Free Trial Test
                                </h3>
                                <div className="w-full h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-500 mt-4" />
                            </div>

                            {tests.length === 0 ? (
                                <p className="text-center text-sm text-slate-500 py-8">
                                    No trial tests available at the moment.
                                </p>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {tests.map((test) => (
                                            <Link
                                                key={test.slug}
                                                href={`/free-trial/${test.slug}`}
                                                className="w-full py-4 px-6 bg-[#1a2744] text-white font-medium rounded-md
                                                    hover:bg-[#1a2744]/90 transition-colors text-center
                                                    flex items-center justify-center gap-2"
                                            >
                                                {test.name}
                                            </Link>
                                        ))}
                                    </div>

                                    <p className="text-center text-xs text-slate-400 mt-6">
                                        {tests.length} sample test{tests.length !== 1 ? "s" : ""} available
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
