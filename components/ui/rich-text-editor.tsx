"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension, type AnyExtension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import React, {
    useEffect,
    useRef,
    useMemo,
    Component,
    type ReactNode,
} from "react";
import { cn, countWords } from "@/lib/utils";
import { ESSAY_CONFIG } from "@/lib/config/essay-config";
import {
    Bold,
    Italic,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    Minus,
    Undo2,
    Redo2,
    AlertTriangle,
} from "lucide-react";

// ============================================
// WORD LIMIT EXTENSION
// Intercepts transactions at ProseMirror level
// to block input when word limit is reached
// ============================================

interface WordLimitOptions {
    limit: number;
    countWords: (text: string) => number;
}

const WordLimitExtension = Extension.create<WordLimitOptions>({
    name: "wordLimit",

    addOptions() {
        return {
            limit: ESSAY_CONFIG.wordLimit.default,
            // Use imported countWords for consistent counting
            countWords: countWords,
        };
    },

    addProseMirrorPlugins() {
        const { limit, countWords } = this.options;

        return [
            new Plugin({
                key: new PluginKey("wordLimit"),
                filterTransaction: (transaction, state) => {
                    // Allow non-document changes (selection, marks, etc.)
                    if (!transaction.docChanged) return true;

                    // Get word counts before and after
                    const oldContent = state.doc.textContent;
                    const newContent = transaction.doc.textContent;
                    const oldCount = countWords(oldContent);
                    const newCount = countWords(newContent);

                    // Always allow deletions (reducing word count)
                    if (newCount <= oldCount) return true;

                    // Block additions that exceed the limit
                    if (newCount > limit) return false;

                    return true;
                },
            }),
        ];
    },
});

// ============================================
// TOOLBAR
// ============================================

function ToolbarButton({
    active,
    disabled,
    onClick,
    title,
    children,
}: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault(); // prevent editor blur
                onClick();
            }}
            disabled={disabled}
            title={title}
            className={cn(
                "p-1.5 rounded transition-colors",
                active
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                disabled && "opacity-40 cursor-not-allowed",
            )}
        >
            {children}
        </button>
    );
}

function EditorToolbar({ editor }: { editor: Editor }) {
    const iconSize = "h-4 w-4";

    return (
        <div className="flex items-center gap-0.5 border-b border-slate-200 px-2 py-1.5 bg-slate-50/80 rounded-t-lg flex-wrap">
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Bold"
            >
                <Bold className={iconSize} />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Italic"
            >
                <Italic className={iconSize} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton
                onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                active={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
            >
                <Heading1 className={iconSize} />
            </ToolbarButton>

            <ToolbarButton
                onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                active={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
            >
                <Heading2 className={iconSize} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive("bulletList")}
                title="Bullet list"
            >
                <List className={iconSize} />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive("orderedList")}
                title="Numbered list"
            >
                <ListOrdered className={iconSize} />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Divider"
            >
                <Minus className={iconSize} />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
            >
                <Undo2 className={iconSize} />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
            >
                <Redo2 className={iconSize} />
            </ToolbarButton>
        </div>
    );
}

// ============================================
// RICH TEXT EDITOR
// ============================================

export interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    height?: number;
    className?: string;
    disabled?: boolean;
    /** Word limit - enforced at transaction level */
    wordLimit?: number;
    /** Unique key to force editor remount (e.g., question ID) */
    editorKey?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Start writing...",
    height = 350,
    className,
    disabled = false,
    wordLimit,
    editorKey,
}: RichTextEditorProps) {
    // Track the last external value to detect external changes
    const lastExternalValue = useRef<string>(value);
    const isInternalUpdate = useRef(false);

    // Memoize extensions to prevent recreation on every render
    const extensions = useMemo(() => {
        const exts: AnyExtension[] = [
            StarterKit.configure({
                heading: { levels: [1, 2] },
            }),
            Placeholder.configure({ placeholder }),
        ];

        // Add word limit extension if specified
        if (wordLimit && wordLimit > 0) {
            exts.push(
                WordLimitExtension.configure({
                    limit: wordLimit,
                    countWords,
                }),
            );
        }

        return exts;
    }, [placeholder, wordLimit]);

    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions,
            content: value,
            editable: !disabled,
            onUpdate: ({ editor }) => {
                isInternalUpdate.current = true;
                const html = editor.getHTML();
                lastExternalValue.current = html;
                onChange(html);
            },
            editorProps: {
                attributes: {
                    class: "prose prose-sm prose-slate max-w-none focus:outline-none px-4 py-3",
                    style: `min-height: ${height - 50}px`,
                },
            },
        },
        [editorKey],
    ); // Re-create editor when editorKey changes

    // Sync external value changes (e.g., when question changes or answer restored)
    useEffect(() => {
        if (!editor) return;

        // Skip if this is our own update
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        // Only update if the external value is different from what we last knew
        if (value !== lastExternalValue.current) {
            lastExternalValue.current = value;
            // Use setContent to update without triggering onUpdate
            editor.commands.setContent(value || "", { emitUpdate: false });
        }
    }, [editor, value]);

    // Sync editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled);
        }
    }, [editor, disabled]);

    if (!editor) return null;

    return (
        <div
            className={cn(
                "border border-slate-200 rounded-lg overflow-hidden bg-white",
                className,
            )}
        >
            {!disabled && <EditorToolbar editor={editor} />}
            <div className="overflow-y-auto" style={{ maxHeight: height }}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

// ============================================
// READ-ONLY RICH TEXT VIEWER
// ============================================

export interface RichTextViewerProps {
    content: string;
    className?: string;
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [StarterKit.configure({ heading: { levels: [1, 2] } })],
        content,
        editable: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm prose-slate max-w-none",
            },
        },
    });

    // Sync content if it changes
    useEffect(() => {
        if (editor && content) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [editor, content]);

    if (!editor) return null;

    return (
        <div className={cn("rich-text-viewer", className)}>
            <EditorContent editor={editor} />
        </div>
    );
}

// ============================================
// ERROR BOUNDARY FOR EDITOR
// ============================================

interface EditorErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class EditorErrorBoundary extends Component<
    { children: ReactNode; height?: number },
    EditorErrorBoundaryState
> {
    constructor(props: { children: ReactNode; height?: number }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("RichTextEditor error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    className="border border-red-200 rounded-lg bg-red-50 p-4 flex flex-col items-center justify-center text-center"
                    style={{ minHeight: this.props.height || 200 }}
                >
                    <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
                    <p className="text-sm font-medium text-red-700">
                        Editor failed to load
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                        Please refresh the page. Your previous answers are
                        saved.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

// ============================================
// WRAPPED EXPORTS WITH ERROR BOUNDARY
// ============================================

export function SafeRichTextEditor(props: RichTextEditorProps) {
    return (
        <EditorErrorBoundary height={props.height}>
            <RichTextEditor {...props} />
        </EditorErrorBoundary>
    );
}
