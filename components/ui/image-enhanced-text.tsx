"use client";

import { useMemo } from "react";
import { MathText } from "./math-text";

// Configuration for image sizing (easily customizable)
const IMAGE_CONFIG = {
  // Inline images: appear mid-sentence
  inline: {
    maxWidth: "200px",
    maxHeight: undefined as string | undefined,
    className: "inline-block align-middle mx-1",
    containerClass: "h-auto",
  },
  // Block images: appear on their own line
  block: {
    maxWidth: "100%",
    maxHeight: "400px",
    className: "block w-full my-4",
    containerClass: "",
  },
  // Float left: image floats to the left of text
  floatLeft: {
    maxWidth: "300px",
    maxHeight: undefined as string | undefined,
    className: "float-left mr-4 my-2",
    containerClass: "h-auto",
  },
};

interface ImageEnhancedTextProps {
  content: string;
  images?: string[];
  block?: boolean; // If true, treats as block-level content
}

/**
 * ImageEnhancedText component that extends MathText to support inline images
 *
 * Usage:
 * - In text: "The diagram [img:1] shows a triangle"
 * - Inline images at mid-sentence are automatically detected
 * - Images at start of line become block-level
 * - Missing images show as "Fig. N" placeholder
 *
 * Example:
 * <ImageEnhancedText
 *   content="Here is a shape: [img:2] and this is data [img:1]"
 *   images={["url1.png", "url2.png"]}
 * />
 */
export function ImageEnhancedText({
  content,
  images = [],
  block = false,
}: ImageEnhancedTextProps) {
  const segments = useMemo(() => {
    // Support the original unnumbered marker as well as [img:N].
    const imagePattern = /\[img(?::(\d+))?\]/g;
    const parts: (
      | { type: "text"; value: string; isStartOfLine: boolean }
      | { type: "image"; index: number; isStartOfLine: boolean }
    )[] = [];

    let lastIndex = 0;
    let match;
    let isStartOfLine = true;

    while ((match = imagePattern.exec(content)) !== null) {
      // Add text before image
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({
          type: "text",
          value: textBefore,
          isStartOfLine,
        });
        isStartOfLine = textBefore.endsWith("\n");
      }

      const imageIndex = match[1]
        ? parseInt(match[1], 10) - 1
        : parts.filter((part) => part.type === "image").length;
      parts.push({
        type: "image",
        index: imageIndex,
        isStartOfLine,
      });

      lastIndex = match.index + match[0].length;
      isStartOfLine = false;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex);
      if (remaining) {
        parts.push({
          type: "text",
          value: remaining,
          isStartOfLine,
        });
      }
    }

    return parts;
  }, [content, images]);

  // No [img:N] patterns found — delegate to MathText (zero overhead for normal text)
  const hasImagePatterns = segments.some((s) => s.type === "image");
  if (!hasImagePatterns) {
    return <MathText content={content} block={block} />;
  }

  return (
    <div className={block ? "" : "inline"}>
      {segments.map((segment, idx) => {
        if (segment.type === "text") {
          return (
            <MathText
              key={`text-${idx}`}
              content={segment.value}
              block={false}
            />
          );
        }

        // Image segment
        const imageUrl = images[segment.index];
        const imageNum = segment.index + 1;
        const isInline = !segment.isStartOfLine;

        if (!imageUrl) {
          // Placeholder for missing image
          return (
            <span
              key={`img-placeholder-${idx}`}
              className="inline-block align-middle mx-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 font-medium"
            >
              [img:{imageNum}]
            </span>
          );
        }

        // Determine layout based on position
        const config = isInline ? IMAGE_CONFIG.inline : IMAGE_CONFIG.block;

        return (
          <div
            key={`img-${idx}`}
            className={`not-prose ${config.className} ${
              isInline ? "" : "my-4"
            }`}
          >
            <ImageWrapper
              src={imageUrl}
              alt={`Figure ${imageNum}`}
              maxWidth={config.maxWidth}
              maxHeight={config.maxHeight}
              index={imageNum}
            />
          </div>
        );
      })}
    </div>
  );
}

interface ImageWrapperProps {
  src: string;
  alt: string;
  maxWidth: string;
  maxHeight?: string;
  index: number;
}

/**
 * Internal component that wraps image rendering with proper sizing
 * Maintains aspect ratio, never stretches
 */
function ImageWrapper({
  src,
  alt,
  maxWidth,
  maxHeight,
  index,
}: ImageWrapperProps) {
  return (
    <figure className="not-prose inline-block">
      <div
        className="relative bg-gray-50 border border-gray-200 rounded-sm overflow-hidden"
        style={{
          maxWidth,
          maxHeight,
        }}
      >
        <img
          src={src}
          alt={alt}
          className="h-auto w-auto object-contain"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          loading="lazy"
        />
      </div>
      <figcaption className="text-xs text-gray-500 mt-1 text-center">
        Fig. {index}
      </figcaption>
    </figure>
  );
}
