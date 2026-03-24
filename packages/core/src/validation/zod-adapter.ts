/**
 * @module zod-adapter
 * @description
 * Adapter that converts a Zod schema into VoraForm's `ValidateFunction`
 * contract.
 *
 * ### Design Intent
 *
 * VoraForm's validation engine is **schema-agnostic**. The core only knows
 * about `ValidateFunction`:
 *
 * ```ts
 * type ValidateFunction = (values: Record<string, unknown>) => Record<string, string>;
 * ```
 *
 * This adapter bridges Zod → `ValidateFunction`. Future adapters (Yup,
 * Superstruct, custom) can follow the same pattern.
 *
 * ### Current Status
 *
 * This is a **skeleton** — the basic function signature and Zod parsing
 * contract are defined. The full implementation (nested object flattening,
 * array path mapping, i18n error messages) will be fleshed out in a later
 * phase.
 */

import type { ValidateFunction, ValidationErrors } from '../types';

// ─── Zod Type Placeholder ─────────────────────────────────────────────────────

/**
 * Minimal Zod schema shape — just enough to call `.safeParse()`.
 *
 * We define this locally instead of importing `zod` to avoid adding Zod
 * as a hard dependency of `@vora/core`. Zod is a **peer dependency** —
 * the developer's project provides it.
 *
 * This interface matches `z.ZodType<any>` without importing the library.
 */
export interface ZodLikeSchema {
  safeParse(data: unknown): {
    success: boolean;
    error?: {
      issues: Array<{
        path: Array<string | number>;
        message: string;
      }>;
    };
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Creates a `ValidateFunction` from a Zod schema.
 *
 * ### How it works
 *
 * 1. Calls `schema.safeParse(values)` with the full form values object.
 * 2. If validation passes, returns an empty `{}` (no errors).
 * 3. If validation fails, maps each Zod issue to a flat
 *    `{ [fieldPath]: errorMessage }` object using the issue's `path` array
 *    joined with `"."`.
 *
 * ### Path Flattening
 *
 * Zod issues provide `path` as an array like `["address", "city"]`.
 * We join these with `"."` to produce `"address.city"`, which matches
 * VoraForm's dot-notation field paths.
 *
 * @param schema - A Zod schema (e.g., `z.object({ email: z.string().email() })`)
 * @returns A `ValidateFunction` compatible with `<VoraForm validate={…}>`
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { createZodAdapter } from '@vora/core';
 *
 * const schema = z.object({
 *   email: z.string().email('Invalid email'),
 *   age: z.number().min(18, 'Must be 18+'),
 * });
 *
 * const validate = createZodAdapter(schema);
 *
 * // In the form:
 * <VoraForm validate={validate} onSubmit={handleSubmit}>
 *   ...
 * </VoraForm>
 * ```
 */
export function createZodAdapter(schema: ZodLikeSchema): ValidateFunction {
  return (values: Record<string, unknown>): ValidationErrors => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {};
    }

    const errors: ValidationErrors = {};

    if (result.error) {
      for (const issue of result.error.issues) {
        // Join path segments: ["address", "city"] → "address.city"
        // For root-level fields: ["email"] → "email"
        const fieldPath = issue.path.join('.');

        // Only keep the first error per field — consistent with
        // "show one error at a time" UX pattern.
        if (fieldPath && !(fieldPath in errors)) {
          errors[fieldPath] = issue.message;
        }
      }
    }

    return errors;
  };
}
