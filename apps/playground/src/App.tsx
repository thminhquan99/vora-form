/**
 * VoraForm Playground — Zero Re-render Architecture Proof
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

import React, { useRef, useState } from 'react';
import { z } from 'zod';
import { VoraForm, createZodAdapter, useAsyncValidation, useFormCore, useVoraField } from '@vora/core';
import { VRText } from '../../../registry/text-input';
import { VRTextarea } from '../../../registry/textarea';
import { VRSelect } from '../../../registry/select';
import { VRRadioGroup } from '../../../registry/radio';
import { VRCheckbox, VRCheckboxGroup } from '../../../registry/checkbox';
import { VRSignature } from '../../../registry/signature';
import { VRConditional } from '../../../registry/conditional';
import { VRCamera } from '../../../registry/camera';
import { VRQRScanner } from '../../../registry/qr-scanner';
import {
  VRTable,
  VRTableRow,
  VRTableCell,
  useVoraTable,
} from '../../../registry/table';
import { VRSwitch } from '../../../registry/switch';
import { VRDropzone } from '../../../registry/dropzone';
import { VRCombobox } from '../../../registry/combobox';
import { VRMaskedInput } from '../../../registry/masked-input';
import { VRDatePicker } from '../../../registry/datepicker';
import { VRSlider } from '../../../registry/slider';
import { VROTPInput } from '../../../registry/otp';
import { VRRating } from '../../../registry/rating';
import { VRTagInput } from '../../../registry/tag-input';
import { VRPasswordInput } from '../../../registry/password-input';
import { VRTransferList } from '../../../registry/transfer-list';
import { VRKeyValue } from '../../../registry/key-value';
import { VRTreeSelect } from '../../../registry/tree-select';
import { VRCreditCard } from '../../../registry/credit-card';
import { VRMentions } from '../../../registry/mentions';
import { VRWidgetBuilder } from '../../../registry/widget-builder';
import { VRCodeEditor } from '../../../registry/code-editor';
import { VRPatternLock } from '../../../registry/pattern-lock';
import { VRCoordinatePicker } from '../../../registry/coordinate-picker';
import { VRImageCropper } from '../../../registry/image-cropper';
import { VRSpreadsheet } from '../../../registry/spreadsheet';
import { VRFormula } from '../../../registry/formula';
import { VRNodeGraph } from '../../../registry/node-graph';
import { VRSeatingChart } from '../../../registry/seating-chart';
import { VRGanttTimeline } from '../../../registry/gantt-timeline';

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
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  country: z.string().min(1, 'Please select a country'),
  city: z.string().min(1, 'Please select a city'),
  plan: z.enum(['free', 'pro', 'enterprise'], {
    errorMap: () => ({ message: 'Please select a plan' }),
  }),
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
  avatar: z.string().nullable().optional(),
  promoCodeQR: z.string().nullable().optional(),
  workExperience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
      })
    )
    .optional(),
  marketingEmails: z.boolean().default(false),
  portfolioFiles: z
    .array(
      z.custom<File>((v) => v instanceof File, 'Invalid file')
    )
    .optional(),
  timezone: z.string().min(1, 'Please select a timezone'),
  expectedSalary: z.string().min(1, 'Salary is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  skills: z.array(z.string()).min(1, 'Add at least one skill').optional(),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(
      (val) =>
        new Date(val) <=
        new Date(new Date().setFullYear(new Date().getFullYear() - 18)),
      'Must be at least 18 years old'
    ),
  satisfaction: z.number().min(0).max(100).default(50),
  otpCode: z.string().length(6, 'Must be exactly 6 digits').optional(),
  appRating: z.number().min(1, 'Please rate us').max(5).optional(),
  permissions: z.array(z.string()).optional(),
  envVars: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  productCategories: z.array(z.string()).optional(),
  creditCard: z.string().optional(),
  feedback: z.string().optional(),
  customLayout: z.any().optional(),
  customJsonConfig: z.string().optional(),
  securityPattern: z.array(z.number()).optional(),
  deliveryLocation: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  profileCroppedPicture: z.object({
    originalUrl: z.string(),
    zoom: z.number(),
    crop: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
  }).nullable().optional(),
  financialData: z.array(z.array(z.string())).optional(),
  emailTemplate: z.string().optional(),
  workflow: z.any().optional(),
  seats: z.array(z.string()).optional(),
  projectTimeline: z.any().optional(),
});

const categoryTreeOptions = [
  {
    label: 'Clothing',
    value: 'clothing',
    children: [
      { label: 'Mens', value: 'mens' },
      { label: 'Womens', value: 'womens' },
      { label: 'Kids', value: 'kids' },
    ],
  },
  {
    label: 'Electronics',
    value: 'electronics',
    children: [
      { label: 'Phones', value: 'phones' },
      { label: 'Laptops', value: 'laptops' },
    ],
  },
];

const mentionUsers = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
  { id: '4', name: 'David' },
];

const permissionOptions = [
  { label: 'Read Users', value: 'users:read' },
  { label: 'Write Users', value: 'users:write' },
  { label: 'Admin Billing', value: 'billing:admin' },
  { label: 'View Reports', value: 'reports:view' },
  { label: 'Manage Roles', value: 'roles:manage' },
  { label: 'Delete Projects', value: 'projects:delete' },
  { label: 'Create Projects', value: 'projects:create' },
];

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

const mockVariables = [
  { label: 'First Name', value: 'firstName' },
  { label: 'Company', value: 'company' }
];

const theaterMapSVG = `
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <!-- Stage -->
  <rect x="50" y="20" width="300" height="40" fill="#cbd5e1" rx="8" />
  <text x="200" y="45" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#475569">STAGE</text>
  
  <!-- Row A -->
  <circle cx="100" cy="120" r="15" fill="#e2e8f0" class="seat" data-seat-id="A1" />
  <circle cx="150" cy="120" r="15" fill="#e2e8f0" class="seat" data-seat-id="A2" />
  <circle cx="200" cy="120" r="15" fill="#e2e8f0" class="seat" data-seat-id="A3" />
  <circle cx="250" cy="120" r="15" fill="#e2e8f0" class="seat" data-seat-id="A4" />
  <circle cx="300" cy="120" r="15" fill="#e2e8f0" class="seat" data-seat-id="A5" />

  <!-- Row B -->
  <circle cx="100" cy="170" r="15" fill="#e2e8f0" class="seat" data-seat-id="B1" />
  <circle cx="150" cy="170" r="15" fill="#e2e8f0" class="seat" data-seat-id="B2" />
  <circle cx="200" cy="170" r="15" fill="#e2e8f0" class="seat" data-seat-id="B3" />
  <circle cx="250" cy="170" r="15" fill="#e2e8f0" class="seat" data-seat-id="B4" />
  <circle cx="300" cy="170" r="15" fill="#e2e8f0" class="seat" data-seat-id="B5" />
</svg>
`;

const validate = createZodAdapter(registrationSchema);

// ─── Currency Formatter ───────────────────────────────────────────────────────

/**
 * Strips non-digit characters, then inserts commas for thousands grouping.
 * 1000000 → 1,000,000
 */
