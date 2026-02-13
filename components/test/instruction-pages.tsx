"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TEST_CONFIG, type GeneralInstructionPage, type DBInstructionPage } from "@/lib/config/test-rules";

interface InstructionPagesProps {
  subjectName: string;
  subjectInstructions: DBInstructionPage[] | null;
  onComplete: () => void; // Called when all instructions have been read
}

export function InstructionPages({
  subjectName,
  subjectInstructions,
  onComplete,
}: InstructionPagesProps) {
  const generalPages: GeneralInstructionPage[] = TEST_CONFIG.instructions.showGeneralInstructions
    ? (TEST_CONFIG.instructions.generalPages as unknown as GeneralInstructionPage[])
    : [];

  const dbPages: DBInstructionPage[] = subjectInstructions || [];

  // Total pages = general pages + subject-specific pages
  const totalPages = generalPages.length + dbPages.length;
  const [currentPage, setCurrentPage] = useState(0);

  const isGeneralPage = currentPage < generalPages.length;
  const isLastPage = currentPage === totalPages - 1;

  const handleNext = () => {
    if (isLastPage) {
      onComplete();
    } else {
      setCurrentPage((p) => p + 1);
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8eef3] flex flex-col font-[family-name:var(--font-inter)]">
      {/* Header bar */}
      <div className="bg-[#1a2744] text-white py-4 px-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{subjectName} - Instructions</h1>
        <span className="text-sm text-white/70">
          Page {currentPage + 1} of {totalPages}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-6 md:p-10 overflow-auto">
        <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border p-8 md:p-12">
          {isGeneralPage ? (
            <GeneralInstructionContent page={generalPages[currentPage]} />
          ) : (
            <SubjectInstructionContent
              page={dbPages[currentPage - generalPages.length]}
            />
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="border-t bg-white px-6 py-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentPage === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentPage ? "bg-[#1a2744]" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="bg-[#1a2744] hover:bg-[#1a2744]/90"
        >
          {isLastPage ? "Begin Test" : "Next"}
          {!isLastPage && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}

function GeneralInstructionContent({ page }: { page: GeneralInstructionPage }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1a2744] mb-8">{page.title}</h2>
      <div className="space-y-6">
        {page.sections.map((section, i) => (
          <div key={i}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {section.heading}
            </h3>
            <p className="text-gray-600 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectInstructionContent({ page }: { page: DBInstructionPage }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1a2744] mb-6">{page.title}</h2>
      <div
        className="text-gray-600 leading-relaxed prose prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
