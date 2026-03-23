# PaulyForm — Complete Project Systemization

---

## 1. Project Overview & Vision

### 1.1 Core Values

| Value | Description |
|---|---|
| **DX-First** | Every API decision prioritizes developer simplicity. A single universal interface governs all components, regardless of complexity. |
| **Performance by Default** | Uncontrolled component architecture ensures zero cross-field re-renders. The form state never triggers unnecessary React reconciliation cycles. |
| **Modular Distribution** | Developers install only what they need via `npx pauly add [component]`. No monolithic package; tree-shaking is architectural, not bundler-dependent. |
| **Headless Validation** | First-class Zod integration with a validation engine fully decoupled from UI, enabling any schema library to plug in. |
| **Universal Interface** | Every component—from a simple text input to a camera capture—exposes the same contract: `{ name, value, onChange, error }`. |

### 1.2 Unique Selling Points (USPs)

1. **One Interface to Rule Them All** — Whether rendering a `<PaulyText>` or a `<PaulySignature>`, the developer writes the same integration code.
2. **CLI-Driven, Not Package-Driven** — Inspired by shadcn/ui, components are copied into the project, giving developers full ownership and zero version-lock.
3. **Zero Re-Render Architecture** — Ref-based state management ensures that typing in Field A never causes Field B to re-render.
4. **Schema-First Validation** — Define a Zod schema once; PaulyForm maps errors to fields automatically.
5. **9-Category Coverage** — From basic text inputs to multi-step wizards, one library covers the entire form spectrum.

### 1.3 High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Developer's App                       │
│                                                          │
│   <PaulyForm schema={z.object({...})} onSubmit={fn}>     │
│     ├── <PaulyText name="email" />                       │
│     ├── <PaulySelect name="role" options={[...]} />      │
│     ├── <PaulySignature name="sig" />                    │
│     └── <PaulySubmit />                                  │
│   </PaulyForm>                                           │
│                                                          │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│              Core Form State (useFormCore)                │
│                                                          │
│  • Ref-based field registry (Map<string, FieldRef>)      │
│  • register(name) → { ref, onChange, onBlur }            │
│  • Validation engine (Zod adapter)                       │
│  • Error state (only errors trigger re-render)           │
│  • handleSubmit() → validate → serialize → callback      │
│                                                          │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│            Universal Field Interface                     │
│                                                          │
│  Every component receives:                               │
│  { name, value, onChange, onBlur, error, disabled, ... } │
│                                                          │
│  Internally calls register(name) from FormContext        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Relationship between Core State and UI Components:**

- **Core State (`useFormCore`)** is a headless hook. It owns the field registry, validation pipeline, and submission logic. It exposes a `register(name)` function.
- **UI Components** are independent, self-contained modules. Each calls `register(name)` via React Context to connect to the form. They own their own rendering and never read sibling field values.
- **No Prop Drilling** — Context bridges Core → Components. Components are unaware of each other.

#### Subscription Model — Avoiding Cross-Field Re-Renders

The form store is deliberately kept **outside React state** to prevent the entire component tree from re-rendering on every keystroke.

- **External Store:** The canonical field values live in a `Map<string, unknown>` held by a stable ref. React Context carries only a reference to the store object, never the values themselves. Because the context value is referentially stable, providing it does not trigger consumer re-renders.
- **`subscribe(fieldPath, selector)`:** Each field component subscribes to exactly one path (or a derived selector). The store notifies only the subscribers whose selected slice has changed. A component re-renders **only** when its own field changes, not when any sibling changes.
- **Uncontrolled Native Inputs:** Simple HTML inputs (`<input>`, `<textarea>`) use `ref` + `defaultValue`. They are never controlled via React `value`; the DOM is the source of truth for the current input text, while the store is synced on `onChange`/`onBlur`.
- **Controlled Composite Inputs:** Complex widgets (DatePicker, Signature, AudioRecorder, etc.) may hold **local UI state** internally (e.g., the currently visible calendar month), but they commit the **final domain value** to the core store via `onChange` only when the user confirms (e.g., selects a date, lifts the pen).

```typescript
// Simplified subscribe-by-path illustration

type Listener = () => void;

class FormStore {
  private values = new Map<string, unknown>();
  private listeners = new Map<string, Set<Listener>>();

  /** Get the current value for a field path */
  get<T>(path: string): T | undefined {
    return this.values.get(path) as T | undefined;
  }

  /** Set a field value and notify only subscribers of that path */
  set<T>(path: string, value: T): void {
    this.values.set(path, value);
    this.listeners.get(path)?.forEach((fn) => fn());
  }

  /**
   * Subscribe to changes on a specific field path.
   * Returns an unsubscribe function.
   */
  subscribe(path: string, listener: Listener): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(listener);
    return () => this.listeners.get(path)?.delete(listener);
  }
}

// React hook consumed by each field component
function useFieldValue<T>(store: FormStore, path: string): T | undefined {
  const [value, setValue] = React.useState(() => store.get<T>(path));

  React.useEffect(() => {
    // Re-render this component — and ONLY this component — when `path` changes
    return store.subscribe(path, () => setValue(store.get<T>(path)));
  }, [store, path]);

  return value;
}
```

> **Key invariant:** Editing Field A must never cause Fields B, C, … N to re-render, regardless of the total number of fields in the form.

---

### 1.4 Architectural Guardrails

