# text-input — function summary

## Purpose
Uncontrolled text input integrated with VoraForm core via the universal
field contract. Supports label, inline error, and standard HTML input
attributes. The DOM is the source of truth for typed text — React never
re-renders this component on keystroke.

## Exports
- VRText (React.FC\<VRTextProps\>): primary component
- VRTextProps (interface): extends VRFieldProps\<string, HTMLInputElement\>

## Field contract
- value: string
- onChange: (value: string | React.ChangeEvent\<HTMLInputElement\>) => void
- error: string | undefined

## Side effects
- Calls register(name) from FormContext on mount via useVoraField
- Calls unregister(name) on unmount (via ref callback cleanup)
- Calls setSilentValue(name, target.value) on native onChange (no re-render)
- Triggers single-field Zod validation on blur

## Dependencies
- packages/core — useVoraField, VRFieldProps
- registry/label — VRLabel
- registry/field-error — VRFieldError

## Known constraints
- Does not support multiline input — use textarea instead
- Requires a \<VoraForm\> ancestor — cannot be used standalone
- Uses CSS Modules — bundler must support `.module.css` imports

## Usage snapshot
```tsx
import { z } from 'zod';
import { VoraForm, createZodAdapter } from '@vora/core';
import { VRText } from './components/pauly/text-input';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

<VoraForm validate={createZodAdapter(schema)} onSubmit={handleSubmit}>
  <VRText name="email" label="Email" placeholder="you@example.com" required />
  <button type="submit">Submit</button>
</VoraForm>
```
