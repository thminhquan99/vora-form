# VoraForm Technical Debt & Roadmap Backlog

**Goal:** This document serves as a strict, living audit of deferred structural vulnerabilities, pending architectural optimizations, and strategic roadmap integrations intentionally delayed to ship MVP1. It maintains engineering accountability and prioritizes refactoring efforts for subsequent releases.

## 1. 🔴 CRITICAL (High Priority for MVP1.1)

### Accessibility (A11y) & Navigation Compliance
- [x] **Complex Component ARIA Audit:** Deeply interactive components (`VRSpreadsheet`, `VRPatternLock`, `VRNodeGraph`, `VRGanttTimeline`) critically lack comprehensive WAI-ARIA implementations (`role`, `aria-activedescendant`, `aria-valuenow`, etc.).
- [x] **Canvas/SVG Screen Reader Support:** Completely missing focus management and semantic text fallback structures for Canvas and SVG-rendered elements (e.g., `VRSeatingChart`, `VRImageCropper`).
- [x] **Keyboard Navigation:** Strict enforcement needed for full arrow-key and semantic `Tab` routing across non-native input bounds.

### E2E Test Coverage
- [ ] **PointerEvent Simulation:** Zero robust End-to-End suites currently exist. We urgently require Playwright or Puppeteer integration capable of synthesizing precise, fractional PointerEvent drag-and-drop metrics.
- [ ] **Store Desync Assertions:** Automated tests must rigorously assert that the raw, native mathematical pixel offsets flawlessly translate and synchronize into the underlying `FormStore` state without reconciliation delay.

### Memory Management & React 18 StrictMode
- [x] **Hardware Track Disposal:** While `VRImageCropper` successfully handles `URL.revokeObjectURL`, a repository-wide lifecycle audit is mandated to ensure that WebRTC streams (`VRCamera`), polling intervals (`VRQRScanner`), and complex `AudioContext` structures (`VRAudioRecorder`) are explicitly destroyed upon aggressive component unmounting.
- [x] **Double-Mount Safety:** Ensure all asynchronous `requestAnimationFrame` polling loops and hardware initializations are idempotent and safely handle React 18 StrictMode double-invocation paradigms.


## 2. 🟡 MODERATE (Architecture & Refactoring)

### Snapshot Pattern Refactoring
- [x] **`useInitialSnapshot` Extraction:** Advanced DOM-driven components rigidly bypass exhaustive dependency arrays using `const initialValueRef = useRef(field.value)`. This repetitive pattern must be explicitly abstracted into a core registry hook (e.g., `useInitialSnapshot`) to aggressively DRY the source code.

### Deep Equal Optimization
- [ ] **`isDeepEqual` Hardening:** The internal deep equality utility driving the `FormStore` dirty-tracking matrix remains unproven at scale. It must be rigorously execution-tested against extreme cyclic self-referencing objects and ultra-massive, deeply nested `File` arrays to categorically prevent "Maximum call stack size exceeded" exceptions on submission.

### Event Delegation Overheads
- [ ] **Global Listener Refactoring:** High-density components (`VRTable`, complex Combobox Dropdowns) iteratively bind heavy event listeners directly onto thousands of individual DOM elements. We must pivot to an Event Delegation architecture at the container-boundary to substantially cut memory allocations.


## 3. 🔵 ROADMAP (Future Innovations)

### Server-Side Rendering (SSR) & React Server Components (RSC)
- [ ] **Hydration Integrity:** Perform a macro-audit surrounding our `useSyncExternalStore` implementation to ensure server-rendered snapshots structurally match the initial client hydration payload perfectly.
- [ ] **`use client` Boundaries:** Isolate strictly browser-constrained DOM algorithms (Canvas Math, WebRTC APIs, `window` computations) securely behind clear dynamic imports and explicit `'use client'` directive modules.

### Collaborative Editing (CRDTs)
- [ ] **Multiplayer Store Extension:** Investigate real-time distributed architecture integration. Research extending the Vanilla `FormStore` adapter with mature Conflict-free Replicated Data Types (CRDTs) like **Yjs** or **Automerge**. 
- [ ] **Concurrency Applications:** Implementing scalable data reconciliation to successfully support live, multi-client collaborative editing across high-throughput components (`VRSpreadsheet`, `VRNodeGraph`).
