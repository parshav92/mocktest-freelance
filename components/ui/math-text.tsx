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
        "sqrt\\(",                   // sqrt(...)
    ].join("|"),
);

/**
 * Check if string has anything that needs math rendering.
 * Fast bail-out for pure English text (majority of content).
 */
function hasMathContent(text: string): boolean {
    return MATH_TRIGGER.test(text);
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

    // 6. sqrt(expr) → \sqrt{expr}
    result = result.replace(
        /sqrt\(([^)]+)\)/gi,
        "\\sqrt{$1}",
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

/**
 * Walk through the string and split it into segments.
 *
 * Strategy: scan character-by-character. When we hit something
 * that looks like the start of a math expression, we accumulate
 * it into a "math" segment. Everything else is a "text" segment.
 *
 * We use a simpler heuristic: split on sentence/clause boundaries
 * and check each chunk for math content.
 */
function segmentize(raw: string): Segment[] {
    if (!raw) return [];
    if (!hasMathContent(raw)) return [{ type: "text", value: raw }];

    // Split on sentence-like boundaries but keep delimiters
    // This ensures we don't break in the middle of "3/4" or "x^2"
    const chunks = raw.split(/(?<=[.!?\n])\s+|(?=\s*\n)/);

    // If splitting produced nothing useful, treat the whole thing as one chunk
    if (chunks.length <= 1) {
        return [{ type: "math", value: raw }];
    }

    const segments: Segment[] = [];
    let currentType: "text" | "math" | null = null;
    let currentValue = "";

    for (const chunk of chunks) {
        const chunkType = hasMathContent(chunk) ? "math" : "text";
        if (chunkType === currentType) {
            currentValue += chunk;
        } else {
            if (currentType !== null && currentValue) {
                segments.push({ type: currentType, value: currentValue });
            }
            currentType = chunkType;
            currentValue = chunk;
        }
    }
    if (currentType !== null && currentValue) {
        segments.push({ type: currentType, value: currentValue });
    }

    return segments;
}

// ============================================
// KATEX RENDERER
// ============================================

/**
 * Render a math segment to HTML using KaTeX.
 * We convert the entire segment to a KaTeX expression
 * that interleaves \text{} with math.
 */
function renderMathSegment(raw: string): string {
    // Convert plain-text patterns to KaTeX commands
    const katexStr = plainTextToKatex(raw);

    // If conversion didn't actually produce any LaTeX commands,
    // return the original text (shouldn't happen given hasMathContent gate)
    if (katexStr === raw && !MATH_TRIGGER.test(katexStr)) {
        return raw;
    }

    // Wrap in a KaTeX-friendly form.
    // We need to handle mixed text+math. KaTeX's \text{} allows nesting math
    // via $...$ but that's fragile. Instead, we wrap the entire expression
    // and let KaTeX handle it in math mode with \text for text runs.
    //
    // Strategy: identify "text" vs "math" tokens and build the expression.
    const expression = buildMixedExpression(katexStr);

    try {
        return katex.renderToString(expression, {
            throwOnError: false,
            displayMode: false,
            strict: false,
            trust: true,
            output: "htmlAndMathml",
        });
    } catch {
        // If KaTeX fails, return original text
        return escapeHtml(raw);
    }
}

/**
 * Build a KaTeX expression that mixes \text{} for plain words
 * with raw math commands.
 *
 * Input: "What is \\frac{3}{4} + \\frac{1}{2}?"
 * Output: "\\text{What is }\\frac{3}{4}\\text{ + }\\frac{1}{2}\\text{?}"
 */
function buildMixedExpression(input: string): string {
    // Pattern that matches KaTeX commands and math tokens
    const mathTokenPattern =
        /\\(?:frac|sqrt|times|div|cdot|neq|leq|geq|pm|mp|approx|equiv|propto|bullet|angle|perp|parallel|infty|forall|exists|in|notin|subset|supset|cup|cap|emptyset|therefore|because|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|int|iint|iiint|sum|prod|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)\s*(?:\[[^\]]*\])?\{[^}]*\}(?:\{[^}]*\})?|\^{[^}]*}|_{[^}]*}|\\[a-zA-Z]+\s*/g;

    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathTokenPattern.exec(input)) !== null) {
        // Text before this math token
        if (match.index > lastIndex) {
            const textBefore = input.slice(lastIndex, match.index);
            if (textBefore.trim()) {
                parts.push(`\\text{${escapeKatexText(textBefore)}}`);
            } else if (textBefore) {
                parts.push("\\;"); // preserve spacing
            }
        }

        // The math token itself
        parts.push(match[0]);
        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last math token
    if (lastIndex < input.length) {
        const remaining = input.slice(lastIndex);
        if (remaining.trim()) {
            parts.push(`\\text{${escapeKatexText(remaining)}}`);
        }
    }

    // If we found no math tokens, just wrap the whole thing in \text{}
    if (parts.length === 0) {
        return `\\text{${escapeKatexText(input)}}`;
    }

    return parts.join("");
}

function escapeKatexText(text: string): string {
    // Escape characters that are special in KaTeX \text{} mode
    return text
        .replace(/\\/g, "\\textbackslash ")
        .replace(/[{}]/g, (m) => `\\${m}`)
        .replace(/#/g, "\\#")
        .replace(/%/g, "\\%")
        .replace(/&/g, "\\&")
        .replace(/\$/g, "\\$")
        .replace(/_/g, "\\_")
        .replace(/~/g, "\\textasciitilde ");
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
        if (!hasMathContent(content)) {
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
        <Tag className={`math-content ${className ?? ""}`}>
            {rendered}
        </Tag>
    );
});
