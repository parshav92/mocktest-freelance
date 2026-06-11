"use client";

import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// ============================================
// UNICODE → KATEX NORMALIZATION MAP
// ============================================
// Maps Unicode math symbols (from Word→CSV export) to KaTeX commands.
// These are applied ONLY inside detected math segments.

const UNICODE_TO_KATEX: [RegExp, string][] = [
    // ── Greek letters ──
    [/\u03B1/g, "\\alpha "],
    [/\u03B2/g, "\\beta "],
    [/\u03B3/g, "\\gamma "],
    [/\u03B4/g, "\\delta "],
    [/\u03B5/g, "\\epsilon "],
    [/\u03B6/g, "\\zeta "],
    [/\u03B7/g, "\\eta "],
    [/\u03B8/g, "\\theta "],
    [/\u03B9/g, "\\iota "],
    [/\u03BA/g, "\\kappa "],
    [/\u03BB/g, "\\lambda "],
    [/\u03BC/g, "\\mu "],
    [/\u03BD/g, "\\nu "],
    [/\u03BE/g, "\\xi "],
    [/\u03C0/g, "\\pi "],
    [/\u03C1/g, "\\rho "],
    [/\u03C3/g, "\\sigma "],
    [/\u03C4/g, "\\tau "],
    [/\u03C5/g, "\\upsilon "],
    [/\u03C6/g, "\\phi "],
    [/\u03C7/g, "\\chi "],
    [/\u03C8/g, "\\psi "],
    [/\u03C9/g, "\\omega "],
    // Uppercase
    [/\u0393/g, "\\Gamma "],
    [/\u0394/g, "\\Delta "],
    [/\u0398/g, "\\Theta "],
    [/\u039B/g, "\\Lambda "],
    [/\u039E/g, "\\Xi "],
    [/\u03A0/g, "\\Pi "],
    [/\u03A3/g, "\\Sigma "],
    [/\u03A6/g, "\\Phi "],
    [/\u03A8/g, "\\Psi "],
    [/\u03A9/g, "\\Omega "],

    // ── Operators & relations ──
    [/\u00D7/g, "\\times "],
    [/\u00F7/g, "\\div "],
    [/\u2260/g, "\\neq "],
    [/\u2264/g, "\\leq "],
    [/\u2265/g, "\\geq "],
    [/\u00B1/g, "\\pm "],
    [/\u2213/g, "\\mp "],
    [/\u2248/g, "\\approx "],
    [/\u2261/g, "\\equiv "],
    [/\u221D/g, "\\propto "],
    [/\u2219/g, "\\cdot "],
    [/\u22C5/g, "\\cdot "],
    [/\u2022/g, "\\bullet "],

    // ── Roots & powers ──
    [/\u221A/g, "\\sqrt"],
    [/\u221B/g, "\\sqrt[3]"],
    [/\u221C/g, "\\sqrt[4]"],

    // ── Superscripts (Unicode superscript digits) ──
    [/\u2070/g, "^{0}"],
    [/\u00B9/g, "^{1}"],
    [/\u00B2/g, "^{2}"],
    [/\u00B3/g, "^{3}"],
    [/\u2074/g, "^{4}"],
    [/\u2075/g, "^{5}"],
    [/\u2076/g, "^{6}"],
    [/\u2077/g, "^{7}"],
    [/\u2078/g, "^{8}"],
    [/\u2079/g, "^{9}"],
    [/\u207B/g, "^{-}"],   // superscript minus
    [/\u207A/g, "^{+}"],   // superscript plus
    [/\u207F/g, "^{n}"],   // superscript n

    // ── Subscripts (Unicode subscript digits) ──
    [/\u2080/g, "_{0}"],
    [/\u2081/g, "_{1}"],
    [/\u2082/g, "_{2}"],
    [/\u2083/g, "_{3}"],
    [/\u2084/g, "_{4}"],
    [/\u2085/g, "_{5}"],
    [/\u2086/g, "_{6}"],
    [/\u2087/g, "_{7}"],
    [/\u2088/g, "_{8}"],
    [/\u2089/g, "_{9}"],

    // ── Fraction chars ──
    [/\u00BD/g, "\\frac{1}{2}"],
    [/\u2153/g, "\\frac{1}{3}"],
    [/\u2154/g, "\\frac{2}{3}"],
    [/\u00BC/g, "\\frac{1}{4}"],
    [/\u00BE/g, "\\frac{3}{4}"],
    [/\u2155/g, "\\frac{1}{5}"],
    [/\u2156/g, "\\frac{2}{5}"],
    [/\u2157/g, "\\frac{3}{5}"],
    [/\u2158/g, "\\frac{4}{5}"],
    [/\u2159/g, "\\frac{1}{6}"],
    [/\u215A/g, "\\frac{5}{6}"],
    [/\u2150/g, "\\frac{1}{7}"],
    [/\u215B/g, "\\frac{1}{8}"],
    [/\u215C/g, "\\frac{3}{8}"],
    [/\u215D/g, "\\frac{5}{8}"],
    [/\u215E/g, "\\frac{7}{8}"],
    [/\u2151/g, "\\frac{1}{9}"],
    [/\u2152/g, "\\frac{1}{10}"],

    // ── Misc symbols ──
    [/\u00B0/g, "^{\\circ}"],     // degree
    [/\u2220/g, "\\angle "],
    [/\u22A5/g, "\\perp "],
    [/\u2225/g, "\\parallel "],
    [/\u221E/g, "\\infty "],
    [/\u2200/g, "\\forall "],
    [/\u2203/g, "\\exists "],
    [/\u2208/g, "\\in "],
    [/\u2209/g, "\\notin "],
    [/\u2282/g, "\\subset "],
    [/\u2283/g, "\\supset "],
    [/\u222A/g, "\\cup "],
    [/\u2229/g, "\\cap "],
    [/\u2205/g, "\\emptyset "],
    [/\u2234/g, "\\therefore "],
    [/\u2235/g, "\\because "],
    [/\u2192/g, "\\rightarrow "],
    [/\u2190/g, "\\leftarrow "],
    [/\u21D2/g, "\\Rightarrow "],
    [/\u21D0/g, "\\Leftarrow "],
    [/\u2194/g, "\\leftrightarrow "],

    // ── Integrals & sums ──
    [/\u222B/g, "\\int "],
    [/\u222C/g, "\\iint "],
    [/\u222D/g, "\\iiint "],
    [/\u2211/g, "\\sum "],
    [/\u220F/g, "\\prod "],
];