Non-negotiable constraints the team locks in from day one to prevent architectural drift:

| # | Constraint | Rule |
|---|---|---|
| 1 | **API Contract** | Every field component integrates through the same minimal interface (`PaulyFieldProps<TValue>`). No component may invent its own registration or state-sync mechanism. |
| 2 | **Performance** | Editing Field A must **never** re-render Fields B/C if B/C do not subscribe to A. Verified via React Profiler assertions in CI. |
| 3 | **CLI Distribution** | Each component installs independently via the CLI, pulling exactly its transitive dependencies and nothing more. Adding `text-input` must not pull `signature` or any unrelated registry item. |
| 4 | **Customization** | Code copied by the CLI is fully editable by the developer. The CLI must **never** silently overwrite local customizations on subsequent `add` or `update` commands — it must prompt before overwriting. |
| 5 | **Quality Gate** | Every component must ship with **all** of the following before it is considered done: contract test, demo (Storybook story or example app page), docs (props table + usage snippet), CLI manifest (`component.json`), and `SUMMARY.md`. |

---

## 2. Epics and User Stories Breakdown

### Epic 1: Core Foundation

*The headless engine that powers everything.*

| ID | User Story | Priority |
|---|---|---|
| CF-1 | As a **Developer**, I want to wrap my fields in `<PaulyForm>` and have them auto-register so that I don't manually manage state for each field. | P0 |
| CF-2 | As a **Developer**, I want to pass a Zod schema to `<PaulyForm>` so that all fields are validated automatically on submit. | P0 |
| CF-3 | As a **Developer**, I want field-level errors to appear instantly on blur so that end-users get real-time feedback. | P0 |
| CF-4 | As a **Developer**, I want typing in one field to never re-render other fields so that my forms remain performant at scale. | P0 |
| CF-5 | As a **Developer**, I want `handleSubmit` to return a strongly-typed, serialized object so that I can send it directly to my API. | P1 |
| CF-6 | As a **Developer**, I want to programmatically set/get field values via a `formRef` so that I can build dependent field logic. | P1 |
| CF-7 | As a **Developer**, I want to use PaulyForm without Zod (custom validator function) so that I'm not locked into one schema library. | P2 |

---

### Epic 2: CLI Distribution System

*Install what you need, own what you install.*

| ID | User Story | Priority |
|---|---|---|
| CLI-1 | As a **Developer**, I want to run `npx pauly add text-input` so that only the TextInput component is added to my project. | P0 |
| CLI-2 | As a **Developer**, I want the CLI to auto-resolve dependencies (e.g., adding `signature-pad` also adds `canvas-utils`) so that components work out of the box. | P0 |
| CLI-3 | As a **Developer**, I want a `pauly.config.ts` file so that I can set my default component directory, styling framework, and alias paths. | P1 |
| CLI-4 | As a **Developer**, I want `npx pauly add --all` to install every component so that I can explore the full library quickly. | P2 |
| CLI-5 | As a **Developer**, I want `npx pauly diff text-input` to show me upstream changes so that I can selectively update components I've modified. | P2 |

#### CLI Manifest Schema (`component.json`)

Every registry item **must** provide a `component.json` manifest that the CLI uses to resolve dependencies, validate compatibility, and scaffold imports.

```typescript
/**
 * Full structure of a component.json manifest file.
 * The CLI reads this to understand what to copy, what to install,
 * and how to integrate the component into the developer's project.
 */
export interface ComponentManifest {
  /** Unique registry name (kebab-case), e.g. "signature-pad" */
  name: string;

  /** Component category for grouping in docs and CLI listing */
  category:
    | "text-input"
    | "selection"
    | "date-time"
    | "slider-number"
    | "upload-media"
    | "special-input"
    | "info-display"
    | "action-button"
    | "layout";

  /** Relative file paths (from component root) the CLI will copy */
  files: string[];

  /**
   * npm packages the component requires at runtime.
   * The CLI will `npm install` these automatically.
   * Key = package name, Value = semver range.
   */
  npmDependencies: Record<string, string>;

  /**
   * Peer dependencies the host project must already provide.
   * The CLI will warn (not install) if missing.
   */
  peerDependencies: Record<string, string>;

  /**
   * Other registry items this component depends on.
   * The CLI will recursively add these before this component.
   */
  registryDependencies: string[];

  /** Semver range of @pauly/core this component is compatible with */
  versionRange: string;

  /**
   * If true, the component uses browser-only APIs (Canvas, MediaDevices, etc.)
   * and must be dynamically imported in SSR frameworks.
   */
  browserOnly: boolean;

  /** Searchable tags for CLI `pauly search` and docs */
  tags: string[];

  /** Named exports the component directory provides */
  exports: string[];
}
```

**Example manifest — `signature-pad/component.json`:**

```json
{
  "name": "signature-pad",
  "category": "special-input",
  "files": [
    "PaulySignature.tsx",
    "PaulySignature.module.css",
    "canvas-utils.ts",
    "types.ts",
    "index.ts"
  ],
  "npmDependencies": {},
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "@pauly/core": ">=0.1.0"
  },
  "registryDependencies": [
    "field"
  ],
  "versionRange": ">=0.1.0",
  "browserOnly": true,
  "tags": ["signature", "canvas", "drawing", "handwriting"],
  "exports": ["PaulySignature", "PaulySignatureProps"]
}
```

