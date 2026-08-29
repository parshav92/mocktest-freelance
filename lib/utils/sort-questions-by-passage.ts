interface PassageSortable {
    id: string;
    passage_ids?: unknown;
    passages?: Array<{ id: string }>;
}

function parsePassageIds(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function getPrimaryPassageId(item: PassageSortable): string | null {
    const passageIds = parsePassageIds(item.passage_ids);
    if (passageIds[0]) return passageIds[0];
    if (item.passages?.[0]?.id) return item.passages[0].id;
    return null;
}

export function sortQuestionsByPassage<T extends PassageSortable>(
    questions: T[],
): T[] {
    const passageOrder: string[] = [];
    const groups = new Map<string, T[]>();
    const standalone: T[] = [];

    for (const question of questions) {
        const passageId = getPrimaryPassageId(question);
        if (!passageId) {
            standalone.push(question);
            continue;
        }
        if (!groups.has(passageId)) {
            groups.set(passageId, []);
            passageOrder.push(passageId);
        }
        groups.get(passageId)!.push(question);
    }

    return [
        ...passageOrder.flatMap((passageId) => groups.get(passageId) ?? []),
        ...standalone,
    ];
}
