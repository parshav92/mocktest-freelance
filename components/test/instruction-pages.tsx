"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Search,
  Maximize,
  LayoutGrid,
  Info,
} from "lucide-react";
import {
  TEST_CONFIG,
  type GeneralInstructionPage,
  type DBInstructionPage,
  type InstructionSection,
} from "@/lib/config/test-rules";

interface InstructionPagesProps {
  subjectName: string;
  subjectInstructions: DBInstructionPage[] | null;
  onComplete: () => void;
}

export function InstructionPages({
  subjectName,
  subjectInstructions,
  onComplete,
}: InstructionPagesProps) {
  const generalPages: GeneralInstructionPage[] =
    TEST_CONFIG.instructions.showGeneralInstructions
      ? (TEST_CONFIG.instructions
          .generalPages as unknown as GeneralInstructionPage[])
      : [];

  const dbPages: DBInstructionPage[] = subjectInstructions || [];

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
    <div className="h-screen bg-[#e8eef3] flex flex-col font-[family-name:var(--font-inter)]">
      {/* Header bar */}
      <div className="bg-[#1a2744] text-white py-4 px-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {subjectName} - Instructions
        </h1>
        <span className="text-sm text-white/70">
          Page {currentPage + 1} of {totalPages}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-6 md:p-10 overflow-auto">
        <div className="w-full max-w-5xl ">
          {isGeneralPage ? (
            <GeneralInstructionContent page={generalPages[currentPage]} />
          ) : (
            <SubjectInstructionContent
              page={dbPages[currentPage - generalPages.length]}
              subjectName={subjectName}
            />
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="border-t bg-white px-6 py-2 flex items-center justify-between">
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

// ============================================
// GENERAL INSTRUCTION — TABLE LAYOUT
// ============================================
function GeneralInstructionContent({
  page,
}: {
  page: GeneralInstructionPage;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{page.title}</h2>

      <table className="w-full border-collapse border border-gray-300 bg-white">
        <tbody>
          {page.sections.map(
            (section: InstructionSection & { visualType?: string }, i) => (
              <tr key={i} className="border-b border-gray-300 last:border-b-0">
                {/* LEFT CELL: Text */}
                <td className="border-r border-gray-300 p-6 align-top w-[60%]">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">
                    {section.heading}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </td>

                {/* RIGHT CELL: Visual */}
                <td className="p-6 align-middle w-[40%]">
                  {section.visualType && (
                    <div className="flex items-center justify-center">
                      <InstructionVisual type={section.visualType} />
                    </div>
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// VISUAL DEMO PANELS
// ============================================
function InstructionVisual({ type }: { type: string }) {
  switch (type) {
    case "navigation":
      return <NavigationVisual />;
    case "flag":
      return <FlagVisual />;
    case "progress":
      return <ProgressVisual />;
    case "timer":
      return <TimerVisual />;
    case "scroll":
      return <ScrollVisual />;
    case "zoom":
      return <ZoomVisual />;
    default:
      return null;
  }
}

function NavigationVisual() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2744] text-white text-sm font-medium rounded">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </div>
      <div className="flex items-center gap-1.5 px-4 py-2 bg-[#1a2744] text-white text-sm font-medium rounded">
        Next
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function FlagVisual() {
  return (
    <div className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 shadow-sm">
      Flag
      <Flag className="h-4 w-4 text-gray-500" />
    </div>
  );
}

function ZoomVisual() {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Magnifying glass icon */}
      <div className="w-10 h-10 rounded border-2 border-[#1a2744] flex items-center justify-center bg-white">
        <Search className="h-5 w-5 text-[#1a2744]" />
      </div>

      {/* Zoom percentage options */}
      <div className="text-center text-sm font-medium text-[#1a2744]">100%</div>
      <div className="bg-blue-100 text-[#1a2744] text-sm font-semibold px-4 py-0.5 rounded">
        150%
      </div>
      <div className="text-sm font-medium text-[#1a2744]">200%</div>
      <div className="text-sm font-medium text-[#1a2744]">300%</div>

      {/* Fullscreen icon */}
      <div className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center bg-white mt-0.5">
        <Maximize className="h-4 w-4 text-[#1a2744]" />
      </div>
    </div>
  );
}

function TimerVisual() {
  return (
    <div className="flex items-center gap-3">
      {/* Plus icon */}
      <div className="w-8 h-8 rounded-full border-2 border-[#1a2744] flex items-center justify-center">
        <Search className="h-4 w-4 text-[#1a2744]" />
      </div>

      {/* Timer display */}
      <div className="bg-white border border-gray-300 rounded px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="text-center">
            <span className="font-mono text-xl font-bold text-gray-800">00</span>
            <p className="text-[9px] text-gray-400 -mt-0.5">Hours</p>
          </div>
          <span className="font-mono text-xl font-bold text-gray-800 -mt-3">:</span>
          <div className="text-center">
            <span className="font-mono text-xl font-bold text-gray-800">19</span>
            <p className="text-[9px] text-gray-400 -mt-0.5">Mins</p>
          </div>
          <span className="font-mono text-xl font-bold text-gray-800 -mt-3">:</span>
          <div className="text-center">
            <span className="font-mono text-xl font-bold text-gray-800">58</span>
            <p className="text-[9px] text-gray-400 -mt-0.5">Secs</p>
          </div>
        </div>
      </div>

      {/* Hide time button */}
      <div className="bg-[#1a2744] text-white text-[10px] font-medium px-2 py-1.5 rounded leading-tight text-center">
        Hide<br />time
      </div>
    </div>
  );
}

function ScrollVisual() {
  return (
    <div className="w-full max-w-[280px] bg-white border border-gray-300 rounded shadow-sm overflow-hidden text-[8px]">
      {/* Mock toolbar */}
      <div className="flex items-center justify-between bg-gray-100 border-b border-gray-200 px-2 py-1">
        <div className="flex items-center gap-1">
          <Search className="h-2.5 w-2.5 text-gray-400" />
          <span className="text-gray-400">68 : 43</span>
        </div>
        <div className="bg-[#1a2744] text-white px-1.5 py-0.5 rounded text-[7px]">
          Question 4 of 17
        </div>
      </div>

      {/* Mock passage content */}
      <div className="px-2 py-1.5 space-y-1 text-gray-400 leading-tight">
        <div className="flex gap-1">
          <span className="text-[7px] text-blue-500 underline">Extract A</span>
          <span className="text-[7px] text-blue-500 underline">Extract B</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
        <div className="h-1.5 bg-gray-100 rounded-full w-11/12" />
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
        <div className="h-1.5 bg-gray-100 rounded-full w-4/5" />
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
        <div className="h-1.5 bg-gray-100 rounded-full w-3/4" />
        <div className="h-1.5 bg-gray-100 rounded-full w-full" />
        <div className="h-1.5 bg-gray-100 rounded-full w-5/6" />
      </div>

      {/* Mock scrollbar indicator */}
      <div className="flex justify-end px-1 pb-0.5">
        <div className="w-1.5 h-6 bg-gray-300 rounded-full" />
      </div>

      {/* Bottom nav bar */}
      <div className="flex items-center justify-between border-t border-gray-200 px-2 py-1 bg-gray-50">
        <div className="flex items-center gap-0.5 bg-[#1a2744] text-white px-1.5 py-0.5 rounded text-[7px]">
          <ArrowLeft className="h-2 w-2" />
          Back
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 border border-gray-300 px-1.5 py-0.5 rounded text-[7px] text-gray-500">
            Flag
            <Flag className="h-2 w-2" />
          </div>
          <div className="flex items-center gap-0.5 bg-[#1a2744] text-white px-1.5 py-0.5 rounded text-[7px]">
            Next
            <ArrowRight className="h-2 w-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressVisual() {
  const questionStates = [
    { num: 0, status: "info" },
    { num: 1, status: "answered" },
    { num: 2, status: "answered" },
    { num: 3, status: "flagged" },
    { num: 4, status: "answered" },
    { num: 5, status: "not-answered" },
    { num: 6, status: "not-read" },
    { num: 7, status: "not-read" },
    { num: 8, status: "not-read" },
    { num: 9, status: "not-read" },
    { num: 10, status: "not-read" },
    { num: 11, status: "not-read" },
    { num: 12, status: "not-read" },
    { num: 13, status: "not-read" },
    { num: 14, status: "not-read" },
    { num: 15, status: "not-read" },
    { num: 16, status: "not-read" },
    { num: 17, status: "not-read" },
  ];

  const statusStyle = (s: string) => {
    switch (s) {
      case "info":
        return "bg-green-600 text-white";
      case "answered":
        return "bg-red-600 text-white";
      case "flagged":
        return "bg-white text-[#1a2744] border-2 border-blue-500";
      case "not-answered":
        return "bg-white text-gray-700 border border-gray-300";
      default:
        return "bg-gray-200 text-gray-600 border border-gray-300";
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Question counter badge with grid icon */}
      <div className="flex items-center justify-center gap-2">
        <span className="bg-[#1a2744] text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-2">
          Question 5 of 17
          <LayoutGrid className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Progress summary header */}
      <div className="bg-gray-200 text-gray-700 text-xs font-semibold text-center py-1.5 rounded-sm">
        Progress summary
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-600">
        <span className="flex items-center gap-1">
          <LayoutGrid className="h-3 w-3 text-gray-500" />
          Show all
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-600 text-white text-[8px] flex items-center justify-center font-bold">4</span>
          Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-white border border-gray-300 text-[8px] flex items-center justify-center font-bold text-gray-600">1</span>
          Not answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300 text-[8px] flex items-center justify-center font-bold text-gray-500">12</span>
          Not read
        </span>
        <span className="flex items-center gap-1">
          <Flag className="h-3 w-3 text-blue-500" />
          <span className="font-semibold">1</span>
          Flagged
        </span>
      </div>

      {/* Question grid */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {questionStates.map((q) => (
          <div
            key={q.num}
            className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded ${
              statusStyle(q.status)
            }`}
          >
            {q.status === "info" ? (
              <Info className="h-4 w-4" />
            ) : (
              q.num
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SUBJECT INSTRUCTION (DB)
// ============================================
function SubjectInstructionContent({
  page,
  subjectName,
}: {
  page: DBInstructionPage;
  subjectName: string;
}) {
  return (
    <div className="bg-white min-h-[60vh] p-10 md:p-14">
      {/* Main title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Selective High School Placement Practice Test
      </h1>
      <h2 className="text-xl text-gray-700 mb-8">{subjectName}</h2>

      {/* INSTRUCTIONS header */}
      <p className="text-sm font-bold tracking-wide text-gray-900 uppercase mb-1">
        Instructions
      </p>
      <p className="text-sm font-bold text-gray-900 mb-6">
        Please read these instructions carefully.
      </p>

      {/* Content from DB */}
      <div
        className="text-sm text-gray-700 leading-relaxed space-y-1 [&_p]:mb-1 [&_br+br]:mb-4 prose prose-sm prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
