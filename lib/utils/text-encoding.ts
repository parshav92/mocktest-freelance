/**
 * Repair common mojibake from UTF-8 text mis-decoded as Windows-1252/Latin-1.
 *
 * Classic symptom: curly quotes show as Â“ Â” Â’ instead of “ ” ’
 */

const MOJIBAKE_MARKER = /[ÂÃâ]/;

/** Explicit replacements for sequences that survive as mixed Unicode. */
const REPLACEMENTS: Array<[RegExp, string]> = [
    // UTF-8 curly quotes / dashes misread as Windows-1252 (full 3-byte forms)
    [/Â€œ/g, "\u201C"], // “
    [/Â€/g, "\u201D"], // ”
    [/Â€˜/g, "\u2018"], // ‘
    [/Â€™/g, "\u2019"], // ’
    [/Â€”/g, "\u2014"], // —
    [/Â€“/g, "\u2013"], // –
    [/Â€¦/g, "\u2026"], // …
    [/Â€/g, "\u20AC"], // €

    // Partial / alternate forms often seen in DBs and UIs
    [/Â“/g, "\u201C"],
    [/Â”/g, "\u201D"],
    [/Â‘/g, "\u2018"],
    [/Â’/g, "\u2019"],
    [/Â—/g, "\u2014"],
    [/Â–/g, "\u2013"],
    [/Â…/g, "\u2026"],

    // Space / nbsp artifacts
    [/Â /g, " "],
    [/Â\u00A0/g, "\u00A0"],
];

function applyReplacementMap(input: string): string {
    let out = input;
    for (const [pattern, replacement] of REPLACEMENTS) {
        out = out.replace(pattern, replacement);
    }
    return out;
}

/**
 * If every character is in the Latin-1 byte range, reinterpret those bytes as UTF-8.
 * Fixes whole-string mojibake from decoding UTF-8 as Windows-1252.
 */
function tryLatin1AsUtf8(input: string): string | null {
    const codes: number[] = [];
    for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i);
        if (code > 255) return null;
        codes.push(code);
    }

    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(
            Uint8Array.from(codes),
        );
    } catch {
        return null;
    }
}

function mojibakeScore(s: string): number {
    const matches = s.match(/[ÂÃ]/g);
    return matches?.length ?? 0;
}

/**
 * Repair mojibake in a single text value. Safe for already-correct UTF-8.
 */
export function repairMojibakeText(input: string | null | undefined): string {
    if (!input) return input ?? "";
    if (!MOJIBAKE_MARKER.test(input)) return input;

    const replaced = applyReplacementMap(input);

    // Prefer Latin-1→UTF-8 reinterpretation when it reduces mojibake markers
    const reinterpreted = tryLatin1AsUtf8(input);
    if (reinterpreted != null) {
        const reinterpretedClean = applyReplacementMap(reinterpreted);
        if (mojibakeScore(reinterpretedClean) < mojibakeScore(replaced)) {
            return reinterpretedClean;
        }
        if (
            mojibakeScore(reinterpretedClean) === mojibakeScore(replaced) &&
            reinterpretedClean.length <= replaced.length
        ) {
            // Prefer reinterpretation when scores tie (usually more complete)
            return reinterpretedClean;
        }
    }

    return replaced;
}

/**
 * Deep-repair all string fields in a plain object (CSV row / question content).
 */
export function repairMojibakeInRecord<T extends Record<string, unknown>>(
    record: T,
): T {
    const out: Record<string, unknown> = { ...record };
    for (const [key, value] of Object.entries(out)) {
        if (typeof value === "string") {
            out[key] = repairMojibakeText(value);
        } else if (Array.isArray(value)) {
            out[key] = value.map((item) =>
                typeof item === "string"
                    ? repairMojibakeText(item)
                    : item && typeof item === "object"
                      ? repairMojibakeInRecord(
                            item as Record<string, unknown>,
                        )
                      : item,
            );
        } else if (value && typeof value === "object") {
            out[key] = repairMojibakeInRecord(
                value as Record<string, unknown>,
            );
        }
    }
    return out as T;
}
