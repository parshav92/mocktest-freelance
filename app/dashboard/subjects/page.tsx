"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
    ArrowLeft,
    Plus,
    Loader2,
    CheckCircle2,
    AlertCircle,
    BookOpen,
    Pencil,
    Calculator,
    Brain,
    TestTube,
    Globe,
    Music,
    Palette,
    Code,
    Microscope,
    Atom,
    Lightbulb,
    Compass,
    Ruler,
    Library,
    GraduationCap,
    Languages,
    History,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icon mapping
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
    "book-open": BookOpen,
    "pencil": Pencil,
    "calculator": Calculator,
    "brain": Brain,
    "flask": TestTube,
    "globe": Globe,
    "music": Music,
    "palette": Palette,
    "code": Code,
    "microscope": Microscope,
    "atom": Atom,
    "lightbulb": Lightbulb,
    "compass": Compass,
    "ruler": Ruler,
    "library": Library,
    "graduation-cap": GraduationCap,
    "languages": Languages,
    "history": History,
};

interface Subject {
    id: string;
    name: string;
    slug: string;
    code_prefix: string | null;
    description: string | null;
    icon: string;
    duration_mins: number;
    total_questions: number;
    is_active: boolean;
    display_order: number;
    question_count: number;
    default_template: {
        easy_count: number;
        medium_count: number;
        hard_count: number;
    } | null;
    instructions: {
        pages: Array<{
            title: string;
            content: string;
        }>;
    } | null;
}

interface FormState {
    name: string;
    slug: string;
    code_prefix: string;
    description: string;
    icon: string;
    duration_mins: number;
    total_questions: number;
    easy_count: number;
    medium_count: number;
    hard_count: number;
    instruction_title: string;
    instruction_content: string;
}

const initialFormState: FormState = {
    name: "",
    slug: "",
    code_prefix: "",
    description: "",
    icon: "book-open",
    duration_mins: 45,
    total_questions: 40,
    easy_count: 25,
    medium_count: 10,
    hard_count: 5,
    instruction_title: "Selective High School Placement Practice Test",
    instruction_content: "",
};

