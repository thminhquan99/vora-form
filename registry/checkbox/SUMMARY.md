# checkbox — function summary

## Purpose
Two checkbox-based selection components integrated with PaulyForm:
- **PaulyCheckbox**: single boolean toggle (e.g., "Accept Terms")
- **PaulyCheckboxGroup**: multi-select array (e.g., roles: ['admin', 'editor'])

## Exports
- PaulyCheckbox (React.FC\<PaulyCheckboxProps\>): single boolean
- PaulyCheckboxGroup (React.FC\<PaulyCheckboxGroupProps\>): string array
- PaulyCheckboxProps, PaulyCheckboxGroupProps, CheckboxOption (interfaces)

## Field contract
- **PaulyCheckbox** — value: boolean, onChange uses target.checked via setSilentValue
- **PaulyCheckboxGroup** — value: string[], onChange passes domain value via setValue (triggers re-render)

## Architecture distinction
| Component | Type | Value flow | Re-renders on toggle? |
|---|---|---|---|
| PaulyCheckbox | Native/Uncontrolled | defaultChecked + setSilentValue | No |
| PaulyCheckboxGroup | Composite/Controlled | checked + field.onChange(newArray) → setValue | Yes (expected) |

## Side effects
- PaulyCheckbox: registerField on mount, setSilentValue on toggle
- PaulyCheckboxGroup: registerField on mount (group div), setValue on toggle (pub/sub)
- Both: single-field validation on blur

## Dependencies
- packages/core — usePaulyField
- registry/label — PaulyLabel (group only)
- registry/field-error — PaulyFieldError

## Usage snapshot
```tsx
<PaulyCheckbox name="acceptTerms" label="I accept the terms" required />

<PaulyCheckboxGroup
  name="roles"
  label="Select Roles"
  options={[
    { label: 'Admin', value: 'admin' },
    { label: 'Editor', value: 'editor' },
    { label: 'Viewer', value: 'viewer' },
  ]}
  required
/>
```