// ============================================
// DETECT IF TEXT CONTAINS MATH
// ============================================
// Regex that matches any character we'd want to transform

const MATH_TRIGGER = new RegExp(
    [
        // Unicode math symbols
        "[\\u00B0-\\u00BE\\u00D7\\u00F7",
        "\\u2070-\\u209F",           // super/subscripts
        "\\u2150-\\u215E",           // fraction chars
        "\\u2190-\\u21FF",           // arrows
        "\\u2200-\\u22FF",           // math operators
        "\\u0391-\\u03C9]",          // Greek letters
        // Plain-text patterns from Word→CSV
        "\\d+\\s*/\\s*\\d+",         // fractions like 3/4
        "[a-zA-Z]\\s*/\\s*[a-zA-Z]", // variable fractions K/L
        "\\w\\^\\d",                 // exponents x^2
        "(?:\\\\)?\\^\\s*(?:\\{[^}]+\\}|[A-Za-z0-9+-])", // standalone superscripts
        "(?:\\\\)?_\\s*(?:\\{[^}]+\\}|[A-Za-z0-9+-])", // standalone subscripts
        "sqrt\\(",                   // sqrt(...)
        "\\\\[a-zA-Z]+",            // explicit KaTeX commands like \alpha
    ].join("|"),
);

const KATEX_COMMAND_TRIGGER = /\\[a-zA-Z]+/;

