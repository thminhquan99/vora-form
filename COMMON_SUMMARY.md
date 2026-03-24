# VoraForm: The Zero-Re-Render React Form Engine

## 1. The Vision & Definition

VoraForm is an enterprise-grade, uncontrolled-first, Zero Re-render React Form Engine. It was engineered specifically to defeat the React Native-controlled input bottleneck. In traditional React applications, deeply nested or complex forms suffer from severe latency and CPU thrashing because every keystroke triggers a render cycle. VoraForm eradicates this overhead by interacting directly with the DOM natively, ensuring that state mutations—whether typing text, dragging complex node graphs, or painting canvas pixels—happen instantly at 60fps without triggering a single React render cycle in the parent form or its siblings.

## 2. Core Philosophy & Architecture

- **Vanilla TS FormStore**: The single source of truth is a pure TypeScript class (`FormStore`). Form state is held securely in mutable memory references completely outside the React lifecycle, immune to render lifecycles and layout thrashing.
- **Dual-Store Design**: The architecture tracks two distinct streams of data simultaneously: `values` (the validated domain data prepared for submission) and `refs` (the direct structural pointers to the native DOM elements themselves).
- **path-scoped Pub/Sub via useSyncExternalStore**: VoraForm implements a hyper-granular Pub/Sub model. Components only subscribe to their exact string path (e.g., `user.settings.theme`). Through `useSyncExternalStore`, components *only* re-render when their specific error state or programmatic override is triggered, completely deaf to sibling mutations.
- **The `setSilentValue` Weapon**: Advanced DOM manipulations commit data directly to the overarching `FormStore` state using `store.setSilentValue()`. This updates the internal data matrix silently without emitting subscription events, allowing complex DOM interactions to remain totally isolated from React's reconciliation engine.
- **Uncontrolled Validation**: When a form boundary calls `store.submit()`, the `FormStore` reads directly from the uncontrolled DOM references. It performs bulk extraction and asynchronous validation via a Zod adapter. Errors are then bulk-broadcasted strictly to the exact fields that violated the schema constraints on blur or submit.

## 3. Project Layout

The repository is structured as a scalable, shadcn-like Monorepo:
- **`packages/core/`**: The brain of VoraForm. Contains the Vanilla TS `FormStore`, core React hooks (`useVoraField`), the `<VoraForm>` context provider, and the Zod validation adapter logic.
- **`packages/registry/`**: The Shadcn-like primitive copy-paste architecture. Contains all headless and styled UI components. Every atomic unit here is designed to be copied directly into consumer codebases, bridging uncontrolled DOM elements back to the `FormStore`.
- **`apps/playground/`**: The deployment layer and integration testing environment. A Vite/React application demonstrating all registry components wired into a massive, heavily-validated ecosystem schema.

## 4. The Registry Anatomy

### Tier 1 (Foundation)
- **`VRText`**: The fundamental text input. Operates purely via native `defaultValue` and registers its `HTMLInputElement` ref for O(1) value extraction.
- **`VRTextarea`**: A standard uncontrolled textarea element mapping its native ref directly to the core store.
- **`VRCheckbox`**: A boolean gate relying purely on the native `.checked` DOM property without React component state.
- **`VRRadioGroup`**: Synchronizes native `input[type="radio"]` arrays using native DOM scoping by dynamically assigning identical `name` attributes.
- **`VRSelect`**: A native `<select>` dropdown wrapper that registers its `value` purely statelessly.
- **`VRSwitch`**: An accessible boolean toggle that leverages `aria-checked` attributes and triggers `setSilentValue` natively upon pointer interactions.
- **`VRSlider`**: A numerical track input using pointer capture boundingClient math to slide a thumb div without triggering state updates.