#### Browser-Only / SSR Safety

Components that depend on browser-only APIs (`Canvas`, `MediaDevices`, `Web Audio`, `Geolocation`, etc.) must be handled carefully to avoid SSR crashes.

**How it works:**

1. **Manifest flag:** The `browserOnly: true` flag in `component.json` signals the CLI that this component cannot be rendered on the server.
2. **CLI auto-wrapping:** When the CLI detects a Next.js project (presence of `next.config.*`), it wraps the import of any `browserOnly` component in a dynamic boundary automatically:

```typescript
// Auto-generated by `npx pauly add signature-pad` in a Next.js project
import dynamic from "next/dynamic";

export const PaulySignature = dynamic(
  () => import("./PaulySignature").then((mod) => mod.PaulySignature),
  { ssr: false }
);
```

3. **`'use client'` directive:** All browser-only component files include `'use client'` at the top. This ensures the React Server Components boundary is respected even if the developer moves or re-exports the component.

```typescript
// registry/signature/PaulySignature.tsx
'use client';

import React from 'react';
// ... component implementation
```

4. **Rule:** Browser-only components must **never** be imported at a server entry point (`layout.tsx` root, `page.tsx` server component, etc.) without a dynamic boundary.

**Categories that always require `browserOnly: true`:**

| Category | Components | Reason |
|---|---|---|
| Upload/Media | `PaulyCamera`, `PaulyAudioRecorder` | `MediaDevices` API |
| Special Input | `PaulySignature` | `Canvas` API |
| Special Input | `PaulyLocation` | `Geolocation` API, Maps SDK |
| Any component using | `ResizeObserver`, `IntersectionObserver` | Browser-only observers |

---

### Epic 3: Text Input Components

*Category: Text Inputs*

| ID | User Story | Priority |
|---|---|---|
| TI-1 | As a **Developer**, I want a `<PaulyText>` component so that I can render a standard text input bound to the form. | P0 |
| TI-2 | As a **Developer**, I want a `<PaulyTextarea>` component for multiline text so that I can handle long-form content fields. | P0 |
| TI-3 | As a **Developer**, I want a `<PaulyPassword>` with a show/hide toggle so that end-users can verify their passwords. | P0 |
| TI-4 | As a **Developer**, I want a `<PaulySearch>` with debounced onChange so that I can build search-as-you-type fields. | P1 |
| TI-5 | As a **Developer**, I want a `<PaulyMaskedInput>` (phone, credit card, SSN) so that I can enforce formatted input patterns. | P1 |
| TI-6 | As a **Developer**, I want a `<PaulyRichText>` (WYSIWYG) so that I can embed a rich text editor in my forms. | P2 |
| TI-7 | As a **Developer**, I want a `<PaulyOTP>` component so that end-users can enter verification codes. | P1 |

---

### Epic 4: Selection Components

*Category: Selections*

| ID | User Story | Priority |
|---|---|---|
| SEL-1 | As a **Developer**, I want a `<PaulySelect>` (dropdown) so that end-users can pick from a list. | P0 |
| SEL-2 | As a **Developer**, I want a `<PaulyMultiSelect>` with tag chips so that end-users can select multiple options. | P1 |
| SEL-3 | As a **Developer**, I want a `<PaulyCheckbox>` and `<PaulyCheckboxGroup>` so that I can handle boolean and multi-boolean fields. | P0 |
| SEL-4 | As a **Developer**, I want a `<PaulyRadio>` group so that end-users can pick one from many. | P0 |
| SEL-5 | As a **Developer**, I want a `<PaulyToggle>` (switch) so that I can handle on/off settings. | P1 |
| SEL-6 | As a **Developer**, I want a `<PaulyCombobox>` (searchable select) so that end-users can filter long option lists. | P1 |
| SEL-7 | As a **Developer**, I want a `<PaulyColorPicker>` so that end-users can select colors. | P2 |

---

### Epic 5: Date & Time Components

*Category: Date/Time*

| ID | User Story | Priority |
|---|---|---|
| DT-1 | As a **Developer**, I want a `<PaulyDatePicker>` so that end-users select dates from a calendar popup. | P0 |
| DT-2 | As a **Developer**, I want a `<PaulyTimePicker>` so that end-users can input specific times. | P1 |
| DT-3 | As a **Developer**, I want a `<PaulyDateRange>` so that end-users can select start and end dates. | P1 |
| DT-4 | As a **Developer**, I want a `<PaulyDateTime>` (combined) so that I can capture full timestamps. | P2 |

---

### Epic 6: Sliders & Number Components

*Category: Sliders/Numbers*

| ID | User Story | Priority |
|---|---|---|
| SN-1 | As a **Developer**, I want a `<PaulyNumber>` input with increment/decrement buttons so that end-users can adjust numeric values. | P0 |
| SN-2 | As a **Developer**, I want a `<PaulySlider>` (single value) so that end-users interact with a visual range. | P1 |
| SN-3 | As a **Developer**, I want a `<PaulyRangeSlider>` (dual thumb) so that end-users can define a min-max range. | P2 |
| SN-4 | As a **Developer**, I want a `<PaulyRating>` (star/emoji) component so that end-users can submit ratings. | P1 |

---

### Epic 7: Upload & Media Components

*Category: Upload/Media*

