export interface MarkingCriterionDescription {
    name: string;
    style: string;
    descriptions: {
        high: string;
        satisfactory: string;
    };
}

export interface MarkingCriteriaJson {
    criteria: Array<{
        name: string;
        descriptions: {
            high: string;
            satisfactory: string;
        };
    }>;
}

export interface MergedMarkingCriteria {
    mainTopic: string;
    subTopic: string;
    keyFocus: string | null;
    criteria: MarkingCriterionDescription[];
}

export const WRITING_MAIN_TOPICS = [
    "Narrative",
    "Persuasive",
    "Informative",
] as const;

export type WritingMainTopic = (typeof WRITING_MAIN_TOPICS)[number];

export const WRITING_TOTAL_MARKS = 50;
