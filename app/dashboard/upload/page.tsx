"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "radix-ui";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Upload,
    Download,
    FileText,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Image as ImageIcon,
    ArrowLeft,
    ArrowRight,
    Eye,
} from "lucide-react";
import {
    parseCSV,
    hasImageRequirements,
    getTotalImageCount,
    type ParseResult,
    type ImageRequirement,
} from "@/lib/csv/parser";
import { MathText } from "@/components/ui/math-text";
import { ImageEnhancedText } from "@/components/ui/image-enhanced-text";

// Upload types with descriptions
const UPLOAD_TYPES = [
    {
        value: "mcq",
        label: "MCQ Questions",
        description: "Standard multiple choice (Math, Thinking Skills)",
        subjects: "Mathematical Reasoning, Thinking Skills",
    },
    {
        value: "passage_mcq",
        label: "Passage MCQ",
        description: "MCQ questions based on reading passages",
        subjects: "Reading",
    },
    {
        value: "poem_mcq",
        label: "Poem MCQ",
        description: "MCQ questions based on poems",
        subjects: "Reading",
    },
    {
        value: "fill_blank",
        label: "Fill in the Blank",
        description: "Fill blanks with dropdown options",
        subjects: "Reading",
    },
    {
        value: "fill_missing_sentence",
        label: "Fill Missing Sentence",
        description: "Select sentences to fill gaps in a passage",
        subjects: "Reading",
    },
    {
        value: "passage",
        label: "Passages",
        description: "Reading passages, poems, extracts",
        subjects: "Reading",
    },
    {
        value: "essay",
        label: "Essay Prompts",
        description: "Essay writing topics with rubrics",
        subjects: "Writing",
    },
];

interface UploadedImage {
    file: File;
    storagePath: string; // original path (key for matching requirements)
    uploadPath: string; // actual upload path (.webp)
    preview: string;
    sizeKB?: number; // compressed size in KB
}

interface FinalResult {
    success: boolean;
    inserted?: number;
    batchId?: string;
    errors?: Array<{ row: number; message: string }>;
}

type Step = "upload" | "preview" | "confirm";

