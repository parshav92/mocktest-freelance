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