| ID | User Story | Priority |
|---|---|---|
| UM-1 | As a **Developer**, I want a `<PaulyFileUpload>` with drag-and-drop so that end-users can upload files. | P0 |
| UM-2 | As a **Developer**, I want a `<PaulyImageUpload>` with preview and crop so that end-users can upload profile pictures. | P1 |
| UM-3 | As a **Developer**, I want a `<PaulyCamera>` component so that end-users can capture photos directly from their device. | P2 |
| UM-4 | As a **Developer**, I want a `<PaulyAudioRecorder>` so that end-users can record voice messages. | P2 |

---

### Epic 8: Special Input Components

*Category: Special Inputs*

| ID | User Story | Priority |
|---|---|---|
| SI-1 | As a **Developer**, I want a `<PaulySignature>` canvas so that end-users can draw their signature. | P1 |
| SI-2 | As a **Developer**, I want a `<PaulyLocation>` (map/autocomplete) so that end-users can input addresses. | P2 |
| SI-3 | As a **Developer**, I want a `<PaulyTagInput>` so that end-users can enter free-form tags. | P1 |
| SI-4 | As a **Developer**, I want a `<PaulyCaptcha>` integration so that I can prevent bot submissions. | P2 |

---

### Epic 9: Info Display Components

*Category: Info Display*

| ID | User Story | Priority |
|---|---|---|
| ID-1 | As a **Developer**, I want a `<PaulyFieldError>` component that auto-binds to a field's error state so that I can customize error positioning. | P0 |
| ID-2 | As a **Developer**, I want a `<PaulyLabel>` that auto-links to its field via `htmlFor` so that I get accessible forms by default. | P0 |
| ID-3 | As a **Developer**, I want a `<PaulyHint>` for helper text so that I can guide end-users below a field. | P1 |
| ID-4 | As a **Developer**, I want a `<PaulyProgress>` that shows form completion percentage so that end-users know how much is left. | P2 |

---

### Epic 10: Action Button Components

*Category: Action Buttons*

| ID | User Story | Priority |
|---|---|---|
| AB-1 | As a **Developer**, I want a `<PaulySubmit>` button that auto-disables during submission so that double-submits are prevented. | P0 |
| AB-2 | As a **Developer**, I want a `<PaulyReset>` button that clears all fields to their initial values so that end-users can start over. | P1 |
| AB-3 | As a **Developer**, I want a `<PaulySaveDraft>` button that serializes partial form data so that end-users don't lose progress. | P2 |

---

### Epic 11: Form Layout Structures

*Category: Form Layout Structures*

| ID | User Story | Priority |
|---|---|---|
| FL-1 | As a **Developer**, I want a `<PaulyFieldGroup>` to visually group related fields so that my form is organized (like a `<fieldset>`). | P1 |
| FL-2 | As a **Developer**, I want a `<PaulySteps>` multi-step wizard so that I can break long forms into pages. | P1 |
| FL-3 | As a **Developer**, I want `<PaulySteps>` to validate per step (partial schema validation) so that errors appear before advancing. | P1 |
| FL-4 | As a **Developer**, I want a `<PaulyConditional>` wrapper that shows/hides fields based on sibling values so that I can build dynamic forms declaratively. | P2 |
| FL-5 | As a **Developer**, I want a `<PaulyFieldArray>` for repeatable field groups (dynamic rows) so that end-users can add/remove items. | P1 |

---

### Epic 12: OSS Operations & Release Infrastructure

*Category: Maintainer Operations*

| ID | User Story | Priority |
|---|---|---|
| OSS-1 | As a **Maintainer**, I want an automated release pipeline with semver tagging and changelog generation so that versioning is never manual and the release history is fully auditable. | P1 |
| OSS-2 | As a **Maintainer**, I want a `CONTRIBUTING.md` and a component authoring guide so that external contributors can add registry items without breaking the universal field contract or CLI model. | P1 |
| OSS-3 | As a **Maintainer**, I want contract and performance test harnesses running in CI so that no component PR can merge if it violates the `PaulyFieldProps` interface or introduces cross-field re-renders. | P0 |
| OSS-4 | As a **Maintainer**, I want a documented semver compatibility policy so that developers know exactly which changes are breaking versus safe to absorb after `npx pauly add` or `npx pauly diff`. | P1 |
| OSS-5 | As a **Maintainer**, I want a public registry index (versioned JSON endpoint) so that the CLI can discover available components and their latest `versionRange` without any hardcoded list. | P2 |

This epic is **load-bearing for long-term OSS health**. Without automated releases, version drift between `@pauly/core` and the registry becomes unmanageable past a dozen components. Without a contributor guide, external PRs will routinely violate the universal field contract — creating review bottleneck and rework. CI-enforced contract and performance tests are the only scalable way to guarantee that the zero re-render invariant holds as the component surface area grows. A public registry index decouples the CLI from hardcoded component lists, enabling the community to publish third-party registry items without core team gatekeeping. Together, these stories transform PaulyForm from a team project into a sustainable open-source ecosystem.

---

## 3. Core Acceptance Criteria (AC)

### 3.1 Core Form State (`useFormCore` + `<PaulyForm>`)