export default function AdminUploadPage() {
    // Step state
    const [currentStep, setCurrentStep] = useState<Step>("upload");

    // Step 1: Upload state
    const [selectedType, setSelectedType] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [csvText, setCsvText] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);

    // Step 2: Preview state
    const [uploadedImages, setUploadedImages] = useState<
        Map<string, UploadedImage>
    >(new Map());

    // Step 3: Confirm state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalResult, setFinalResult] = useState<FinalResult | null>(null);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetMainFileInput = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback(async (selectedFile: File) => {
        try {
            const isCsv =
                selectedFile.type === "text/csv" ||
                selectedFile.name.endsWith(".csv");
            const isExcel =
                selectedFile.name.endsWith(".xlsx") ||
                selectedFile.name.endsWith(".xls") ||
                selectedFile.type ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                selectedFile.type === "application/vnd.ms-excel";

            if (!isCsv && !isExcel) {
                setParseResult({
                    success: false,
                    type: "",
                    questions: [],
                    passages: [],
                    errors: [
                        {
                            row: 0,
                            message:
                                "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
                        },
                    ],
                });
                return;
            }

            setFile(selectedFile);
            setParseResult(null);

            if (isExcel) {
                // Convert Excel to CSV using SheetJS
                const arrayBuffer = await selectedFile.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: "array" });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const csv = XLSX.utils.sheet_to_csv(firstSheet);
                setCsvText(csv);
            } else {
                // Read CSV with explicit UTF-8 decoding.
                // Fall back to Windows-1252 (common Excel CSV encoding on Windows)
                // to prevent mangled math symbols like θ, π, √, ÷
                const buffer = await selectedFile.arrayBuffer();
                let text: string;
                try {
                    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
                } catch {
                    text = new TextDecoder("windows-1252").decode(buffer);
                }
                // Strip BOM if present (Excel UTF-8 CSV includes BOM)
                if (text.charCodeAt(0) === 0xfeff) {
                    text = text.slice(1);
                }
                setCsvText(text);
            }
        } finally {
            resetMainFileInput();
        }
    }, [resetMainFileInput]);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) {
                handleFileSelect(droppedFile);
            }
        },
        [handleFileSelect],
    );

    // Download template
    const downloadTemplate = async (type: string) => {
        try {
            const response = await fetch(
                `/api/admin/questions/upload?template=${type}`,
            );
            if (!response.ok) throw new Error("Failed to download template");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `test_${type}_template.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download error:", error);
        }
    };

    // Validate CSV and move to preview
    const handleValidate = () => {
        if (!csvText || !selectedType) return;

        const result = parseCSV(csvText, selectedType);
        setParseResult(result);

        if (result.success) {
            // Clear previous images and move to preview
            setUploadedImages(new Map());
            setCurrentStep("preview");
        }
    };

    // Handle image upload for a specific field (compresses to WebP ≤50 KB)
    const handleImageUpload = useCallback(
        async (storagePath: string, imageFile: File): Promise<void> => {
            try {
                const { blob, sizeKB } = await compressToWebP(imageFile, 50);
                const baseName = imageFile.name.replace(/\.[^/.]+$/, "");
                const webpFile = new File([blob], `${baseName}.webp`, {
                    type: "image/webp",
                });
                // Replace extension in storage path with .webp
                const uploadPath = storagePath.replace(/\.[^/.]+$/, ".webp");
                const preview = URL.createObjectURL(webpFile);

                setUploadedImages((prev) => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(storagePath);
                    if (existing) URL.revokeObjectURL(existing.preview);
                    newMap.set(storagePath, {
                        file: webpFile,
                        storagePath,
                        uploadPath,
                        preview,
                        sizeKB,
                    });
                    return newMap;
                });
            } catch {
                // Fallback: use original file without compression
                const preview = URL.createObjectURL(imageFile);
                setUploadedImages((prev) => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(storagePath);
                    if (existing) URL.revokeObjectURL(existing.preview);
                    newMap.set(storagePath, {
                        file: imageFile,
                        storagePath,
                        uploadPath: storagePath,
                        preview,
                        sizeKB: Math.round(imageFile.size / 1024),
                    });
                    return newMap;
                });
            }
        },
        [],
    );

    // Remove uploaded image
    const handleRemoveImage = (storagePath: string) => {
        setUploadedImages((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(storagePath);
            if (existing) {
                URL.revokeObjectURL(existing.preview);
            }
            newMap.delete(storagePath);
            return newMap;
        });
    };

    // Check if all required images are uploaded
    const getAllImageRequirements = (): ImageRequirement[] => {
        if (!parseResult) return [];
        const requirements: ImageRequirement[] = [];
        parseResult.questions.forEach((q) =>
            requirements.push(...q.imageRequirements),
        );
        parseResult.passages.forEach((p) =>
            requirements.push(...p.imageRequirements),
        );
        return requirements;
    };

    const allImagesUploaded = (): boolean => {
        const requirements = getAllImageRequirements();
        return requirements.every((req) => uploadedImages.has(req.storagePath));
    };

    // Final submit
    const handleSubmit = async () => {
        if (!parseResult) return;

        setIsSubmitting(true);
        setFinalResult(null);

        try {
            const formData = new FormData();
            formData.append("type", parseResult.type);
            formData.append(
                "data",
                JSON.stringify({
                    questions: parseResult.questions,
                    passages: parseResult.passages,
                }),
            );

            // Add images (use uploadPath so API receives .webp paths)
            uploadedImages.forEach((img) => {
                formData.append("images", img.file);
                formData.append("imagePaths", img.uploadPath);
            });

            const response = await fetch("/api/admin/questions/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setFinalResult({
                    success: false,
                    errors: data.errors || [
                        { row: 0, message: data.error || "Upload failed" },
                    ],
                });
            } else {
                setFinalResult({
                    success: true,
                    inserted: data.inserted,
                    batchId: data.batchId,
                });
                // Reset state on success
                setCurrentStep("confirm");
            }
        } catch (error) {
            setFinalResult({
                success: false,
                errors: [
                    {
                        row: 0,
                        message:
                            error instanceof Error
                                ? error.message
                                : "Upload failed",
                    },
                ],
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset to start
    const handleReset = () => {
        setCurrentStep("upload");
        setSelectedType("");
        setFile(null);
        setCsvText("");
        setParseResult(null);
        setUploadedImages(new Map());
        setFinalResult(null);
        resetMainFileInput();
    };

    const selectedTypeInfo = UPLOAD_TYPES.find((t) => t.value === selectedType);

    // Render Step 1: Upload CSV
    const renderUploadStep = () => (
        <>
            {/* Select Type */}
            <Card className="mb-6 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">
                        Step 1: Select Question Type
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Choose the type of content you want to upload
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedType}
                        onValueChange={setSelectedType}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select question type..." />
                        </SelectTrigger>
                        <SelectContent>
                            {UPLOAD_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">
                                            {type.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {type.description}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedTypeInfo && (
                        <div className="mt-4 p-4 bg-muted rounded-lg border border-muted-foreground/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex-1">
                                    <p className="font-medium text-sm sm:text-base">
                                        {selectedTypeInfo.label}
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        Subjects: {selectedTypeInfo.subjects}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        downloadTemplate(selectedType)
                                    }
                                    className="w-full sm:w-auto"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Template
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upload File */}
            <Card className="mb-6 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">
                        Step 2: Upload CSV File
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Drag and drop your CSV or Excel file (.csv, .xlsx, .xls)
                        or click to browse
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(f);
                        }}
                    />
                    <div
                        className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all duration-200 ${isDragging
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : file
                                ? "border-green-500 bg-green-50/50"
                                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !file && fileInputRef.current?.click()}
                    >
                        {file ? (
                            <div className="relative py-2">
                                <div className="flex items-center justify-center gap-3 pr-20">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-medium text-sm sm:text-base truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-0 right-0 hover:bg-red-50 hover:text-red-600"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setCsvText("");
                                        setParseResult(null);
                                        resetMainFileInput();
                                    }}
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                                    <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                                </div>
                                <p className="text-base sm:text-lg font-medium mb-2">
                                    Drop your CSV or Excel file here
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                                    .csv, .xlsx, .xls &mdash; or click to browse
                                </p>
                                <Button
                                    variant="outline"
                                    className="font-medium pointer-events-none"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Browse Files
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Validation Errors */}
                    {parseResult && !parseResult.success && (
                        <div className="mt-4">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Validation Errors</AlertTitle>
                                <AlertDescription>
                                    Please fix the following errors in your CSV
                                    file.
                                </AlertDescription>
                            </Alert>
                            <Table className="mt-4">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-20">
                                            Row
                                        </TableHead>
                                        <TableHead className="w-32">
                                            Column
                                        </TableHead>
                                        <TableHead>Error</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parseResult.errors.map((error, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {error.row}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {error.column && (
                                                    <Badge variant="secondary">
                                                        {error.column}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {error.message}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Validate Button */}
                    <div className="mt-6 flex justify-end">
                        <Button
                            onClick={handleValidate}
                            disabled={!file || !selectedType}
                            size="lg"
                            className="w-full sm:w-auto"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Validate & Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </>
    );

    // Render Step 2: Preview with Image Upload
    const renderPreviewStep = () => {
        if (!parseResult) return null;

        const imageCount = getTotalImageCount(parseResult);
        const uploadedCount = uploadedImages.size;

        return (
            <>
                {/* Summary */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            CSV Validated Successfully
                        </CardTitle>
                        <CardDescription>
                            Review the data below and upload required images
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-6">
                            <div>
                                <p className="text-2xl font-bold">
                                    {parseResult.questions.length +
                                        parseResult.passages.length}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Items to upload
                                </p>
                            </div>
                            {imageCount > 0 && (
                                <div>
                                    <p className="text-2xl font-bold">
                                        {uploadedCount}/{imageCount}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Images uploaded
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Questions/Passages Preview with Image Upload */}
                {parseResult.questions.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Questions Preview
                            </CardTitle>
                            <CardDescription>
                                {hasImageRequirements(parseResult)
                                    ? "Upload images for items marked with the image icon"
                                    : "No images required for these questions"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full">
                                {parseResult.questions.map((question, idx) => (
                                    <AccordionItem
                                        key={question.code || `auto-${idx}`}
                                        value={question.code || `auto-${idx}`}
                                    >
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center gap-3 w-full">
                                                <Badge variant="outline">
                                                    Q. {idx + 1}
                                                </Badge>
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {question.data.subject && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Subject: {question.data.subject}
                                                            </Badge>
                                                        )}
                                                        {question.autoCode ? (
                                                            <Badge variant="secondary" className="font-mono text-xs">
                                                                Auto
                                                            </Badge>
                                                        ) : (
                                                            <span className="font-mono text-xs text-muted-foreground">
                                                                {question.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {(question.data.topic || question.data.subtopic) && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {question.data.topic && question.data.subtopic
                                                                ? `${question.data.topic} / ${question.data.subtopic}`
                                                                : question.data.topic || question.data.subtopic}
                                                        </div>
                                                    )}
                                                </div>
                                                {question.imageRequirements
                                                    .length > 0 && (
                                                        <Badge
                                                            variant={
                                                                question.imageRequirements.every(
                                                                    (r) =>
                                                                        uploadedImages.has(
                                                                            r.storagePath,
                                                                        ),
                                                                )
                                                                    ? "default"
                                                                    : "secondary"
                                                            }
                                                        >
                                                            <ImageIcon className="h-3 w-3 mr-1" />
                                                            {
                                                                question.imageRequirements.filter(
                                                                    (r) =>
                                                                        uploadedImages.has(
                                                                            r.storagePath,
                                                                        ),
                                                                ).length
                                                            }
                                                            /
                                                            {
                                                                question
                                                                    .imageRequirements
                                                                    .length
                                                            }
                                                        </Badge>
                                                    )}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 pt-2">
                                                {(() => {
                                                    const questionImagePreviews = question.imageRequirements
                                                        .filter(
                                                            (req) =>
                                                                req.field ===
                                                                "question" ||
                                                                /^question_\d+$/.test(
                                                                    req.field,
                                                                ),
                                                        )
                                                        .sort((a, b) => {
                                                            const getIndex = (
                                                                field: string,
                                                            ) => {
                                                                if (
                                                                    field ===
                                                                    "question"
                                                                )
                                                                    return 1;
                                                                const match =
                                                                    field.match(
                                                                        /^question_(\d+)$/,
                                                                    );
                                                                return match
                                                                    ? parseInt(
                                                                        match[1],
                                                                        10,
                                                                    )
                                                                    : 999;
                                                            };
                                                            return (
                                                                getIndex(
                                                                    a.field,
                                                                ) -
                                                                getIndex(
                                                                    b.field,
                                                                )
                                                            );
                                                        })
                                                        .map(
                                                            (req) =>
                                                                uploadedImages.get(
                                                                    req.storagePath,
                                                                )?.preview ||
                                                                "",
                                                        )
                                                        .filter(Boolean);

                                                    const mainContent =
                                                        question.data
                                                            .question ||
                                                        question.data
                                                            .passage_text ||
                                                        question.data
                                                            .passage_with_gaps ||
                                                        question.data
                                                            .prompt ||
                                                        "";

                                                    return (
                                                        <>
                                                            {/* Question text */}
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">
                                                                    {question.data.question
                                                                        ? "Question"
                                                                        : question.data.prompt
                                                                            ? "Prompt"
                                                                            : question.data
                                                                                .passage_text
                                                                                ? "Passage Text"
                                                                                : question.data
                                                                                    .passage_with_gaps
                                                                                    ? "Passage With Gaps"
                                                                                    : "Question"}
                                                                </Label>
                                                                <div className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">
                                                                    <ImageEnhancedText
                                                                        content={
                                                                            mainContent
                                                                        }
                                                                        images={
                                                                            questionImagePreviews
                                                                        }
                                                                        block
                                                                    />
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}

                                                {/* Fill blank options preview */}
                                                {question.data.passage_text && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs text-muted-foreground">
                                                            Blank Options
                                                        </Label>
                                                        <div className="grid gap-2">
                                                            {Array.from({ length: 5 }).map(
                                                                (_, blankIndex) => {
                                                                    const position =
                                                                        blankIndex +
                                                                        1;
                                                                    const options =
                                                                        question.data[
                                                                        `blank_${position}_options`
                                                                        ];
                                                                    if (
                                                                        !options
                                                                    )
                                                                        return null;

                                                                    return (
                                                                        <div
                                                                            key={`blank-${position}`}
                                                                            className="p-2 rounded border text-sm"
                                                                        >
                                                                            <span className="font-medium mr-2">
                                                                                [{position}]
                                                                            </span>
                                                                            <span>
                                                                                {options}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Fill missing sentence options preview */}
                                                {question.data.passage_with_gaps &&
                                                    question.data.sentences && (
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground">
                                                                Sentence Bank
                                                            </Label>
                                                            <MathText
                                                                block
                                                                className="text-sm mt-1 whitespace-pre-wrap leading-relaxed"
                                                                content={
                                                                    question.data
                                                                        .sentences
                                                                }
                                                            />
                                                        </div>
                                                    )}

                                                {/* Options for MCQ */}
                                                {question.data.option_a && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div
                                                            className={
                                                                question.data.answer?.toUpperCase() ===
                                                                    "A"
                                                                    ? "bg-green-50 p-2 rounded"
                                                                    : "p-2"
                                                            }
                                                        >
                                                            <Label className="text-xs text-muted-foreground">
                                                                A
                                                            </Label>
                                                            <MathText
                                                                block
                                                                className="text-sm leading-relaxed"
                                                                content={
                                                                    question
                                                                        .data
                                                                        .option_a ||
                                                                    ""
                                                                }
                                                            />
                                                        </div>
                                                        <div
                                                            className={
                                                                question.data.answer?.toUpperCase() ===
                                                                    "B"
                                                                    ? "bg-green-50 p-2 rounded"
                                                                    : "p-2"
                                                            }
                                                        >
                                                            <Label className="text-xs text-muted-foreground">
                                                                B
                                                            </Label>
                                                            <MathText
                                                                block
                                                                className="text-sm leading-relaxed"
                                                                content={
                                                                    question
                                                                        .data
                                                                        .option_b ||
                                                                    ""
                                                                }
                                                            />
                                                        </div>
                                                        <div
                                                            className={
                                                                question.data.answer?.toUpperCase() ===
                                                                    "C"
                                                                    ? "bg-green-50 p-2 rounded"
                                                                    : "p-2"
                                                            }
                                                        >
                                                            <Label className="text-xs text-muted-foreground">
                                                                C
                                                            </Label>
                                                            <MathText
                                                                block
                                                                className="text-sm leading-relaxed"
                                                                content={
                                                                    question
                                                                        .data
                                                                        .option_c ||
                                                                    ""
                                                                }
                                                            />
                                                        </div>
                                                        <div
                                                            className={
                                                                question.data.answer?.toUpperCase() ===
                                                                    "D"
                                                                    ? "bg-green-50 p-2 rounded"
                                                                    : "p-2"
                                                            }
                                                        >
                                                            <Label className="text-xs text-muted-foreground">
                                                                D
                                                            </Label>
                                                            <MathText
                                                                block
                                                                className="text-sm leading-relaxed"
                                                                content={
                                                                    question
                                                                        .data
                                                                        .option_d ||
                                                                    ""
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Image Upload Fields */}
                                                {question.imageRequirements
                                                    .length > 0 && (
                                                        <div className="border-t pt-4 mt-4">
                                                            <Label className="text-sm font-medium mb-2 block">
                                                                Required Images
                                                            </Label>
                                                            <div className="grid gap-3">
                                                                {question.imageRequirements.map(
                                                                    (req) => (
                                                                        <ImageUploadField
                                                                            key={
                                                                                req.storagePath
                                                                            }
                                                                            requirement={
                                                                                req
                                                                            }
                                                                            uploadedImage={uploadedImages.get(
                                                                                req.storagePath,
                                                                            )}
                                                                            onUpload={(
                                                                                file,
                                                                            ) =>
                                                                                handleImageUpload(
                                                                                    req.storagePath,
                                                                                    file,
                                                                                )
                                                                            }
                                                                            onRemove={() =>
                                                                                handleRemoveImage(
                                                                                    req.storagePath,
                                                                                )
                                                                            }
                                                                        />
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                )}

                {/* Passages Preview */}
                {parseResult.passages.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Passages Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full">
                                {parseResult.passages.map((passage, idx) => (
                                    <AccordionItem
                                        key={passage.code}
                                        value={passage.code}
                                    >
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline">
                                                    {idx + 1}
                                                </Badge>
                                                <span className="font-mono text-sm">
                                                    {passage.code}
                                                </span>
                                                <Badge variant="secondary">
                                                    {passage.data.type}
                                                </Badge>
                                                {passage.imageRequirements
                                                    .length > 0 && (
                                                        <Badge
                                                            variant={
                                                                passage.imageRequirements.every(
                                                                    (r) =>
                                                                        uploadedImages.has(
                                                                            r.storagePath,
                                                                        ),
                                                                )
                                                                    ? "default"
                                                                    : "secondary"
                                                            }
                                                        >
                                                            <ImageIcon className="h-3 w-3 mr-1" />
                                                            {
                                                                passage.imageRequirements.filter(
                                                                    (r) =>
                                                                        uploadedImages.has(
                                                                            r.storagePath,
                                                                        ),
                                                                ).length
                                                            }
                                                            /
                                                            {
                                                                passage
                                                                    .imageRequirements
                                                                    .length
                                                            }
                                                        </Badge>
                                                    )}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 pt-2">
                                                {passage.data.title && (
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">
                                                            Title
                                                        </Label>
                                                        <p className="text-sm font-medium mt-1">
                                                            {passage.data.title}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">
                                                        Content
                                                    </Label>
                                                    <MathText
                                                        block
                                                        className="text-sm mt-1 whitespace-pre-wrap leading-relaxed"
                                                        content={
                                                            passage.data
                                                                .content || ""
                                                        }
                                                    />
                                                </div>

                                                {/* Image Upload Fields */}
                                                {passage.imageRequirements
                                                    .length > 0 && (
                                                        <div className="border-t pt-4 mt-4">
                                                            <Label className="text-sm font-medium mb-2 block">
                                                                Required Images
                                                            </Label>
                                                            <div className="grid gap-3">
                                                                {passage.imageRequirements.map(
                                                                    (req) => (
                                                                        <ImageUploadField
                                                                            key={
                                                                                req.storagePath
                                                                            }
                                                                            requirement={
                                                                                req
                                                                            }
                                                                            uploadedImage={uploadedImages.get(
                                                                                req.storagePath,
                                                                            )}
                                                                            onUpload={(
                                                                                file,
                                                                            ) =>
                                                                                handleImageUpload(
                                                                                    req.storagePath,
                                                                                    file,
                                                                                )
                                                                            }
                                                                            onRemove={() =>
                                                                                handleRemoveImage(
                                                                                    req.storagePath,
                                                                                )
                                                                            }
                                                                        />
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                )}

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep("upload")}
                        className="w-full sm:w-auto"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Upload
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            isSubmitting ||
                            (imageCount > 0 && !allImagesUploaded())
                        }
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                Confirm & Upload
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Upload error */}
                {finalResult && !finalResult.success && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Upload Failed</AlertTitle>
                        <AlertDescription>
                            {finalResult.errors?.map((e, i) => (
                                <span key={i} className="block">
                                    {e.message}
                                </span>
                            ))}
                        </AlertDescription>
                    </Alert>
                )}
            </>
        );
    };

    // Render Step 3: Success
    const renderConfirmStep = () => (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    Upload Complete!
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert className="border-green-500 bg-green-50 mb-6">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Success!</AlertTitle>
                    <AlertDescription>
                        Successfully uploaded {finalResult?.inserted} items.
                        {finalResult?.batchId && (
                            <span className="block mt-1 text-xs font-mono">
                                Batch ID: {finalResult.batchId}
                            </span>
                        )}
                    </AlertDescription>
                </Alert>

                <Button onClick={handleReset} size="lg">
                    Upload More Questions
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="mb-6 lg:mb-8 mt-12 lg:mt-0">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    Upload Questions
                </h1>
                <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                    Upload questions in bulk using CSV files. Download a
                    template first to see the required format.
                </p>

                {/* Step indicator */}
                <div className="flex items-center gap-1 sm:gap-2 mt-4">
                    <StepIndicator
                        step={1}
                        label="Upload CSV"
                        active={currentStep === "upload"}
                        completed={currentStep !== "upload"}
                    />
                    <div className="h-px bg-muted-foreground/25 flex-1" />
                    <StepIndicator
                        step={2}
                        label="Preview & Images"
                        active={currentStep === "preview"}
                        completed={currentStep === "confirm"}
                    />
                    <div className="h-px bg-muted-foreground/25 flex-1" />
                    <StepIndicator
                        step={3}
                        label="Complete"
                        active={currentStep === "confirm"}
                        completed={false}
                    />
                </div>
            </div>

            {currentStep === "upload" && renderUploadStep()}
            {currentStep === "preview" && renderPreviewStep()}
            {currentStep === "confirm" && renderConfirmStep()}
        </div>
    );
}

// Step indicator component
function StepIndicator({
    step,
    label,
    active,
    completed,
}: {
    step: number;
    label: string;
    active: boolean;
    completed: boolean;
}) {
    return (
        <div className="flex items-center gap-1 sm:gap-2">
            <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${active
                    ? "bg-primary text-primary-foreground"
                    : completed
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
            >
                {completed ? (
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                    step
                )}
            </div>
            <span
                className={`text-xs sm:text-sm hidden sm:inline ${active ? "font-medium" : "text-muted-foreground"}`}
            >
                {label}
            </span>
        </div>
    );
}

// Image upload field component
function ImageUploadField({
    requirement,
    uploadedImage,
    onUpload,
    onRemove,
}: {
    requirement: ImageRequirement;
    uploadedImage?: UploadedImage;
    onUpload: (file: File) => Promise<void>;
    onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleFileChange = async (file: File) => {
        setIsCompressing(true);
        try {
            await onUpload(file);
        } finally {
            setIsCompressing(false);
            // Reset input so the same file can be re-selected
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <>
            <div
                className={`flex items-center gap-4 p-3 border rounded-lg transition-colors ${isDragOver ? "border-primary bg-primary/5" : ""
                    }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) handleFileChange(dropped);
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(file);
                    }}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm">{requirement.label}</Label>
                        {requirement.number !== undefined && (
                            <Badge
                                variant="secondary"
                                className="text-xs font-mono"
                            >
                                [img:{requirement.number}]
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                        {uploadedImage
                            ? uploadedImage.uploadPath
                            : requirement.storagePath}
                    </p>
                </div>

                {isCompressing ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Compressing&hellip;
                    </div>
                ) : uploadedImage ? (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="relative group cursor-zoom-in focus:outline-none"
                            onClick={() => setLightboxOpen(true)}
                            title="Click to enlarge"
                        >
                            <img
                                src={uploadedImage.preview}
                                alt={requirement.label}
                                className="w-12 h-12 object-cover rounded border transition-opacity group-hover:opacity-80"
                            />
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="h-4 w-4 text-white drop-shadow" />
                            </span>
                            {uploadedImage.sizeKB !== undefined && (
                                <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[9px] px-1 rounded leading-tight">
                                    {uploadedImage.sizeKB}KB
                                </span>
                            )}
                        </button>
                        <Button variant="ghost" size="sm" onClick={onRemove}>
                            Remove
                        </Button>
                    </div>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => inputRef.current?.click()}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                        </Button>
                    </>
                )}
            </div>

            {/* Lightbox */}
            {uploadedImage && (
                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                    <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex flex-col items-center gap-2 bg-black/90 border-0">
                        <VisuallyHidden.Root>
                            <DialogTitle>{requirement.label}</DialogTitle>
                        </VisuallyHidden.Root>
                        <img
                            src={uploadedImage.preview}
                            alt={requirement.label}
                            className="max-w-full max-h-[80vh] object-contain rounded"
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

/**
 * Compress an image File to WebP with a target max size.
 * First fits the image into a 16:9 container (object-fit: contain) with white
 * background so every uploaded image has a consistent aspect ratio.
 * Then uses a quality sweep; if that's not enough, scales the canvas down.
 */
async function compressToWebP(
    file: File,
    maxSizeKB = 50,
): Promise<{ blob: Blob; sizeKB: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const maxBytes = maxSizeKB * 1024;

            // --- Step 0: Fit image into a 16:9 container ---
            const ASPECT = 16 / 9;
            // Use at least 960px wide, or the image's own width if larger
            const baseW = Math.max(240, img.naturalWidth);
            const baseH = Math.round(baseW / ASPECT);

            // Calculate centered "object-fit: contain" placement
            const fitScale = Math.min(
                baseW / img.naturalWidth,
                baseH / img.naturalHeight,
            );
            const drawW = Math.round(img.naturalWidth * fitScale);
            const drawH = Math.round(img.naturalHeight * fitScale);
            const offsetX = Math.round((baseW - drawW) / 2);
            const offsetY = Math.round((baseH - drawH) / 2);

            // Pre-render the 16:9 standardised canvas once
            const srcCanvas = document.createElement("canvas");
            srcCanvas.width = baseW;
            srcCanvas.height = baseH;
            const srcCtx = srcCanvas.getContext("2d")!;
            srcCtx.fillStyle = "#FFFFFF";
            srcCtx.fillRect(0, 0, baseW, baseH);
            srcCtx.drawImage(img, offsetX, offsetY, drawW, drawH);

            // --- Compression pass (operates on the 16:9 canvas) ---
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;

            const encode = (quality: number, scale: number): Promise<Blob> =>
                new Promise((res) => {
                    canvas.width = Math.round(baseW * scale);
                    canvas.height = Math.round(baseH * scale);
                    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(
                        (b) => res(b ?? new Blob()),
                        "image/webp",
                        quality,
                    );
                });

            const find = async () => {
                // Step 1: sweep quality at full resolution
                for (const q of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]) {
                    const blob = await encode(q, 1.0);
                    if (blob.size <= maxBytes) {
                        resolve({
                            blob,
                            sizeKB: Math.round(blob.size / 1024),
                        });
                        return;
                    }
                }
                // Step 2: quality alone wasn't enough — scale down too
                for (const scale of [0.8, 0.6, 0.5, 0.4, 0.3]) {
                    const blob = await encode(0.7, scale);
                    if (blob.size <= maxBytes) {
                        resolve({
                            blob,
                            sizeKB: Math.round(blob.size / 1024),
                        });
                        return;
                    }
                }
                // Last resort: return whatever we get at minimum settings
                const blob = await encode(0.2, 0.3);
                resolve({ blob, sizeKB: Math.round(blob.size / 1024) });
            };

            find();
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image for compression"));
        };

        img.src = objectUrl;
    });
}
