/**
 * @module @vora/core
 * @description
 * Public API barrel export for @vora/core.
 *
 * Registry components import from this package:
 * ```ts
 * import { useVoraField, useFormCore, VoraForm } from '@vora/core';
 * ```
 */

// ── Form Provider ─────────────────────────────────────────────────────────────
export { VoraForm, useFormContext } from './FormProvider';
export type { VoraFormProps, FormContextValue } from './FormProvider';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useFormCore } from './useFormCore';
export type { UseFormCoreReturn } from './useFormCore';

export { useVoraField } from './useVoraField';
export type { UseVRFieldReturn } from './useVoraField';

export { useAsyncValidation } from './useAsyncValidation';
export { useInitialSnapshot } from './hooks/useInitialSnapshot';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  VRFieldProps,
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