| AC ID | Criterion | Type |
|---|---|---|
| CF-AC-1 | `<PaulyForm>` MUST accept an optional `schema` prop (Zod `ZodObject`) and a required `onSubmit` callback. | Interface |
| CF-AC-2 | Calling `register(name)` MUST return `{ ref, onChange, onBlur, name }` compatible with uncontrolled inputs. | Interface |
| CF-AC-3 | On submit, if a schema is provided, ALL fields MUST be validated. If validation fails, `onSubmit` MUST NOT be called and `errors` MUST be mapped by field name. | Behavior |
| CF-AC-4 | On blur, if the field has a corresponding schema key, it MUST validate that single field and show/clear its error. | Behavior |
| CF-AC-5 | Typing in Field A MUST NOT cause a re-render of Field B. Verified via `React.memo` + `console.count` or React DevTools Profiler showing zero renders on sibling fields. | Performance |
| CF-AC-6 | `formRef.current.getValues()` MUST return a typed `Record<string, unknown>` of all registered field values. | Interface |
| CF-AC-7 | `formRef.current.setValue(name, value)` MUST update the field's internal ref and reflect in the DOM without triggering a form-wide re-render. | Performance |
| CF-AC-8 | Error state changes MUST only re-render the specific `<PaulyFieldError>` bound to that field, not the entire form or other fields. | Performance |
| CF-AC-9 | `<PaulyForm>` MUST generate valid, accessible HTML `<form>` element with proper `role` and `aria-*` attributes. | Accessibility |

---

### 3.2 CLI Distribution Mechanism (`npx pauly`)

| AC ID | Criterion | Type |
|---|---|---|
| CLI-AC-1 | `npx pauly add text-input` MUST copy `text-input/` directory (component + styles + types) into the developer's configured component path (default: `src/components/pauly/`). | Behavior |
| CLI-AC-2 | If `text-input` depends on an internal utility (e.g., `use-form-context`), the CLI MUST auto-install it if not already present. | Dependency |
| CLI-AC-3 | If a component already exists in the target directory, the CLI MUST prompt: `"text-input already exists. Overwrite? (y/N)"`. | Safety |
| CLI-AC-4 | `npx pauly init` MUST scaffold a `pauly.config.ts` with defaults: `{ componentDir: "src/components/pauly", style: "css-modules" }`. | Setup |
| CLI-AC-5 | CLI MUST complete `add` commands in under 3 seconds for a single component on a standard connection. | Performance |
| CLI-AC-6 | Each component directory MUST be self-contained: the CLI copies files, not installs packages. No `node_modules` changes from `pauly add`. | Architecture |
| CLI-AC-7 | CLI MUST support `--typescript` and `--javascript` flags. Default is TypeScript. | Flexibility |

---

### 3.3 Signature Pad Component (`<PaulySignature>`)

| AC ID | Criterion | Type |
|---|---|---|
| SIG-AC-1 | `<PaulySignature name="sig" />` MUST render an HTML `<canvas>` element within a styled container. | Interface |
| SIG-AC-2 | The component MUST call `register("sig")` on mount and participate in the form's `{ name, value, onChange, error }` universal interface. The `value` is a base64 PNG string or `null`. | Interface |
| SIG-AC-3 | Drawing on the canvas MUST call `onChange` with the updated base64 string on `pointerup` (NOT on every stroke frame). | Performance |
| SIG-AC-4 | A **Clear** button MUST be rendered. Clicking it MUST reset the canvas and call `onChange(null)`. | Behavior |
| SIG-AC-5 | The canvas MUST be responsive: it MUST fill 100% width of its parent and maintain a default 3:1 aspect ratio (configurable via `aspectRatio` prop). | Responsiveness |
| SIG-AC-6 | If the field has a validation error (e.g., required but empty), the error MUST be displayable via `<PaulyFieldError name="sig" />` — same as any other field. | Consistency |
| SIG-AC-7 | The component MUST support `penColor`, `penWidth`, and `backgroundColor` props for UI customization. | Customizability |
| SIG-AC-8 | The component MUST work on both mouse and touch devices with smooth drawing at 60fps. | Compatibility |
| SIG-AC-9 | The component MUST NOT import any heavy external canvas libraries at the top level; lazy-load if needed. | Performance |

---

## 4. Development Process & Roadmap

### 4.1 Phased Roadmap

#### Phase 1 — Core Flow Validation (Weeks 1–3)

> **Goal:** Prove the core architecture works end-to-end.

| Week | Deliverables |
|---|---|
| 1 | `useFormCore` hook, `<PaulyForm>` provider, `register()` function, Zod integration, error mapping |
| 2 | `<PaulyText>`, `<PaulyPassword>`, `<PaulyFieldError>`, `<PaulyLabel>`, `<PaulySubmit>` |
| 3 | CLI `init` + `add` commands, end-to-end demo (login form using CLI-installed components) |

**Exit Criteria:** A developer can `npx pauly init`, `npx pauly add text-input password submit`, build a login form with Zod validation, and submit it — all with zero cross-field re-renders.

---

#### Phase 2 — Essential Components (Weeks 4–6)

> **Goal:** Cover the most common form patterns.

| Week | Deliverables |
|---|---|
| 4 | `<PaulyTextarea>`, `<PaulyNumber>`, `<PaulyCheckbox>`, `<PaulyRadio>`, `<PaulyToggle>` |
| 5 | `<PaulySelect>`, `<PaulyCombobox>`, `<PaulyMultiSelect>` |
| 6 | `<PaulyDatePicker>`, `<PaulyTimePicker>`, `<PaulyFieldGroup>`, `<PaulyReset>` |

