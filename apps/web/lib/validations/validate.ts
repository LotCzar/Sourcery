import { z } from "zod";
import { NextResponse } from "next/server";

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationError = {
  success: false;
  response: NextResponse;
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
