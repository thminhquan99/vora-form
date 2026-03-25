<div align="center">
  <!-- VoraForm Logo Placeholder -->
  <img src="https://via.placeholder.com/150x150.png?text=VoraForm+Logo" alt="VoraForm Logo" width="150" height="150" />
  
  <h1>VoraForm</h1>
  <p><strong>The Zero Re-render Form Library for the Modern Web</strong></p>
</div>

---

## The "Why?"

Normally, typing in a React form makes your whole page lag because every single keystroke triggers a massive re-render cascade. 

VoraForm uses DOM-level dark magic to completely bypass React state during typing. It keeps your page lightning fast, operating effortlessly at 60 FPS no matter how massive your layout is. You get the developer experience of controlled components with the brutal performance of uncontrolled ones.

## 🚀 Quick Start

Drop VoraForm into your app in under a minute.

### 1. Install

```bash
npm install @vora-form/core
```
*(Note: Zod is completely optional! VoraForm features a blazingly fast native validation engine out of the box.)*

### 2. Copy-Paste a Lightning-Fast Form

Here is a complete, working Login Form using the native validation engine. Notice there's absolutely no `useState`—VoraForm handles the magic completely under the hood.

```tsx
import React from 'react';
import { VoraForm } from '@vora-form/core';
import { VRText } from '@vora-form/registry/text-input'; // Adjust to your local registry path

export default function LoginForm() {
  const handleSubmit = (values: Record<string, unknown>) => {
    console.log('Secure payload ready:', values);
  };

  return (
    <VoraForm 
      onSubmit={handleSubmit}
      className="p-6 bg-white rounded-lg shadow-md"
    >
      <h2>Welcome Back</h2>

      {/* Inputs never trigger root re-renders! */}
      <VRText 
        name="email" 
        label="Email Address" 
        placeholder="you@company.com" 
        required 
        requiredMessage="Email is required"
        pattern={{ value: /^\S+@\S+\.\S+$/, message: "Invalid email format" }}
      />

      <VRText 
        name="password" 
        label="Password" 
        type="password" 
        required 
        requiredMessage="Password is required"
        validate={(val) => typeof val === 'string' && val.length < 8 ? "Must be 8+ chars" : undefined}
      />

      <button type="submit" className="mt-4 bg-blue-600 text-white font-bold py-2 px-4 rounded">
        Sign In
      </button>
    </VoraForm>
  );
}
```

## 🧩 Component Showcase

VoraForm isn't just a library for boring text inputs. We built a massive, copy-paste registry loaded with some of the most exotic inputs on the web. 

Supercharge your applications instantly with capabilities like:
- **`VRSpreadsheet`**: A highly interactive, Excel-like editable grid matrix.
- **`VRNodeGraph`**: A fully drag-and-drop bezier-curve node connection engine.
- **`VRImageCropper`**: Native canvas-powered image framing and extraction.
- **`VRSeatingChart`**: A zoomable, pannable SVG architectural seating selector.
- **`VRSignaturePad`**: High-performance, pressure-sensitive cryptographic signing.

*(For a deep-dive into the hardcore Zero Re-render architecture underlying this library, please refer to our internal architect's guide: `COMMON_SUMMARY.md`)*