**Exit Criteria:** Developer can build a complete user profile form (name, email, password, role dropdown, birth date, notification preferences).

---

#### Phase 3 — Advanced Components (Weeks 7–9)

> **Goal:** Differentiate from competitors with complex components.

| Week | Deliverables |
|---|---|
| 7 | `<PaulyFileUpload>`, `<PaulyImageUpload>`, `<PaulySlider>`, `<PaulyRangeSlider>` |
| 8 | `<PaulySignature>`, `<PaulyTagInput>`, `<PaulyOTP>`, `<PaulyMaskedInput>` |
| 9 | `<PaulyRating>`, `<PaulySearch>`, `<PaulyHint>`, `<PaulyProgress>` |

**Exit Criteria:** Developer can build a KYC (Know Your Customer) form with file uploads, signature, OTP, and masked SSN input.

---

#### Phase 4 — Layout Structures & Power Features (Weeks 10–12)

> **Goal:** Enable complex, dynamic form architectures.

| Week | Deliverables |
|---|---|
| 10 | `<PaulySteps>` multi-step wizard with per-step validation |
| 11 | `<PaulyFieldArray>` (repeatable rows), `<PaulyConditional>` (show/hide logic) |
| 12 | `<PaulyCamera>`, `<PaulyAudioRecorder>`, `<PaulyRichText>`, `<PaulySaveDraft>` |

**Exit Criteria:** Developer can build a multi-step job application form with conditional fields, repeatable work experience rows, file upload, and save-draft.

---

#### Phase 5 — Polish & Launch (Weeks 13–14)

| Week | Deliverables |
|---|---|
| 13 | Documentation site (Storybook or Astro Starlight), comprehensive API reference, playground |
| 14 | `CLI diff` command, accessibility audit (WCAG 2.1 AA), performance benchmarking, open-source launch prep |

---

### 4.2 Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| **Unit Tests** | Vitest | Every hook function, every utility, every validator adapter |
| **Component Tests** | Vitest + Testing Library | Each component in isolation (renders, fires events, calls onChange) |
| **Integration Tests** | Vitest + Testing Library | `<PaulyForm>` with multiple children, full submit + validation flow |
| **Performance Tests** | Custom harness (React Profiler API) | Assert zero cross-field re-renders on 50-field forms |
| **E2E Tests** | Playwright | Full CLI → install → build form → fill → submit workflow |
| **Accessibility Tests** | axe-core + manual audit | Every component passes WCAG 2.1 AA |
| **Visual Regression** | Chromatic (Storybook) | Snapshot every component in all states |
| **CLI Smoke Tests** | Temp workspace + Node CLI test runner | `init`, `add`, transitive dependency resolution, overwrite safety. Guarantee source distribution never silently breaks. |
| **Type Tests** | `tsc --noEmit` + `tsd` | Zod generic inference, submit payload type correctness. Protect developer-facing type safety and DX. |

**Test co-location rule:** Each component directory contains its own `__tests__/` folder. Tests travel with the component when the CLI copies it.

---

### 4.3 Agile Ceremonies

| Ceremony | Cadence | Expected Output | Hard Rule |
|---|---|---|---|
| **Sprint Planning** | Every 2 weeks | Selected stories with clear scope | Select only stories that produce a **demoable vertical slice**; do not select purely horizontal work. |
| **Backlog Refinement** | Weekly | Refined story cards | Every story entering the sprint must have clear Acceptance Criteria, clear dependencies, and a rough effort estimate. |
| **Sprint Review** | End of sprint | Live demo | Demo on a reference app (Vite or Next.js); **never** demo unit tests in isolation. |
| **Retrospective** | End of sprint | Action items | Focus on DX friction, component add speed, and contract stability. |
| **Architecture Review** | Start of each new epic (lightweight) | Go / No-Go decision | Verify the incoming component does not break the universal contract or CLI model. |

#### Definition of Done (DoD)

A component/story **cannot** be closed until all of the following are true:

- [ ] Component implements `PaulyFieldProps<TValue>` universal interface
- [ ] Contract test passes (register, onChange, onBlur, error display)
- [ ] Unit tests + component tests written and green
- [ ] No cross-field re-render regressions (React Profiler assertion)
- [ ] `component.json` manifest is present and valid
- [ ] `SUMMARY.md` is present and up-to-date
- [ ] Storybook story / demo page exists showing all states
- [ ] Props table and usage snippet documented
- [ ] Accessibility: passes axe-core automated checks
- [ ] CLI smoke test: `npx pauly add <component>` succeeds in a clean project
- [ ] Code reviewed and approved by at least one other team member

---

### 4.4 Agent-Readable Function Summary (`SUMMARY.md`)

**Mandatory convention:** Whenever a story or task is implemented, the developer (or AI agent) must produce a `SUMMARY.md` file in the component or package directory.

This file has one purpose: **allow an AI agent to understand the entire public surface of a module without reading source code**, minimizing context window usage and token cost.

#### Required Structure

