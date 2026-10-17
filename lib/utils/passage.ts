export function isPoem(passageType?: string | null): boolean {
    return passageType?.toLowerCase() === "poem";
}

export function passageTypeLabel(
    passageType?: string | null,
    title?: string | null,
    index?: number,
): string {
    if (isPoem(passageType)) {
        return index !== undefined ? `Poem ${index + 1}` : "Poem";
    }
    if (title) return title;
    return index !== undefined ? `Extract ${index + 1}` : "Extract";
}

/**
 * Extracts a passage title from either explicit metadata or the first line of the passage text.
 * Strips duplicate title headers from the passage body.
 */
export function extractPassageTitleAndText(
    rawText: string,
    explicitTitle?: string | null,
): { title: string | null; text: string } {
    if (!rawText) return { title: explicitTitle?.trim() || null, text: "" };

    const trimmedTitle = explicitTitle?.trim();
    if (trimmedTitle) {
        // If rawText starts with the explicit title, remove it so it doesn't display twice
        const escaped = trimmedTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const titlePrefixPattern = new RegExp(
            `^(?:#+\\s*|\\*\\*)?${escaped}(?:\\*\\*)?\\s*(?:\\r?\\n)+`,
            "i",
        );
        const cleanedText = rawText.replace(titlePrefixPattern, "");
        return { title: trimmedTitle, text: cleanedText };
    }

    // Check for Markdown heading: e.g. # Title or ## Title or **Title** followed by newlines
    const mdMatch = rawText.match(
        /^(?:#+\s*|\*\*)([^\n*#]+)(?:\*\*|\s*#*)?(?:\r?\n)+\s*(?:\r?\n)+([\s\S]*)$/,
    );
    if (mdMatch) {
        return {
            title: mdMatch[1].trim(),
            text: mdMatch[2].trimStart(),
        };
    }

    // Check for plain-text title on first line followed by double newline
    // e.g. "The Rumour\n\nThe rumour was a [1]..."
    const plainMatch = rawText.match(/^([^\r\n]+)(?:\r?\n)+\s*(?:\r?\n)+([\s\S]*)$/);
    if (plainMatch) {
        const candidate = plainMatch[1].trim();
        const hasBlankMarker = /___+|\[\d+\]|\{blank\}|\{GAP_\d+\}/i.test(candidate);
        const endsWithPunctuation = /[.,;:]$/.test(candidate);
        if (!hasBlankMarker && candidate.length <= 100 && !endsWithPunctuation) {
            return {
                title: candidate,
                text: plainMatch[2].trimStart(),
            };
        }
    }

    return { title: null, text: rawText };
}