const formatCurrency = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// ─── Cascading Data ───────────────────────────────────────────────────────────

const countryOptions = [
  { label: 'USA', value: 'us' },
  { label: 'Vietnam', value: 'vn' },
  { label: 'UK', value: 'uk' },
];

const citiesByCountry: Record<string, { label: string; value: string }[]> = {
  us: [
    { label: 'New York', value: 'ny' },
    { label: 'Los Angeles', value: 'la' },
  ],
  vn: [
    { label: 'Hanoi', value: 'hn' },
    { label: 'Ho Chi Minh', value: 'hcm' },
  ],
  uk: [
    { label: 'London', value: 'ldn' },
    { label: 'Manchester', value: 'man' },
  ],
};

// ─── RenderCounter ────────────────────────────────────────────────────────────
const planOptions = [
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Enterprise', value: 'enterprise' },
];

const timezoneOptions = [
  { label: 'America/New_York (EST)', value: 'America/New_York' },
  { label: 'America/Chicago (CST)', value: 'America/Chicago' },
  { label: 'America/Denver (MST)', value: 'America/Denver' },
  { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
  { label: 'America/Sao_Paulo (BRT)', value: 'America/Sao_Paulo' },
  { label: 'Europe/London (GMT)', value: 'Europe/London' },
  { label: 'Europe/Berlin (CET)', value: 'Europe/Berlin' },
  { label: 'Europe/Moscow (MSK)', value: 'Europe/Moscow' },
  { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Asia/Shanghai (CST)', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Asia/Ho_Chi_Minh (ICT)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'Australia/Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'Pacific/Auckland (NZST)', value: 'Pacific/Auckland' },
];

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
 * If VRText re-rendered on every keystroke, this counter would
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
 * Generic wrapper that wraps ANY VoraForm field with a RenderCounter.
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

// ─── Username Field (async validation demo) ──────────────────────────────────

/**
 * Wrapper component that demonstrates `useAsyncValidation`.
 *
 * MUST be rendered inside a `<VoraForm>` because the hook calls
 * `useFormContext()`. The hook subscribes directly to the store's
 * pub/sub — typing does NOT trigger React re-renders. Only when the
 * debounced validator sets/clears an error does the error subscriber
 * (`<VRFieldError>`) re-render.
 */
function UsernameField() {
  useAsyncValidation<string>(
    'username',
    async (val) => {
      if (!val || val.length < 3) return undefined;
      // Mock API call — simulate network latency
      await new Promise((r) => setTimeout(r, 400));
      if (val.toLowerCase() === 'admin' || val.toLowerCase() === 'root') {
        return 'This username is already taken.';
      }
      return undefined;
    },
    600
  );

  return (
    <VRText
      name="username"
      label="Username"
      placeholder="Pick a username"
      required
    />
  );
}

// ─── CountryCityGroup (cascading dependent fields) ────────────────────────────

/**
 * Demonstrates how to handle cascading dropdowns (Country → City)
 * under the zero-re-render architecture.
 *
 * ### How It Works
 *
 * 1. `useVoraField<string>('country')` subscribes to the country value.
 *    When the user picks a country, ONLY this component re-renders — not
 *    the text fields above or the checkboxes below.
 *
 * 2. `useFormCore().setValue('city', '')` programmatically clears the
 *    child field whenever the parent changes, via a `useEffect`.
 *
 * 3. The City `<VRSelect>` receives its options from `citiesByCountry`
 *    based on the current country value. If no country is selected,
 *    the city dropdown is disabled.
 *
 * ### Re-render Contract
 *
 * | Event                      | Country counter | City counter | Siblings |
 * |---------------------------|----------------|-------------|----------|
 * | Select a country           | +1 (value sub) | +1 (cleared) | 0        |
 * | Select a city              | 0              | 0 (silent)   | 0        |
 * | Type in firstName/email    | 0              | 0            | 0        |
 */
function CountryCityGroup() {
  const countryField = useVoraField<string>('country');
  const { setValue } = useFormCore();

  // Track the previous country so we can detect actual changes vs initial mount
  const prevCountryRef = React.useRef<string | undefined>(countryField.value);

  // When country changes, clear the city selection
  React.useEffect(() => {
    if (prevCountryRef.current !== countryField.value) {
      // Only clear city if country actually changed (not on initial mount)
      if (prevCountryRef.current !== undefined) {
        setValue('city', '');
      }
      prevCountryRef.current = countryField.value;
    }
  }, [countryField.value, setValue]);

  const cityOptions = countryField.value
    ? citiesByCountry[countryField.value] ?? []
    : [];

  return (
    <>
      <FieldWithCounter name="country">
        <VRSelect
          name="country"
          label="Country"
          placeholder="Select a country..."
          options={countryOptions}
          required
        />
      </FieldWithCounter>

      <FieldWithCounter name="city">
        <VRSelect
          name="city"
          label="City"
          placeholder={
            countryField.value
              ? 'Select a city...'
              : 'Select a country first'
          }
          options={cityOptions}
          disabled={!countryField.value}
          required
        />
      </FieldWithCounter>
    </>
  );
}

// ─── Work Experience Table ────────────────────────────────────────────────────

/**
 * Demonstrates the VRTable composition pattern for array editing.
 *
 * Typing in Row 1's Company does NOT re-render Row 2's Role.
 * Only append/remove triggers the table wrapper re-render.
 */
function WorkExperienceTable() {
  const { append, remove, rowCount } = useVoraTable('workExperience');

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          Work Experience
        </span>
        <button
          type="button"
          onClick={() => append({ company: '', role: '' })}
          style={{
            padding: '4px 12px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#059669',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          + Add Job
        </button>
      </div>

      {rowCount > 0 ? (
        <VRTable name="workExperience" columns={['Company', 'Role', '']}>
          {Array.from({ length: rowCount }).map((_, i) => (
            <VRTableRow key={i} index={i}>
              <VRTableCell field="company">
                {(path) => (
                  <FieldWithCounter name={path}>
                    <VRText name={path} label="" placeholder="Company" />
                  </FieldWithCounter>
                )}
              </VRTableCell>
              <VRTableCell field="role">
                {(path) => (
                  <FieldWithCounter name={path}>
                    <VRText name={path} label="" placeholder="Role" />
                  </FieldWithCounter>
                )}
              </VRTableCell>
              <VRTableCell field="_actions">
                {() => (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.8125rem',
                      color: '#ef4444',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✕ Remove
                  </button>
                )}
              </VRTableCell>
            </VRTableRow>
          ))}
        </VRTable>
      ) : (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '0.875rem',
            border: '1.5px dashed #d1d5db',
            borderRadius: '8px',
          }}
        >
          No work experience added yet.
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState(1);

  const handleSubmit = (values: Record<string, unknown>, store: import('@vora/core').FormStore) => {
    const dirtyValues = store.getDirtyValues();
    console.log('✅ Form submitted successfully!');
    console.log('📦 All values:', values);
    console.log('✨ Dirty values (changed only):', dirtyValues);
    alert(
      `Form submitted!\n\nDirty Values (changed from initial):\n${JSON.stringify(dirtyValues, null, 2)}`
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

        {/* ── Step Indicator ──────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  backgroundColor: step >= s ? '#3b82f6' : '#e5e7eb',
                  color: step >= s ? '#fff' : '#9ca3af',
                  transition: 'all 0.2s ease',
                }}
              >
                {s}
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: step === s ? 600 : 400,
                  color: step === s ? '#111827' : '#9ca3af',
                }}
              >
                {s === 1 ? 'Personal Info' : 'Preferences'}
              </span>
              {s < 2 && (
                <div
                  style={{
                    width: 40,
                    height: 2,
                    backgroundColor: step > 1 ? '#3b82f6' : '#e5e7eb',
                    transition: 'background-color 0.2s ease',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Form ───────────────────────────────────────────────────── */}
        <VoraForm
          validate={validate}
          onSubmit={handleSubmit}
          initialValues={{
            profileCroppedPicture: {
              originalUrl: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=800&q=80',
              zoom: 1,
              crop: { x: 50, y: 50, width: 200, height: 200 }
            }
          }}
        >
          {/* ══════════════ STEP 1: Personal Info ══════════════ */}
          {step === 1 && (
            <>
              <FieldWithCounter name="firstName">
                <VRText
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="lastName">
                <VRText
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="username">
                <UsernameField />
              </FieldWithCounter>

              <FieldWithCounter name="email">
                <VRText
                  name="email"
                  label="Email"
                  placeholder="john@example.com"
                  type="email"
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="password">
                <VRPasswordInput
                  name="password"
                  label="Password"
                  showStrengthMeter
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="skills">
                <VRTagInput
                  name="skills"
                  label="Skills"
                  placeholder="Type a skill and press Enter"
                />
              </FieldWithCounter>

              <FieldWithCounter name="dateOfBirth">
                <VRDatePicker
                  name="dateOfBirth"
                  label="Date of Birth"
                  max="2008-01-01"
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="bio">
                <VRTextarea
                  name="bio"
                  label="Biography"
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </FieldWithCounter>

              <FieldWithCounter name="expectedSalary">
                <VRMaskedInput
                  name="expectedSalary"
                  label="Expected Salary (VND)"
                  formatter={formatCurrency}
                  placeholder="e.g. 10,000,000"
                  required
                />
              </FieldWithCounter>

              <CountryCityGroup />

              <FieldWithCounter name="timezone">
                <VRCombobox
                  name="timezone"
                  label="Timezone"
                  options={timezoneOptions}
                  placeholder="Select timezone..."
                  searchPlaceholder="Search timezones..."
                  emptyText="No timezone found."
                  required
                />
              </FieldWithCounter>
            </>
          )}

          {/* ══════════════ STEP 2: Preferences ══════════════ */}
          {step === 2 && (
            <>
              {/* ── Satisfaction Slider ─────────────────────────── */}
              <FieldWithCounter name="satisfaction">
                <VRSlider
                  name="satisfaction"
                  label="Expected Satisfaction (0–100)"
                  min={0}
                  max={100}
                  step={1}
                />
              </FieldWithCounter>

              {/* ── OTP Input ─────────────────────────────────── */}
              <FieldWithCounter name="otpCode">
                <VROTPInput
                  name="otpCode"
                  label="Verification Code (OTP)"
                  length={6}
                />
              </FieldWithCounter>

              {/* ── Star Rating ───────────────────────────────── */}
              <FieldWithCounter name="appRating">
                <VRRating
                  name="appRating"
                  label="Rate our App"
                  max={5}
                />
              </FieldWithCounter>
              <FieldWithCounter name="plan">
                <VRRadioGroup
                  name="plan"
                  label="Subscription Plan"
                  options={[
                    { label: 'Free', value: 'free' },
                    { label: 'Pro', value: 'pro' },
                    { label: 'Enterprise', value: 'enterprise' },
                  ]}
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="permissions">
                <VRTransferList
                  name="permissions"
                  label="Assign Permissions"
                  options={permissionOptions}
                />
              </FieldWithCounter>

              <FieldWithCounter name="envVars">
                <VRKeyValue
                  name="envVars"
                  label="Environment Variables"
                />
              </FieldWithCounter>

              <FieldWithCounter name="productCategories">
                <VRTreeSelect
                  name="productCategories"
                  label="Product Categories"
                  data={categoryTreeOptions}
                />
              </FieldWithCounter>

              <FieldWithCounter name="creditCard">
                <VRCreditCard
                  name="creditCard"
                  label="Payment Method"
                />
              </FieldWithCounter>

              <FieldWithCounter name="feedback">
                <VRMentions
                  name="feedback"
                  label="Feedback with @mentions"
                  users={mentionUsers}
                />
              </FieldWithCounter>

              <FieldWithCounter name="customLayout">
                <VRWidgetBuilder
                  name="customLayout"
                  label="Custom Dashboard Layout"
                />
              </FieldWithCounter>

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

              <FieldWithCounter name="customJsonConfig">
                <VRCodeEditor
                  name="customJsonConfig"
                  label="JSON Configuration"
                  language="json"
                  placeholder='{\n  "autosave": true\n}'
                />
              </FieldWithCounter>

              <FieldWithCounter name="securityPattern">
                <VRPatternLock
                  name="securityPattern"
                  label="App Security Pattern"
                />
              </FieldWithCounter>

              <FieldWithCounter name="deliveryLocation">
                <VRCoordinatePicker
                  name="deliveryLocation"
                  label="Pin Delivery Location"
                />
              </FieldWithCounter>

              <FieldWithCounter name="profileCroppedPicture">
                <VRImageCropper
                  name="profileCroppedPicture"
                  label="Profile Picture (Crop & Zoom)"
                  aspectRatio={1}
                />
              </FieldWithCounter>

              <FieldWithCounter name="financialData">
                <VRSpreadsheet
                  name="financialData"
                  label="Financial Projections (Paste from Excel)"
                  rows={5}
                  cols={4}
                />
              </FieldWithCounter>

              <FieldWithCounter name="emailTemplate">
                <VRFormula
                  name="emailTemplate"
                  label="Automated Email Subject"
                  variables={mockVariables}
                />
              </FieldWithCounter>

              <FieldWithCounter name="workflow">
                <VRNodeGraph
                  name="workflow"
                  label="Execution Workflow"
                />
              </FieldWithCounter>

              <FieldWithCounter name="seats">
                <VRSeatingChart
                  name="seats"
                  label="Select Theater Seats"
                  svgContent={theaterMapSVG}
                />
              </FieldWithCounter>

              <FieldWithCounter name="projectTimeline">
                <VRGanttTimeline
                  name="projectTimeline"
                  label="Project Timeline"
                  startDate="2024-01-01"
                  endDate="2024-01-31"
                />
              </FieldWithCounter>

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

              <FieldWithCounter name="acceptTerms">
                <VRCheckbox
                  name="acceptTerms"
                  label="I accept the terms and conditions"
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="roles">
                <VRCheckboxGroup
                  name="roles"
                  label="Select Roles"
                  options={roleOptions}
                  required
                />
              </FieldWithCounter>

              <FieldWithCounter name="hasReason">
                <VRCheckbox
                  name="hasReason"
                  label="I have a specific reason"
                />
              </FieldWithCounter>

              <VRConditional
                watch="hasReason"
                condition={(val) => val === true}
              >
                <FieldWithCounter name="reason">
                  <VRText
                    name="reason"
                    label="Why?"
                  />
                </FieldWithCounter>
              </VRConditional>

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

              <FieldWithCounter name="signature">
                <VRSignature
                  name="signature"
                  label="Sign Here"
                  required
                />
              </FieldWithCounter>

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

              <FieldWithCounter name="avatar">
                <VRCamera
                  name="avatar"
                  label="Take a Selfie"
                />
              </FieldWithCounter>

              <FieldWithCounter name="promoCodeQR">
                <VRQRScanner
                  name="promoCodeQR"
                  label="Scan Promo QR"
                />
              </FieldWithCounter>

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

              <WorkExperienceTable />

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0 20px' }} />

              <FieldWithCounter name="marketingEmails">
                <VRSwitch
                  name="marketingEmails"
                  label="Receive marketing emails"
                />
              </FieldWithCounter>

              <FieldWithCounter name="portfolioFiles">
                <VRDropzone
                  name="portfolioFiles"
                  label="Upload Portfolio"
                  accept="image/*,.pdf"
                  maxFiles={3}
                />
              </FieldWithCounter>
            </>
          )}

          {/* ── Step Navigation ──────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#e5e7eb')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = '#f3f4f6')
                }
              >
                ← Previous
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: '12px 24px',
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
                Next →
              </button>
            ) : (
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#047857')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = '#059669')
                }
              >
                ✅ Submit Registration
              </button>
            )}
          </div>
        </VoraForm>

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