```markdown
# [component-name] — function summary

## Purpose
1–2 sentences: what this component does and why it exists.

## Exports
All exported functions, hooks, components, types, and constants.
For each: name, full TypeScript signature, one-line description.

## Field contract
(Form components only) — value type, onChange type, error type.

## Side effects
Anything that happens outside the return value: DOM mutation, storage
access, event listeners, async calls, subscriptions.

## Dependencies
Internal dependencies only (packages/core, packages/shared, other
registry items). Omit npm packages — those are already in the manifest.

## Known constraints
Hard limits: browser-only, SSR unsafe, minimum React version, required
peer dependency, permission API required, no IE support, etc.

## Usage snapshot
The shortest possible runnable code example — enough for an agent to
understand correct usage without reading docs or stories.
```

#### Integration Rules

1. **Definition of Done:** `SUMMARY.md` is a required item. A story cannot be closed without it.
2. **Agent-first workflow:** When an AI agent begins a new task, its first step is to read the `SUMMARY.md` of all declared dependencies instead of reading source files. This is the primary token-reduction mechanism.
3. **Staleness = absence:** `SUMMARY.md` must be updated whenever the public API changes. A stale summary is treated the same as a missing one.
4. **Machine-first:** This file does not replace JSDoc, Storybook stories, or the README. It complements them.
5. **File location:**
   - `registry/<component-name>/SUMMARY.md` (for registry components)
   - `packages/<package-name>/SUMMARY.md` (for core packages)

#### Example — `text-input/SUMMARY.md`

```markdown
# text-input — function summary

## Purpose
Uncontrolled text input integrated with PaulyForm core via the universal
field contract. Supports label, hint, inline error, and standard HTML
input attributes.

## Exports
- PaulyText (React.FC<PaulyTextProps>): primary component
- PaulyTextProps (interface): extends PaulyFieldProps<string>

## Field contract
- value: string
- onChange: (value: string) => void
- error: string | undefined

## Side effects
- Calls register(name) from FormContext on mount
- Calls unregister(name) on unmount

## Dependencies
- packages/core — useFormContext, register
- registry/field — Field wrapper, Label, InlineError

## Known constraints
- Does not support multiline input — use text-area instead
- Requires a FormContext ancestor — cannot be used standalone

## Usage snapshot
```tsx
<PaulyForm schema={schema} onSubmit={handleSubmit}>
  <PaulyText name="email" label="Email" />
  <PaulySubmit />
</PaulyForm>
```
```

#### Example — `signature-pad/SUMMARY.md`

```markdown
# signature-pad — function summary

## Purpose
Browser-only canvas drawing component integrated with PaulyForm core via
the universal field contract. Captures a user's handwritten signature and
commits the result as a base64 PNG data URL on pointerup — never on
intermediate stroke frames — to preserve 60fps drawing performance.

## Exports
- PaulySignature (React.FC<PaulySignatureProps>): primary canvas-based
  signature capture component
- PaulySignatureProps (interface): extends PaulyFieldProps<string | null>
  with penColor, penWidth, backgroundColor, and aspectRatio props

## Field contract
- value: string | null  (base64 PNG data URL, or null when cleared)
- onChange: (value: string | null) => void
- error: string | undefined

## Side effects
- Acquires a 2D canvas rendering context on mount
- Attaches pointerdown, pointermove, and pointerup event listeners to the
  canvas element for stroke capture
- Instantiates a ResizeObserver to keep canvas pixel dimensions in sync
  with the parent container's CSS width
- Fires onChange with the base64 string on pointerup ONLY (never on
  intermediate stroke frames — this is the performance contract)
- Calls register(name) from FormContext on mount
- Calls unregister(name) and disconnects ResizeObserver on unmount

## Dependencies
- packages/core — useFormContext, register
- registry/field — Field wrapper, Label, InlineError
- registry/signature/canvas-utils — stroke smoothing, base64 export

## Known constraints
- browser-only: imports Canvas API and PointerEvent — will throw on SSR
- Must be wrapped in next/dynamic with ssr: false in Next.js projects
  (CLI adds this wrapper automatically when browserOnly: true in manifest)
- Requires a FormContext ancestor — cannot be used standalone
- base64 output can be large for dense signatures; consumer is responsible
  for compression or conversion before upload
- Does not support pressure-sensitive input (stylus pressure is ignored)

## Usage snapshot
```tsx
import { z } from 'zod';

const schema = z.object({
  signature: z.string().min(1, 'Signature is required'),
});

<PaulyForm schema={schema} onSubmit={handleSubmit}>
  <PaulySignature
    name="signature"
    penColor="#1a1a1a"
    penWidth={2}
    backgroundColor="#ffffff"
    aspectRatio={3}
  />
  <PaulyFieldError name="signature" />
  <PaulySubmit />
</PaulyForm>
```
```

---

### 4.5 Folder Structure (CLI-Optimized)