/**
 * Check if string has anything that needs math rendering.
 * Fast bail-out for pure English text (majority of content).
 */
function hasMathContent(text: string): boolean {
    return MATH_TRIGGER.test(text);
}

function hasKatexCommand(text: string): boolean {
    return KATEX_COMMAND_TRIGGER.test(text);
}

// ============================================
// PLAIN-TEXT PATTERN → KATEX TRANSFORMS
// ============================================
// Applied to segments identified as "math-like".
// Order matters — more specific patterns first.

/**
 * Convert plain-text math patterns to KaTeX.
 * This handles the Word→CSV degraded formulas.
 */
function plainTextToKatex(text: string): string {
    let result = text;

    // Normalize repeated slashes before commands so "\\alpha" and "\\\\alpha"
    // are both interpreted as the same KaTeX command token.
    result = result.replace(/\\{2,}(?=[a-zA-Z]+)/g, "\\");

    // Normalize escaped script operators (e.g. "\\^{1}") into plain operators.
    result = result.replace(/\\(?=[\^_])/g, "");

    // 1. Unicode symbol normalization
    for (const [pattern, replacement] of UNICODE_TO_KATEX) {
        result = result.replace(pattern, replacement);
    }

    // 2. Mixed fractions: "2 3/4" → "2\\frac{3}{4}"
    //    Must come before simple fractions
    result = result.replace(
        /(\d+)\s+(\d+)\s*\/\s*(\d+)/g,
        "$1\\frac{$2}{$3}",
    );

    // 3. Simple numeric fractions: "3/4" → "\frac{3}{4}"
    //    Negative lookahead/behind to avoid matching dates, paths, etc.
    result = result.replace(
        /(?<![\/\w])(\d+)\s*\/\s*(\d+)(?![\/\w])/g,
        "\\frac{$1}{$2}",
    );

    // 4. Variable fractions: "K/L" → "\frac{K}{L}"
    result = result.replace(
        /(?<![a-zA-Z])([a-zA-Z])\s*\/\s*([a-zA-Z])(?![a-zA-Z])/g,
        "\\frac{$1}{$2}",
    );

    // 5. Exponents: "x^2", "cm^3" → "x^{2}", "cm^{3}"
    result = result.replace(
        /([a-zA-Z0-9]+)\^(\d+)/g,
        "$1^{$2}",
    );

    // 5b. Exponents with spaces: "x ^ 2" -> "x^{2}"
    result = result.replace(
        /([a-zA-Z0-9]+)\s*\^\s*(\d+)/g,
        "$1^{$2}",
    );

    // 5c. Standalone superscripts: "^{P}" or "^p" -> "{}^{P}" / "{}^{p}"
    result = result.replace(
        /(^|[^a-zA-Z0-9}\]])\^\s*\{([^}]+)\}/g,
        "$1{}^{$2}",
    );
    result = result.replace(
        /(^|[^a-zA-Z0-9}\]])\^\s*([A-Za-z0-9+-])/g,
        "$1{}^{$2}",
    );

    // 5d. Standalone subscripts: "_{i}" or "_i" -> "{}_{i}"
    result = result.replace(
        /(^|[^a-zA-Z0-9}\]])_\s*\{([^}]+)\}/g,
        "$1{}_{$2}",
    );
    result = result.replace(
        /(^|[^a-zA-Z0-9}\]])_\s*([A-Za-z0-9+-])/g,
        "$1{}_{$2}",
    );

    // 6a. \sqrt(expr) → \sqrt{expr}
    result = result.replace(
        /\\sqrt\(([^)]+)\)/gi,
        "\\sqrt{$1}",
    );

    // 6b. sqrt(expr) → \sqrt{expr}
    result = result.replace(
        /(?<!\\)sqrt\(([^)]+)\)/gi,
        "\\sqrt{$1}",
    );

    // 6c. \sqrt9 or \sqrt x -> \sqrt{9} / \sqrt{x}
    result = result.replace(
        /\\sqrt(?!\s*(?:\{|\[|\())\s*([A-Za-z0-9])/g,
        "\\sqrt{$1}",
    );

    // 6d. \sqrt[3]8 -> \sqrt[3]{8}
    result = result.replace(
        /\\sqrt\[([^\]]+)\](?!\s*\{)\s*([A-Za-z0-9])/g,
        "\\sqrt[$1]{$2}",
    );

    return result;
}

// ============================================
// SEGMENT PARSER
// ============================================
// Splits input text into alternating "plain text" and "math" segments
// so that only math-containing portions go through KaTeX.

interface Segment {
    type: "text" | "math";
    value: string;
}

// ============================================
// STACK-BASED MATH TOKEN EXTRACTOR
// ============================================
// Handles arbitrary nesting depth — regex cannot do this reliably.

/** Consume a balanced brace group `{...}` starting at index i (pointing at `{`). Returns new index after closing `}`. */
function consumeBraceGroup(text: string, i: number): number {
    if (text[i] !== "{") return i;
    let depth = 1;
    i++; // skip opening {
    while (i < text.length && depth > 0) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        i++;
    }
    return i;
}

/** Consume a bracket group `[...]` starting at index i. Returns new index. */
function consumeBracketGroup(text: string, i: number): number {
    if (text[i] !== "[") return i;
    let depth = 1;
    i++;
    while (i < text.length && depth > 0) {
        if (text[i] === "[") depth++;
        else if (text[i] === "]") depth--;
        i++;
    }
    return i;
}

/**
 * Extract math token positions from `text` using a character-level scanner.
 * Handles:
 *  - `\command[opt]{arg}{arg}` with unlimited nesting
 *  - `{}^{...}` / `{}_{...}` orphan scripts
 *  - `word^{...}` / `word_{...}` superscript/subscript
 */
function extractMathTokens(text: string): Array<{ start: number; end: number }> {
    const tokens: Array<{ start: number; end: number }> = [];
    let i = 0;

    while (i < text.length) {
        // ── Case 1: KaTeX command \name[...]{...}... ──
        if (text[i] === "\\" && i + 1 < text.length && /[a-zA-Z]/.test(text[i + 1])) {
            const start = i;
            i += 2;
            while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;

            // Consume optional argument lists (any mix of [] and {})
            let progress = true;
            while (progress) {
                progress = false;
                // skip spaces between command and args
                const ws = i;
                while (i < text.length && text[i] === " ") i++;
                if (i < text.length && text[i] === "[") {
                    i = consumeBracketGroup(text, i);
                    progress = true;
                } else if (i < text.length && text[i] === "{") {
                    i = consumeBraceGroup(text, i);
                    progress = true;
                } else {
                    i = ws; // restore whitespace — no argument found
                }
            }

            // Consume trailing ^{} / _{} modifiers on the command result
            while (i < text.length && (text[i] === "^" || text[i] === "_")) {
                i++;
                if (i < text.length && text[i] === "{") i = consumeBraceGroup(text, i);
                else if (i < text.length && /[A-Za-z0-9+-]/.test(text[i])) i++;
            }

            tokens.push({ start, end: i });
            continue;
        }

        // ── Case 2: orphan `{}^{...}` or `{}_{...}` scripts ──
        if (
            text[i] === "{" &&
            text[i + 1] === "}" &&
            i + 2 < text.length &&
            (text[i + 2] === "^" || text[i + 2] === "_")
        ) {
            const start = i;
            i += 2; // skip {}
            while (i < text.length && (text[i] === "^" || text[i] === "_")) {
                i++;
                if (i < text.length && text[i] === "{") i = consumeBraceGroup(text, i);
                else if (i < text.length && /[A-Za-z0-9+-]/.test(text[i])) i++;
            }
            tokens.push({ start, end: i });
            continue;
        }

        // ── Case 3: alphanumeric word with ^{} or _{} ──
        if (/[A-Za-z0-9]/.test(text[i])) {
            const wordStart = i;
            while (i < text.length && /[A-Za-z0-9]/.test(text[i])) i++;
            if (i < text.length && (text[i] === "^" || text[i] === "_")) {
                const scriptStart = i;
                let j = i;
                while (j < text.length && (text[j] === "^" || text[j] === "_")) {
                    j++;
                    if (j < text.length && text[j] === "{") j = consumeBraceGroup(text, j);
                    else if (j < text.length && /[A-Za-z0-9+-]/.test(text[j])) j++;
                }
                tokens.push({ start: wordStart, end: j });
                i = j;
            }
            // else: plain word, not a math token — don't push, just continue
            continue;
        }

        i++;
    }

    return tokens;
}

function segmentize(raw: string): Segment[] {
    if (!raw) return [];
    if (!hasMathContent(raw) && !hasKatexCommand(raw)) {
        return [{ type: "text", value: raw }];
    }

    const normalized = plainTextToKatex(raw);
    const tokens = extractMathTokens(normalized);
    if (tokens.length === 0) return [{ type: "text", value: raw }];

    const segments: Segment[] = [];
    let lastIndex = 0;

    for (const { start, end } of tokens) {
        if (start > lastIndex) {
            segments.push({ type: "text", value: normalized.slice(lastIndex, start) });
        }
        segments.push({ type: "math", value: normalized.slice(start, end) });
        lastIndex = end;
    }

    if (lastIndex < normalized.length) {
        segments.push({ type: "text", value: normalized.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ type: "text", value: raw }];
}

// ============================================
// KATEX RENDERER
// ============================================

/** Render one math snippet to HTML using KaTeX. */
function renderMathSegment(raw: string): string {
    try {
        return katex.renderToString(raw, {
            throwOnError: false,
            displayMode: false,
            strict: false,
            trust: false,
            output: "htmlAndMathml",
        });
    } catch {
        // If KaTeX fails, return escaped text so rendering never crashes.
        return escapeHtml(raw);
    }
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================
// REACT COMPONENT
// ============================================

interface MathTextProps {
    /** Raw text content — may contain Unicode math symbols, plain text patterns, or pure text */
    content: string;
    /** Additional CSS class names */
    className?: string;
    /** Render as a block element (div) instead of inline (span) */
    block?: boolean;
}

/**
 * MathText — renders text with auto-detected math symbols.
 *
 * Handles:
 * - Unicode math symbols (θ, π, √, ², ÷, ×, ½, etc.)
 * - Plain-text fractions (3/4, K/L)
 * - Mixed fractions (2 3/4)
 * - Exponents (x^2, cm^3)
 * - sqrt(x) notation
 * - Greek letters, operators, arrows, set notation
 *
 * Pure text without math passes through untouched (zero overhead).
 */
export const MathText = React.memo(function MathText({
    content,
    className,
    block = false,
}: MathTextProps) {
    const rendered = useMemo(() => {
        if (!content) return null;

        // Fast path: no math content → render as plain text
        if (!hasMathContent(content) && !hasKatexCommand(content)) {
            return <>{content}</>;
        }

        // Split into text/math segments
        const segments = segmentize(content);

        return segments.map((seg, i) => {
            if (seg.type === "text") {
                return <React.Fragment key={i}>{seg.value}</React.Fragment>;
            }

            // Render math segment via KaTeX
            const html = renderMathSegment(seg.value);

            // Check if KaTeX actually produced HTML (contains class="katex")
            if (html.includes("katex")) {
                return (
                    <span
                        key={i}
                        dangerouslySetInnerHTML={{ __html: html }}
                        className="math-rendered"
                    />
                );
            }

            // KaTeX didn't parse it — render as text
            return <React.Fragment key={i}>{seg.value}</React.Fragment>;
        });
    }, [content]);

    const Tag = block ? "div" : "span";

    return (
        <Tag className={`math-content ${block ? "whitespace-pre-line " : ""}${className ?? ""}`}>
            {rendered}
        </Tag>
    );
});
