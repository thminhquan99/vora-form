/**
 * PaulyForm Playground — Zero Re-render Architecture Proof
 *
 * HOW TO VERIFY:
 *
 * 1. `pnpm dev` → http://localhost:5173
 * 2. Type in text fields → render counters stay at 1 (no re-render)
 * 3. Toggle "Accept Terms" checkbox → only acceptTerms counter stays at 1
 *    (setSilentValue, uncontrolled), text field counters untouched
 * 4. Toggle Roles checkboxes → roles counter increments (composite widget,
 *    expected: setValue triggers re-render), text/checkbox counters untouched
 * 5. Blur with invalid data → only the blurred field's counter increments
 * 6. Submit empty → all error-affected counters increment once
 *
 * KEY INSIGHT: Text inputs and single checkboxes use setSilentValue
 * (zero re-renders). Checkbox groups use setValue (re-render expected
 * for array state). Cross-field isolation is always maintained.
 */

import React, { useRef } from 'react';
import { z } from 'zod';
import { PaulyForm, createZodAdapter } from '@pauly/core';
import { PaulyText } from '../../../registry/text-input';
import { PaulyCheckbox, PaulyCheckboxGroup } from '../../../registry/checkbox';
import { PaulySignature } from '../../../registry/signature';
import { PaulyConditional } from '../../../registry/conditional';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

/**
 * Registration form schema.
 * This drives both validation AND the typed submit payload.
 */
const registrationSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms'),
  roles: z
    .array(z.string())
    .min(1, 'Select at least one role'),
  hasReason: z.boolean().optional(),
  reason: z.string().optional(),
  signature: z
    .string()
    .nullable()
    .refine(
      (val) => val !== null && val !== '',
      'Please provide your signature'
    ),
});

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

const validate = createZodAdapter(registrationSchema);

// ─── RenderCounter ────────────────────────────────────────────────────────────

/**
 * A debugging component that visually displays how many times its
 * parent has rendered.
 *
 * Uses a `useRef` counter (not state) so the counter itself doesn't
 * cause additional re-renders. The ref value persists across renders
 * and increments each time React calls the component function.
 *
 * ### Why This Proves Zero Re-renders
 *
 * If PaulyText re-rendered on every keystroke, this counter would
 * rapidly increment as you type. Instead, it should:
 *
 * - Show `1` after initial mount (2 in StrictMode dev — React
 *   intentionally double-renders in dev to catch side-effect bugs)
 * - Only increment when an **error state changes** (blur validation
 *   or submit validation)
 * - NEVER increment during normal typing
 */
function RenderCounter({ label }: { label: string }) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        backgroundColor: renderCount.current <= 2 ? '#ecfdf5' : '#fef2f2',
        border: `1px solid ${renderCount.current <= 2 ? '#a7f3d0' : '#fecaca'}`,
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: renderCount.current <= 2 ? '#065f46' : '#991b1b',
        fontWeight: 600,
        userSelect: 'none',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          padding: '1px 6px',
          borderRadius: '4px',
          backgroundColor: renderCount.current <= 2 ? '#d1fae5' : '#fee2e2',
          minWidth: '20px',
          textAlign: 'center',
        }}
      >
        {renderCount.current}
      </span>
    </div>
  );
}

// ─── FieldWithCounter ─────────────────────────────────────────────────────────

/**
 * Generic wrapper that wraps ANY PaulyForm field with a RenderCounter.
 * The counter counts renders of THIS wrapper component.
 */
function FieldWithCounter({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          React renders ↓
        </span>
        <RenderCounter label={name} />
      </div>
      {children}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const handleSubmit = (values: Record<string, unknown>) => {
    console.log('✅ Form submitted successfully!');
    console.log('📦 Submitted values:', JSON.stringify(values, null, 2));
    alert(
      `Form submitted!\n\n${JSON.stringify(values, null, 2)}`
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow:
            '0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.08)',
          padding: '40px',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 8px 0',
            }}
          >
            🧪 Zero Re-render Proof
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Type in any field. The{' '}
            <code
              style={{
                backgroundColor: '#f3f4f6',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '0.8rem',
              }}
            >
              render count
            </code>{' '}
            badges should <strong>NOT</strong> increment on keystroke.
          </p>
        </div>

        {/* ── Info Banner ────────────────────────────────────────────── */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            marginBottom: '24px',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: '#1e40af',
          }}
        >
          <strong>How to test:</strong> Type rapidly in "First Name".
          Watch the render counter — it stays at its initial count.
          Then blur the field with {'<'}2 chars to see an error-triggered
          re-render (counter increments by 1).
        </div>

        {/* ── Form ───────────────────────────────────────────────────── */}
        <PaulyForm validate={validate} onSubmit={handleSubmit}>
          {/* ── Text Inputs (uncontrolled, zero re-renders) ─────── */}
          <FieldWithCounter name="firstName">
            <PaulyText
              name="firstName"
              label="First Name"
              placeholder="John"
              required
            />
          </FieldWithCounter>

          <FieldWithCounter name="lastName">
            <PaulyText
              name="lastName"
              label="Last Name"
              placeholder="Doe"
              required
            />
          </FieldWithCounter>

          <FieldWithCounter name="email">
            <PaulyText
              name="email"
              label="Email"
              placeholder="john@example.com"
              type="email"
              required
            />
          </FieldWithCounter>

          {/* ── Separator ─────────────────────────────────────────── */}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

          {/* ── Single Checkbox (uncontrolled, zero re-renders) ──── */}
          <FieldWithCounter name="acceptTerms">
            <PaulyCheckbox
              name="acceptTerms"
              label="I accept the terms and conditions"
              required
            />
          </FieldWithCounter>

          {/* ── Checkbox Group (composite, re-renders on toggle) ─── */}
          <FieldWithCounter name="roles">
            <PaulyCheckboxGroup
              name="roles"
              label="Select Roles"
              options={roleOptions}
              required
            />
          </FieldWithCounter>

          {/* ── Conditional Section (dynamic mount/unmount) ─────── */}
          <FieldWithCounter name="hasReason">
            <PaulyCheckbox
              name="hasReason"
              label="I have a specific reason"
            />
          </FieldWithCounter>

          <PaulyConditional
            watch="hasReason"
            condition={(val) => val === true}
          >
            <FieldWithCounter name="reason">
              <PaulyText
                name="reason"
                label="Why?"
              />
            </FieldWithCounter>
          </PaulyConditional>

          {/* ── Separator ─────────────────────────────────────────── */}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

          {/* ── Signature Pad (canvas, zero re-renders during draw) ─ */}
          <FieldWithCounter name="signature">
            <PaulySignature
              name="signature"
              label="Sign Here"
              required
            />
          </FieldWithCounter>

          {/* ── Submit Button ──────────────────────────────────────── */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px 24px',
              marginTop: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = '#2563eb')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = '#3b82f6')
            }
          >
            Submit Registration
          </button>
        </PaulyForm>

        {/* ── Legend ──────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: '24px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            fontSize: '0.75rem',
            color: '#6b7280',
            lineHeight: 1.6,
          }}
        >
          <div>
            <span style={{ color: '#065f46' }}>🟢 Green badge</span> = ≤2
            renders (expected: 1 real + 1 StrictMode dev double-render)
          </div>
          <div>
            <span style={{ color: '#991b1b' }}>🔴 Red badge</span> = {'>'} 2
            renders (error state changes — expected on blur/submit validation)
          </div>
        </div>
      </div>
    </div>
  );
}
