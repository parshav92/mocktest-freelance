import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Count actual words in text, stripping HTML tags and markdown syntax.
 * Works with both HTML (Tiptap output) and plain/markdown text.
 */
export function countWords(text: string): number {
    if (!text) return 0;

    let stripped = text;

    // If the text looks like HTML, strip tags first
    if (/<[^>]+>/.test(stripped)) {
        stripped = stripped
            // Replace block-level closing tags with a space to separate words
            .replace(/<\/(p|div|h[1-6]|li|blockquote|br|hr)>/gi, " ")
            // Remove all remaining HTML tags
            .replace(/<[^>]*>/g, "")
            // Decode common HTML entities
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ");
    } else {
        // Plain text / markdown — strip markdown syntax
        stripped = stripped
            .replace(/!\[.*?\]\(.*?\)/g, "")
            .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
            .replace(/^#{1,6}\s+/gm, "")
            .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
            .replace(/~~(.*?)~~/g, "$1")
            .replace(/`([^`]*)`/g, "$1")
            .replace(/```[\s\S]*?```/g, "")
            .replace(/^[-*_]{3,}\s*$/gm, "")
            .replace(/^\s*[-*+]\s+/gm, "")
            .replace(/^\s*\d+\.\s+/gm, "")
            .replace(/^\s*>\s?/gm, "");
    }

    // Collapse whitespace and count
    stripped = stripped.replace(/\s+/g, " ").trim();
    if (stripped.length === 0) return 0;
    return stripped.split(/\s+/).filter(Boolean).length;
}

/**
 * Strip HTML tags and decode entities to get plain text.
 * Useful for sending Tiptap content to LLM or for display.
 */
export function stripHtmlToText(html: string): string {
    if (!html) return "";

    return (
        html
            // Replace block-level closing tags with newlines to preserve structure
            .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
            // Replace <br> with newlines
            .replace(/<br\s*\/?>/gi, "\n")
            // Replace <hr> with separator
            .replace(/<hr\s*\/?>/gi, "\n---\n")
            // Remove all remaining HTML tags
            .replace(/<[^>]*>/g, "")
            // Decode common HTML entities
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/&mdash;/g, "—")
            .replace(/&ndash;/g, "–")
            .replace(/&hellip;/g, "...")
            .replace(/&rsquo;/g, "'")
            .replace(/&lsquo;/g, "'")
            .replace(/&rdquo;/g, '"')
            .replace(/&ldquo;/g, '"')
            // Collapse multiple newlines to max 2
            .replace(/\n{3,}/g, "\n\n")
            // Collapse multiple spaces
            .replace(/[ \t]+/g, " ")
            // Trim each line
            .split("\n")
            .map((line) => line.trim())
            .join("\n")
            .trim()
    );
}
