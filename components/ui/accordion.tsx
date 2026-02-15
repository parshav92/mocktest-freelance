"use client";

import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Accordion({
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
    return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
    className,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
    return (
        <AccordionPrimitive.Item
            data-slot="accordion-item"
            className={cn(
                "border-b border-slate-200 last:border-b-0",
                className,
            )}
            {...props}
        />
    );
}

function AccordionTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    "group focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-md py-5 text-left text-base font-medium text-slate-900 transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
                    className,
                )}
                {...props}
            >
                {children}
                <span className="relative flex items-center justify-center w-6 h-6 transition-transform duration-200 group-hover:translate-x-1">
                    <span className="italic font-serif text-xl text-slate-500 group-hover:text-sky-600 transition-colors [.group[data-state=open]_&]:hidden">
                        +
                    </span>
                    <span className="italic font-serif text-xl text-slate-500 group-hover:text-sky-600 transition-colors hidden [.group[data-state=open]_&]:inline">
                        −
                    </span>
                </span>
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
}

function AccordionContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
    return (
        <AccordionPrimitive.Content
            data-slot="accordion-content"
            className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm text-slate-600"
            {...props}
        >
            <div className={cn("pt-0 pb-5", className)}>{children}</div>
        </AccordionPrimitive.Content>
    );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
