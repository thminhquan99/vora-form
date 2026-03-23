/**
 * @module @pauly/core
 * @description
 * Public API barrel export for @pauly/core.
 *
 * Registry components import from this package:
 * ```ts
 * import { usePaulyField, useFormCore, PaulyForm } from '@pauly/core';
 * ```
 */

// ── Form Provider ─────────────────────────────────────────────────────────────
export { PaulyForm, useFormContext } from './FormProvider';
export type { PaulyFormProps, FormContextValue } from './FormProvider';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useFormCore } from './useFormCore';
export type { UseFormCoreReturn } from './useFormCore';

export { usePaulyField } from './usePaulyField';
export type { UsePaulyFieldReturn } from './usePaulyField';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  PaulyFieldProps,
  ValidateFunction,
  ValidationErrors,
} from './types';

// ── Store (advanced / testing) ────────────────────────────────────────────────
export { FormStore } from './utils/ref-store';
export type {
  NativeFieldElement,
  Listener,
  SubscriptionTopic,
} from './utils/ref-store';

// ── Validation Adapters ───────────────────────────────────────────────────────
export { createZodAdapter } from './validation/zod-adapter';
export type { ZodLikeSchema } from './validation/zod-adapter';
