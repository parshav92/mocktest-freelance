"use client";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

interface SortableQuestionListProps<T extends { id: string }> {
    items: T[];
    onReorder: (items: T[]) => void;
    onRemove: (id: string) => void;
    renderDetails: (item: T, index: number) => ReactNode;
}

function SortableRow<T extends { id: string }>({
    item,
    index,
    onRemove,
    renderDetails,
}: {
    item: T;
    index: number;
    onRemove: (id: string) => void;
    renderDetails: (item: T, index: number) => ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 rounded-xl border border-slate-200/70 bg-zinc-50 px-4 py-3 ${
                isDragging ? "opacity-60 shadow-md z-10" : ""
            }`}
        >
            <button
                type="button"
                className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-700 touch-none"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono text-zinc-400 w-6 text-center shrink-0">
                {index + 1}
            </span>
            <div className="flex-1 min-w-0">{renderDetails(item, index)}</div>
            <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

export function SortableQuestionList<T extends { id: string }>({
    items,
    onReorder,
    onRemove,
    renderDetails,
}: SortableQuestionListProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        onReorder(arrayMove(items, oldIndex, newIndex));
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <SortableRow
                            key={item.id}
                            item={item}
                            index={index}
                            onRemove={onRemove}
                            renderDetails={renderDetails}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
