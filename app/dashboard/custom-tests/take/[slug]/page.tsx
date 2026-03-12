"use client";

import { useParams } from "next/navigation";
import { CustomTestRunner } from "@/components/test/custom-test-runner";

export default function AdminTakeTestPage() {
    const params = useParams();
    const slug = params.slug as string;

    return (
        <CustomTestRunner
            slug={slug}
            backUrl="/dashboard/custom-tests"
            backLabel="Back to Custom Tests"
        />
    );
}
