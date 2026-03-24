# checkbox — function summary

## Purpose
Two checkbox-based selection components integrated with VoraForm:
- **VRCheckbox**: single boolean toggle (e.g., "Accept Terms")
- **VRCheckboxGroup**: multi-select array (e.g., roles: ['admin', 'editor'])

## Exports
- VRCheckbox (React.FC\<VRCheckboxProps\>): single boolean
- VRCheckboxGroup (React.FC\<VRCheckboxGroupProps\>): string array
- VRCheckboxProps, VRCheckboxGroupProps, CheckboxOption (interfaces)

## Field contract
- **VRCheckbox** — value: boolean, onChange uses target.checked via setSilentValue
- **VRCheckboxGroup** — value: string[], onChange passes domain value via setValue (triggers re-render)

## Architecture distinction
| Component | Type | Value flow | Re-renders on toggle? |
|---|---|---|---|
| VRCheckbox | Native/Uncontrolled | defaultChecked + setSilentValue | No |
| VRCheckboxGroup | Composite/Controlled | checked + field.onChange(newArray) → setValue | Yes (expected) |

## Side effects
- VRCheckbox: registerField on mount, setSilentValue on toggle
- VRCheckboxGroup: registerField on mount (group div), setValue on toggle (pub/sub)
- Both: single-field validation on blur

## Dependencies
- packages/core — useVoraField
- registry/label — VRLabel (group only)
- registry/field-error — VRFieldError

## Usage snapshot
```tsx
<VRCheckbox name="acceptTerms" label="I accept the terms" required />

<VRCheckboxGroup
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