### Tier 2 (Advanced Arrays & Formats)
- **`VRCombobox`**: A search-as-you-type dropdown. Uses a local `useRef` to track focus and filtered items without bleeding `onChange` keystrokes to the parent form.
- **`VRRating`**: Computes mouse-move fractionality via pure DOM bounding rects, filling SVG paths via inline styling.
- **`VRTransferList`**: Uses `setSilentValue` to move massive arrays of items between dual-column boxes natively, avoiding enormous list reconciliations.
- **`VRKeyValue`**: A dynamic array/object builder that manages variable amounts of input clones using a mutated DOM list tracked by `useRef`.
- **`VRTable`**: A fully uncontrolled table context that manages grid state mutably, broadcasting cell visibility states through a micro-pub/sub bus without triggering row renders.
- **`VRTagInput`**: Intercepts `onKeyDown` `Enter` natively. Manipulates a local array of strings, paints DOM tags, and fires `setSilentValue` on the hidden array.
- **`VRDatePicker`**: Synthesizes standard JS `Date` objects from a custom calendar grid rendered once on mount. Mutates `input.value` natively across date selections.
- **`VRMaskedInput`**: Intercepts `onInput` immediately, applies a local Regex mask to `e.currentTarget.value`, and artificially rewrites `selectionStart` directly in the DOM.
- **`VROTPInput`**: Computes standard paste length constraints and shifts focus iteratively across sibling input elements via `document.getElementById` and native `.focus()`.
- **`VRCreditCard`**: Applies advanced string parsing and formatting based on BIN mappings natively to mask structured inputs without overlapping virtual elements.
- **`VRTreeSelect`**: A nested hierarchical checkbox system. Updates deeply nested child properties via recursive native tree-walking, visually toggling `.checked` independent of React.

### Tier 3 (Peripherals & Hardware)
- **`VRCamera`**: Attaches directly to `navigator.mediaDevices.getUserMedia()`. Pipes the raw WebRTC MediaStream into a `<video srcObject>` native ref, bypassing all react state.
- **`VRQRScanner`**: Uses the native browser `BarcodeDetector` API via `requestAnimationFrame` to constantly poll the video stream natively, sidestepping heavy WASM or JS libraries.
- **`VRSignature`**: Captures hundreds of fractional mouse coordinates mutably, rendering them asynchronously to a continuous Canvas stroke buffer completely decoupled from `requestAnimationFrame` overhead.

### Tier 4 (The Builder)
- **`VRWidgetBuilder`**: A recursive HTML5 Drag-and-Drop tree builder. Leverages node data serialized natively on `e.dataTransfer`, allowing infinite topological nesting without flattening Redux states.

### Tier 5 (The Exotic DOM Hackers)
- **`VRPatternLock`**: Intercepts pointer events and utilizes SVG trigonometry to draw geometric bridging lines mutably between dot grids, capturing Android-style numerical passwords seamlessly.
- **`VRCoordinatePicker`**: Renders an interactive localized plane. Transforms `e.nativeEvent.offsetX` into localized fractional coordinates flawlessly.
- **`VRMentions`**: Hooks into `<textarea>` key events and computes exact text-caret pixel geometry constraints to spawn a virtual portal dropdown menu at the precise X/Y cursor coordinate.
- **`VRImageCropper`**: Extends the native `CanvasRenderingContext2D` scaling math. Safely paints massive file blobs via `URL.createObjectURL` and rigorously manages OS memory leaks via `URL.revokeObjectURL(blob)`.
- **`VRSpreadsheet`**: An Excel clone built completely using a 2D `useRef` matrix. Arrow key navigation measures native `e.currentTarget.selectionStart`. Handles complex native TSV pasting via `e.clipboardData.getData('Text')`.
- **`VRFormula`**: Uses a native `contentEditable="true"` wrapper. Traps text via a `savedRange` ref variable instead of `window.getSelection()`, enabling explicit un-editable pill variable injection natively while stopping injection vectors with DOMParser anti-XSS protection.

### Tier 6 (The Abyssal Tier)
- **`VRRichText`**: Bypasses heavy complex frameworks by executing `document.execCommand` directly against a `contentEditable` frame to generate bold, italic, and highly formatted structured text natively.
- **`VRCronBuilder`**: An algorithmic parser tracking a 5-part select schema structure to synthesize and compute dense crontab configurations into strict cron-syntax strings natively.
- **`VRAudioRecorder`**: Interfaces with standard `MediaRecorder` APIs. Compresses streaming microphone blob data and converts it securely into Base64 format strings entirely out of band.

### Tier 7 (The Genesis Tier)
- **`VRNodeGraph`**: Eliminates layout engine overhead by mapping dragged node positions exclusively through strict `domNode.style.transform` properties, while drawing `<path>` SVG bezier bridging strings dynamically against pointer interactions.
- **`VRSeatingChart`**: Secures dynamically injected SVG maps using a pristine memory `DOMParser` to strip XSS `<script>` tags, then utilizes pure CSS `matrix()` transforms for performant native graphical panning and zooming.
- **`VRGanttTimeline`**: Renders massive schedule structures dynamically using raw pixel-to-Date scaling math. Intercepts resize events mutably and applies interpolated bounding boxes instantly onto specific `el.style.width` overrides.
