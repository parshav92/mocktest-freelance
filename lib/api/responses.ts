import { NextResponse } from "next/server";

export function errorResponse(error: string, status: number = 500) {
  return NextResponse.json({ error }, { status });
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function subscriptionErrorResponse(message: string) {
  return NextResponse.json(
    {
      error: message,
      code: "SUBSCRIPTION_ERROR",
    },
    { status: 403 }
  );
}

export function planLimitErrorResponse(
  message: string,
  extra?: { used?: number; limit?: number | null },
) {
  return NextResponse.json(
    {
      error: message,
      code: "PLAN_LIMIT",
      ...extra,
    },
    { status: 403 },
  );
}

export function featureLockedErrorResponse(
  message: string,
  feature?: string,
) {
  return NextResponse.json(
    {
      error: message,
      code: "FEATURE_LOCKED",
      feature,
    },
    { status: 403 },
  );
}