export default function AdminSubjectsPage() {
    // State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [availableIcons, setAvailableIcons] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);
    const [form, setForm] = useState<FormState>(initialFormState);

    // Fetch subjects
    const fetchSubjects = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/admin/subjects");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch subjects");
            }

            setSubjects(data.subjects || []);
            setAvailableIcons(data.available_icons || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load subjects");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        setForm((prev) => ({
            ...prev,
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        }));
    };

    // Auto-generate code prefix from name
    const generateCodePrefix = (name: string): string => {
        // Take first letters of each word, max 3 chars
        const words = name.split(/\s+/).filter(Boolean);
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return words
            .map((w) => w[0])
            .join("")
            .substring(0, 3)
            .toUpperCase();
    };

    // Check if code prefix is unique
    const isCodePrefixUnique = (prefix: string): boolean => {
        return !subjects.some(
            (s) => s.code_prefix?.toUpperCase() === prefix.toUpperCase()
        );
    };

    // Submit form
    const handleSubmit = async () => {
        setSubmitResult(null);
        setIsSubmitting(true);

        try {
            // Validate
            if (!form.name.trim()) {
                throw new Error("Subject name is required");
            }
            if (!form.code_prefix.trim()) {
                throw new Error("Code prefix is required");
            }
            if (!isCodePrefixUnique(form.code_prefix)) {
                throw new Error(`Code prefix "${form.code_prefix}" is already in use`);
            }

            // Build instructions JSONB
            const instructions = form.instruction_content.trim()
                ? {
                      pages: [
                          {
                              title: form.instruction_title,
                              content: form.instruction_content,
                          },
                      ],
                  }
                : null;

            const response = await fetch("/api/admin/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    slug: form.slug,
                    code_prefix: form.code_prefix.toUpperCase(),
                    description: form.description.trim() || undefined,
                    icon: form.icon,
                    duration_mins: form.duration_mins,
                    total_questions: form.total_questions,
                    instructions,
                    template: {
                        easy_count: form.easy_count,
                        medium_count: form.medium_count,
                        hard_count: form.hard_count,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create subject");
            }

            setSubmitResult({
                success: true,
                message: `Subject "${form.name}" created successfully!`,
            });

            // Reset form and refresh list
            setForm(initialFormState);
            fetchSubjects();

            // Close dialog after delay
            setTimeout(() => {
                setIsDialogOpen(false);
                setSubmitResult(null);
            }, 2000);
        } catch (err) {
            setSubmitResult({
                success: false,
                message: err instanceof Error ? err.message : "Failed to create subject",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render icon
    const renderIcon = (iconName: string, className?: string) => {
        const IconComponent = ICON_COMPONENTS[iconName];
        if (!IconComponent) return null;
        return <IconComponent className={className} />;
    };

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-zinc-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold text-zinc-900">
                                Manage Subjects
                            </h1>
                            <p className="text-sm text-zinc-500">
                                Add and configure test subjects
                            </p>
                        </div>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Subject
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Subject</DialogTitle>
                                <DialogDescription>
                                    Create a new test subject. Students will be able to take
                                    practice tests for this subject.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Subject Name *</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g., Science"
                                            value={form.name}
                                            onChange={(e) => handleNameChange(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="slug">URL Slug</Label>
                                        <Input
                                            id="slug"
                                            value={form.slug}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    slug: e.target.value,
                                                }))
                                            }
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-zinc-500">
                                            Auto-generated from name
                                        </p>
                                    </div>
                                </div>

                                {/* Code Prefix */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="code_prefix">
                                            Code Prefix *
                                            <span className="text-xs text-zinc-500 ml-2">
                                                (2-5 letters)
                                            </span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="code_prefix"
                                                placeholder="e.g., SC"
                                                value={form.code_prefix}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        code_prefix: e.target.value
                                                            .toUpperCase()
                                                            .replace(/[^A-Z]/g, "")
                                                            .substring(0, 5),
                                                    }))
                                                }
                                                className="font-mono uppercase w-24"
                                                maxLength={5}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        code_prefix: generateCodePrefix(prev.name),
                                                    }))
                                                }
                                            >
                                                Auto
                                            </Button>
                                        </div>
                                        <p className="text-xs text-zinc-500">
                                            Used in question codes: {form.code_prefix || "XX"}_001,{" "}
                                            {form.code_prefix || "XX"}_002, etc.
                                        </p>
                                        {form.code_prefix &&
                                            !isCodePrefixUnique(form.code_prefix) && (
                                                <p className="text-xs text-red-500">
                                                    This prefix is already in use
                                                </p>
                                            )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <textarea
                                            id="description"
                                            placeholder="Brief description of the subject..."
                                            value={form.description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                            rows={3}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Icon Picker */}
                                <div className="space-y-3">
                                    <Label>Subject Icon *</Label>
                                    <div className="grid grid-cols-9 gap-2">
                                        {availableIcons.map((iconName) => (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        icon: iconName,
                                                    }))
                                                }
                                                className={cn(
                                                    "p-3 rounded-lg border-2 transition-all hover:bg-zinc-50",
                                                    form.icon === iconName
                                                        ? "border-emerald-500 bg-emerald-50"
                                                        : "border-zinc-200"
                                                )}
                                                title={iconName}
                                            >
                                                {renderIcon(iconName, "h-5 w-5 mx-auto")}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Test Configuration */}
                                <div className="space-y-4">
                                    <Label className="text-base font-semibold">
                                        Test Configuration
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="duration">Duration (minutes)</Label>
                                            <Input
                                                id="duration"
                                                type="number"
                                                min={1}
                                                max={180}
                                                value={form.duration_mins}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        duration_mins: parseInt(e.target.value) || 45,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="total_questions">
                                                Total Questions
                                            </Label>
                                            <Input
                                                id="total_questions"
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={form.total_questions}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        total_questions:
                                                            parseInt(e.target.value) || 40,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Question Distribution */}
                                <div className="space-y-4">
                                    <Label className="text-base font-semibold">
                                        Question Distribution (Default Template)
                                    </Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="easy" className="text-green-600">
                                                Easy
                                            </Label>
                                            <Input
                                                id="easy"
                                                type="number"
                                                min={0}
                                                value={form.easy_count}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        easy_count: parseInt(e.target.value) || 0,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="medium" className="text-amber-600">
                                                Medium
                                            </Label>
                                            <Input
                                                id="medium"
                                                type="number"
                                                min={0}
                                                value={form.medium_count}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        medium_count: parseInt(e.target.value) || 0,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="hard" className="text-red-600">
                                                Hard
                                            </Label>
                                            <Input
                                                id="hard"
                                                type="number"
                                                min={0}
                                                value={form.hard_count}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        hard_count: parseInt(e.target.value) || 0,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Total:{" "}
                                        {form.easy_count + form.medium_count + form.hard_count}{" "}
                                        questions (should match Total Questions above)
                                    </p>
                                </div>

                                <Separator />

                                {/* Instructions Editor */}
                                <div className="space-y-4">
                                    <Label className="text-base font-semibold">
                                        Test Instructions
                                    </Label>
                                    <p className="text-sm text-zinc-500">
                                        These instructions will be shown to students before they
                                        start the test. Use the editor to format text.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="instruction_title">Page Title</Label>
                                        <Input
                                            id="instruction_title"
                                            value={form.instruction_title}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    instruction_title: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Instructions Content</Label>
                                        <RichTextEditor
                                            value={form.instruction_content}
                                            onChange={(html) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    instruction_content: html,
                                                }))
                                            }
                                            placeholder="Enter test instructions here..."
                                            height={250}
                                        />
                                    </div>
                                </div>

                                {/* Submit Result */}
                                {submitResult && (
                                    <Alert
                                        variant={
                                            submitResult.success ? "default" : "destructive"
                                        }
                                    >
                                        {submitResult.success ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" />
                                        )}
                                        <AlertDescription>
                                            {submitResult.message}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Submit Button */}
                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={
                                            isSubmitting ||
                                            !form.name.trim() ||
                                            !form.code_prefix ||
                                            !isCodePrefixUnique(form.code_prefix)
                                        }
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Subject
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Error state */}
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Loading state */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Total Subjects</CardDescription>
                                    <CardTitle className="text-2xl">
                                        {subjects.length}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Active Subjects</CardDescription>
                                    <CardTitle className="text-2xl">
                                        {subjects.filter((s) => s.is_active).length}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Total Questions</CardDescription>
                                    <CardTitle className="text-2xl">
                                        {subjects.reduce(
                                            (sum, s) => sum + s.question_count,
                                            0
                                        )}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Subjects List */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-zinc-900">
                                All Subjects
                            </h2>
                            <div className="grid gap-4">
                                {subjects.map((subject) => (
                                    <Card key={subject.id}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className="p-3 rounded-lg bg-zinc-100">
                                                    {renderIcon(
                                                        subject.icon,
                                                        "h-6 w-6 text-zinc-700"
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-zinc-900">
                                                            {subject.name}
                                                        </h3>
                                                        {subject.is_active ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-emerald-600 border-emerald-200"
                                                            >
                                                                Active
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-zinc-500 mb-3">
                                                        {subject.description ||
                                                            "No description"}
                                                    </p>
                                                    <div className="flex flex-wrap gap-4 text-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-zinc-400">
                                                                Prefix:
                                                            </span>
                                                            <code className="px-1.5 py-0.5 bg-zinc-100 rounded font-mono text-xs">
                                                                {subject.code_prefix || "—"}
                                                            </code>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-zinc-400">
                                                                Slug:
                                                            </span>
                                                            <code className="px-1.5 py-0.5 bg-zinc-100 rounded font-mono text-xs">
                                                                {subject.slug}
                                                            </code>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-zinc-400">
                                                                Duration:
                                                            </span>
                                                            <span className="text-zinc-700">
                                                                {subject.duration_mins} min
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-zinc-400">
                                                                Questions:
                                                            </span>
                                                            <span className="text-zinc-700">
                                                                {subject.question_count} /{" "}
                                                                {subject.total_questions}
                                                            </span>
                                                        </div>
                                                        {subject.default_template && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-zinc-400">
                                                                    Distribution:
                                                                </span>
                                                                <span className="text-green-600">
                                                                    {
                                                                        subject.default_template
                                                                            .easy_count
                                                                    }
                                                                    E
                                                                </span>
                                                                <span className="text-amber-600">
                                                                    {
                                                                        subject.default_template
                                                                            .medium_count
                                                                    }
                                                                    M
                                                                </span>
                                                                <span className="text-red-600">
                                                                    {
                                                                        subject.default_template
                                                                            .hard_count
                                                                    }
                                                                    H
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {subjects.length === 0 && (
                                    <Card>
                                        <CardContent className="py-12 text-center text-zinc-500">
                                            No subjects found. Click &quot;Add Subject&quot; to
                                            create one.
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
