"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MathText } from "@/components/ui/math-text";
import { isPoem, passageTypeLabel } from "@/lib/utils/passage";
import type { Passage } from "@/types/test";

interface PassagePanelProps {
    passages: Passage[];
    className?: string;
}

export function PassagePanel({ passages, className }: PassagePanelProps) {
    if (passages.length === 0) return null;

    return (
        <div
            className={`w-1/2 border-r bg-white flex flex-col min-h-0 overflow-hidden ${className ?? ""}`}
        >
            {passages.length === 1 ? (
                <>
                    <div className="border-b px-4 py-2.5 shrink-0 bg-gray-50">
                        <span className="text-sm font-medium text-[#1a2744]">
                            {passageTypeLabel(
                                passages[0].passage_type,
                                passages[0].title,
                            )}
                        </span>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <PassageBody passage={passages[0]} />
                    </ScrollArea>
                </>
            ) : (
                <Tabs defaultValue="passage-0" className="flex flex-col h-full min-h-0">
                    <div className="border-b px-4 pt-2 shrink-0 bg-gray-50">
                        <TabsList className="bg-transparent h-auto p-0 gap-0">
                            {passages.map((p, idx) => (
                                <TabsTrigger
                                    key={p.id}
                                    value={`passage-${idx}`}
                                    className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#1a2744] data-[state=active]:bg-white px-4 py-2 text-sm"
                                >
                                    {passageTypeLabel(
                                        p.passage_type,
                                        p.title,
                                        idx,
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    {passages.map((p, idx) => (
                        <TabsContent
                            key={p.id}
                            value={`passage-${idx}`}
                            className="flex-1 m-0 min-h-0 data-[state=inactive]:hidden"
                        >
                            <ScrollArea className="h-full">
                                <PassageBody passage={p} />
                            </ScrollArea>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}

function PassageBody({ passage }: { passage: Passage }) {
    const poem = isPoem(passage.passage_type);

    return (
        <div className="p-6 md:p-8">
            {passage.title && (
                <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                    {passage.title}
                </h3>
            )}
            {passage.image_url && (
                <div className="mb-4">
                    <img
                        src={passage.image_url}
                        alt={passage.title || "Passage image"}
                        className="max-w-full rounded-lg"
                    />
                </div>
            )}
            <MathText
                content={passage.content}
                block
                className={`leading-relaxed text-gray-800${poem ? " italic" : ""}`}
            />
        </div>
    );
}
