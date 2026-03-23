# text-input — function summary

## Purpose
Uncontrolled text input integrated with PaulyForm core via the universal
field contract. Supports label, inline error, and standard HTML input
attributes. The DOM is the source of truth for typed text — React never
re-renders this component on keystroke.

## Exports
- PaulyText (React.FC\<PaulyTextProps\>): primary component
- PaulyTextProps (interface): extends PaulyFieldProps\<string, HTMLInputElement\>

## Field contract
- value: string
- onChange: (value: string | React.ChangeEvent\<HTMLInputElement\>) => void
- error: string | undefined

## Side effects
- Calls register(name) from FormContext on mount via usePaulyField
- Calls unregister(name) on unmount (via ref callback cleanup)
- Calls setSilentValue(name, target.value) on native onChange (no re-render)
- Triggers single-field Zod validation on blur

## Dependencies
- packages/core — usePaulyField, PaulyFieldProps
- registry/label — PaulyLabel
- registry/field-error — PaulyFieldError

## Known constraints
- Does not support multiline input — use textarea instead
- Requires a \<PaulyForm\> ancestor — cannot be used standalone
- Uses CSS Modules — bundler must support `.module.css` imports

## Usage snapshot
```tsx
import { z } from 'zod';
import { PaulyForm, createZodAdapter } from '@pauly/core';
import { PaulyText } from './components/pauly/text-input';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

<PaulyForm validate={createZodAdapter(schema)} onSubmit={handleSubmit}>
  <PaulyText name="email" label="Email" placeholder="you@example.com" required />
  <button type="submit">Submit</button>
</PaulyForm>
```