```
paulyform/
├── packages/
│   ├── core/                          # Published to npm: @pauly/core
│   │   ├── src/
│   │   │   ├── useFormCore.ts         # Headless form hook
│   │   │   ├── FormProvider.tsx       # React Context provider
│   │   │   ├── types.ts              # Universal interface types
│   │   │   ├── validation/
│   │   │   │   ├── zod-adapter.ts
│   │   │   │   └── types.ts
│   │   │   └── utils/
│   │   │       ├── ref-store.ts
│   │   │       └── serialize.ts
│   │   ├── __tests__/
│   │   └── package.json
│   │
│   └── cli/                           # Published to npm: pauly (global CLI)
│       ├── src/
│       │   ├── commands/
│       │   │   ├── init.ts
│       │   │   ├── add.ts
│       │   │   └── diff.ts
│       │   ├── registry.ts            # Component dependency graph
│       │   └── config.ts              # pauly.config.ts reader
│       ├── __tests__/
│       └── package.json
│
├── registry/                          # Component templates (CLI reads from here)
│   ├── text-input/                    # Canonical fully-expanded example
│   │   ├── PaulyText.tsx
│   │   ├── PaulyText.module.css
│   │   ├── types.ts
│   │   ├── index.ts
│   │   ├── component.json             # CLI manifest (required)
│   │   ├── SUMMARY.md                 # Agent-readable function summary (required)
│   │   └── __tests__/
│   │       └── PaulyText.test.tsx
│   ├── password/                      # + component.json, SUMMARY.md
│   │   ├── PaulyPassword.tsx
│   │   ├── PaulyPassword.module.css
│   │   ├── types.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── PaulyPassword.test.tsx
│   ├── select/                        # + component.json, SUMMARY.md
│   │   └── ...
│   ├── signature/                     # + component.json, SUMMARY.md
│   │   ├── PaulySignature.tsx
│   │   ├── PaulySignature.module.css
│   │   ├── canvas-utils.ts           # Internal dependency
│   │   ├── types.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── PaulySignature.test.tsx
│   ├── steps/                         # + component.json, SUMMARY.md
│   │   └── ...
│   └── ...                            # One directory per component
│                                      # Every item ships with component.json + SUMMARY.md
│
├── docs/                              # Documentation site
│   └── ...
│
├── examples/                          # Demo apps
│   ├── login-form/
│   ├── multi-step-wizard/
│   └── kyc-form/
│
├── pauly.config.ts                    # Root config for development
├── turbo.json                         # Turborepo config (monorepo)
├── package.json                       # Root workspace
└── README.md
```

**Key Design Decisions:**

1. **`packages/core/`** — This is the only runtime npm dependency. Developers install `@pauly/core` normally via npm. It contains the headless hook and context provider.
2. **`packages/cli/`** — The CLI tool published as `pauly` on npm. It reads from the `registry/` directory (hosted on GitHub/CDN) and copies components into the developer's project.
3. **`registry/`** — Each subdirectory is a self-contained component. The CLI copies the entire directory. Components import from `@pauly/core` (the only external dependency).
4. **Co-located tests** — `__tests__/` lives inside each component dir. When the CLI copies a component, tests come with it, enabling developers to verify customized components.

---

## Appendix: Universal Interface TypeScript Definition

```typescript
/**
 * The contract every PaulyForm component MUST implement.
 * This is the single interface that makes the entire library consistent.
 */
export interface PaulyFieldProps<TValue = unknown, TElement extends HTMLElement = HTMLElement> {
  /** Unique field name — maps to the form state and schema key */
  name: string;

  /** 🚩 NEW — Ref handle bound to the underlying DOM element by register().
   *  The Core Store reads/writes the DOM directly through this ref,
   *  bypassing React state entirely for native inputs. */
  ref?: React.Ref<TElement>;

  /** Current field value (for controlled scenarios or initial value) */
  value?: TValue;

  /** Default/initial value */
  defaultValue?: TValue;

  /** 🔧 CHANGED — Dual overload: accepts either a plain domain value (composite
   *  inputs like DatePicker, Signature) OR a native React ChangeEvent
   *  (uncontrolled native inputs like <input>, <textarea>, <select>). */
  onChange?: (valueOrEvent: TValue | React.ChangeEvent<TElement>) => void;

  /** Called when the field loses focus */
  onBlur?: () => void;

  /** Validation error message (auto-provided by PaulyForm context) */
  error?: string;

  /** Whether the field is disabled */
  disabled?: boolean;

  /** Whether the field is required (mirrors schema) */
  required?: boolean;

  /** Custom CSS class */
  className?: string;
}
```

> **Architectural Note — Why `ref` is non-negotiable**
>
> PaulyForm's core premise is the **uncontrolled-first paradigm**: the DOM element is the source of truth for the current input value, not React state. The `ref` property is the mechanism through which `register(name)` hands the Core Store a direct handle to the DOM node. Without it:
>
> - **`register()` cannot attach to the DOM.** The `useFormCore` hook calls `ref.current.value` to read the field on submit and on blur-validation. If `ref` is absent, the store has no way to read or write the DOM, and the entire uncontrolled architecture collapses into a controlled model — defeating the zero re-render guarantee.
> - **`setValue(name, value)` breaks.** Programmatic value updates (via `formRef.current.setValue`) write directly to the DOM element through the ref. Without it, there is no way to reflect the new value in the UI without a React state cycle.
> - **Serialization on submit fails.** `handleSubmit` iterates the field registry, reads `ref.current.value` for each field, and builds the typed payload. A missing ref means a missing value.
>
> **The two `onChange` overloads serve distinct architectural roles:**
>
> | Input type | `onChange` receives | Why |
> |---|---|---|
> | **Native uncontrolled** (`<input>`, `<textarea>`, `<select>`) | `React.ChangeEvent<TElement>` | The DOM already holds the value; the event is forwarded to the store for sync and optional validation. |
> | **Composite controlled** (DatePicker, Signature, etc.) | `TValue` (plain domain value) | These widgets manage their own internal UI state and commit a final, clean domain value when the user confirms. |
