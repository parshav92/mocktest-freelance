"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface StorageImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: React.ReactNode;
  priority?: boolean;
}

/**
 * Optimized image component for Supabase Storage images
 * - Uses Next.js Image for optimization
 * - Handles loading and error states
 * - Falls back gracefully on error
 */
export function StorageImage({
  src,
  alt,
  width = 400,
  height = 300,
  className,
  fallback,
  priority = false,
}: StorageImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground text-sm",
          className
        )}
        style={{ width, height }}
      >
        Image not available
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div
          className="absolute inset-0 animate-pulse bg-muted"
          style={{ width, height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        priority={priority}
        // Enable caching
        unoptimized={false}
      />
    </div>
  );
}

/**
 * Question image component with specific sizing
 */
export function QuestionImage({
  src,
  alt = "Question image",
  className,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  return (
    <StorageImage
      src={src}
      alt={alt}
      width={500}
      height={300}
      className={cn("rounded-md", className)}
    />
  );
}

/**
 * Option image component (smaller)
 */
export function OptionImage({
  src,
  alt = "Option image",
  className,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  return (
    <StorageImage
      src={src}
      alt={alt}
      width={200}
      height={150}
      className={cn("rounded-sm", className)}
    />
  );
}

/**
 * Passage image component (full width)
 */
export function PassageImage({
  src,
  alt = "Passage image",
  className,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  return (
    <StorageImage
      src={src}
      alt={alt}
      width={800}
      height={400}
      className={cn("rounded-md w-full", className)}
    />
  );
}
