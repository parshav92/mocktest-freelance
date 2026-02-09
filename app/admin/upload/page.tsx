"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  storagePath: string;
  preview: string;
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
  const [uploadedImages, setUploadedImages] = useState<Map<string, UploadedImage>>(new Map());

  // Step 3: Confirm state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      setParseResult({
        success: false,
        type: "",
        questions: [],
        passages: [],
        errors: [{ row: 0, message: "Please upload a CSV file" }],
      });
      return;
    }
    setFile(selectedFile);
    setParseResult(null);

    // Read file content
    const text = await selectedFile.text();
    setCsvText(text);
  }, []);

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
    [handleFileSelect]
  );

  // Download template
  const downloadTemplate = async (type: string) => {
    try {
      const response = await fetch(`/api/admin/questions/upload?template=${type}`);
      if (!response.ok) throw new Error("Failed to download template");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_template.csv`;
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

  // Handle image upload for a specific field
  const handleImageUpload = (storagePath: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setUploadedImages((prev) => {
      const newMap = new Map(prev);
      // Revoke old preview URL if exists
      const existing = newMap.get(storagePath);
      if (existing) {
        URL.revokeObjectURL(existing.preview);
      }
      newMap.set(storagePath, { file, storagePath, preview });
      return newMap;
    });
  };

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
    parseResult.questions.forEach((q) => requirements.push(...q.imageRequirements));
    parseResult.passages.forEach((p) => requirements.push(...p.imageRequirements));
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
      formData.append("data", JSON.stringify({
        questions: parseResult.questions,
        passages: parseResult.passages,
      }));

      // Add images
      uploadedImages.forEach((img) => {
        formData.append("images", img.file);
        formData.append("imagePaths", img.storagePath);
      });

      const response = await fetch("/api/admin/questions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setFinalResult({
          success: false,
          errors: data.errors || [{ row: 0, message: data.error || "Upload failed" }],
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
            message: error instanceof Error ? error.message : "Upload failed",
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
  };

  const selectedTypeInfo = UPLOAD_TYPES.find((t) => t.value === selectedType);

  // Render Step 1: Upload CSV
  const renderUploadStep = () => (
    <>
      {/* Select Type */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Select Question Type</CardTitle>
          <CardDescription>Choose the type of content you want to upload</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select question type..." />
            </SelectTrigger>
            <SelectContent>
              {UPLOAD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTypeInfo && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedTypeInfo.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Subjects: {selectedTypeInfo.subjects}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTemplate(selectedType)}
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Step 2: Upload CSV File</CardTitle>
          <CardDescription>
            Drag and drop your CSV file or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : file
                ? "border-green-500 bg-green-50"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setCsvText("");
                    setParseResult(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg mb-2">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">Browse Files</span>
                  </Button>
                </label>
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
                  Please fix the following errors in your CSV file.
                </AlertDescription>
              </Alert>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead className="w-32">Column</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{error.row}</Badge>
                      </TableCell>
                      <TableCell>
                        {error.column && <Badge variant="secondary">{error.column}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{error.message}</TableCell>
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
                  {parseResult.questions.length + parseResult.passages.length}
                </p>
                <p className="text-sm text-muted-foreground">Items to upload</p>
              </div>
              {imageCount > 0 && (
                <div>
                  <p className="text-2xl font-bold">
                    {uploadedCount}/{imageCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Images uploaded</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions/Passages Preview with Image Upload */}
        {parseResult.questions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Questions Preview</CardTitle>
              <CardDescription>
                {hasImageRequirements(parseResult)
                  ? "Upload images for items marked with the image icon"
                  : "No images required for these questions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {parseResult.questions.map((question, idx) => (
                  <AccordionItem key={question.code} value={question.code}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <span className="font-mono text-sm">{question.code}</span>
                        {question.imageRequirements.length > 0 && (
                          <Badge variant={
                            question.imageRequirements.every((r) => uploadedImages.has(r.storagePath))
                              ? "default"
                              : "secondary"
                          }>
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {question.imageRequirements.filter((r) => uploadedImages.has(r.storagePath)).length}/
                            {question.imageRequirements.length}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Question text */}
                        <div>
                          <Label className="text-xs text-muted-foreground">Question</Label>
                          <p className="text-sm mt-1">{question.data.question || question.data.prompt}</p>
                        </div>

                        {/* Options for MCQ */}
                        {question.data.option_a && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className={question.data.answer?.toUpperCase() === "A" ? "bg-green-50 p-2 rounded" : "p-2"}>
                              <Label className="text-xs text-muted-foreground">A</Label>
                              <p className="text-sm">{question.data.option_a}</p>
                            </div>
                            <div className={question.data.answer?.toUpperCase() === "B" ? "bg-green-50 p-2 rounded" : "p-2"}>
                              <Label className="text-xs text-muted-foreground">B</Label>
                              <p className="text-sm">{question.data.option_b}</p>
                            </div>
                            <div className={question.data.answer?.toUpperCase() === "C" ? "bg-green-50 p-2 rounded" : "p-2"}>
                              <Label className="text-xs text-muted-foreground">C</Label>
                              <p className="text-sm">{question.data.option_c}</p>
                            </div>
                            <div className={question.data.answer?.toUpperCase() === "D" ? "bg-green-50 p-2 rounded" : "p-2"}>
                              <Label className="text-xs text-muted-foreground">D</Label>
                              <p className="text-sm">{question.data.option_d}</p>
                            </div>
                          </div>
                        )}

                        {/* Image Upload Fields */}
                        {question.imageRequirements.length > 0 && (
                          <div className="border-t pt-4 mt-4">
                            <Label className="text-sm font-medium mb-2 block">Required Images</Label>
                            <div className="grid gap-3">
                              {question.imageRequirements.map((req) => (
                                <ImageUploadField
                                  key={req.storagePath}
                                  requirement={req}
                                  uploadedImage={uploadedImages.get(req.storagePath)}
                                  onUpload={(file) => handleImageUpload(req.storagePath, file)}
                                  onRemove={() => handleRemoveImage(req.storagePath)}
                                />
                              ))}
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
              <CardTitle className="text-lg">Passages Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {parseResult.passages.map((passage, idx) => (
                  <AccordionItem key={passage.code} value={passage.code}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <span className="font-mono text-sm">{passage.code}</span>
                        <Badge variant="secondary">{passage.data.type}</Badge>
                        {passage.imageRequirements.length > 0 && (
                          <Badge variant={
                            passage.imageRequirements.every((r) => uploadedImages.has(r.storagePath))
                              ? "default"
                              : "secondary"
                          }>
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {passage.imageRequirements.filter((r) => uploadedImages.has(r.storagePath)).length}/
                            {passage.imageRequirements.length}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {passage.data.title && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Title</Label>
                            <p className="text-sm font-medium mt-1">{passage.data.title}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">Content</Label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{passage.data.content}</p>
                        </div>

                        {/* Image Upload Fields */}
                        {passage.imageRequirements.length > 0 && (
                          <div className="border-t pt-4 mt-4">
                            <Label className="text-sm font-medium mb-2 block">Required Images</Label>
                            <div className="grid gap-3">
                              {passage.imageRequirements.map((req) => (
                                <ImageUploadField
                                  key={req.storagePath}
                                  requirement={req}
                                  uploadedImage={uploadedImages.get(req.storagePath)}
                                  onUpload={(file) => handleImageUpload(req.storagePath, file)}
                                  onRemove={() => handleRemoveImage(req.storagePath)}
                                />
                              ))}
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
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep("upload")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (imageCount > 0 && !allImagesUploaded())}
            size="lg"
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
                <span key={i} className="block">{e.message}</span>
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
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Questions</h1>
        <p className="text-muted-foreground mt-2">
          Upload questions in bulk using CSV files. Download a template first to see the required format.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
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
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          active
            ? "bg-primary text-primary-foreground"
            : completed
            ? "bg-green-500 text-white"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <span className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}>
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
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg">
      <div className="flex-1">
        <Label className="text-sm">{requirement.label}</Label>
        <p className="text-xs text-muted-foreground font-mono">{requirement.storagePath}</p>
      </div>

      {uploadedImage ? (
        <div className="flex items-center gap-2">
          <img
            src={uploadedImage.preview}
            alt={requirement.label}
            className="w-12 h-12 object-cover rounded border"
          />
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </>
      )}
    </div>
  );
}
