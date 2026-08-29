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
