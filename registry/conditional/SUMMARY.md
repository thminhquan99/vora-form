# conditional — function summary

## Purpose
Dynamic layout controller that conditionally mounts/unmounts form
fields based on another field's value. Not a form input.

## Exports
- PaulyConditional (React.FC\<PaulyConditionalProps\>)
- PaulyConditionalProps (interface)

## Architecture
```
usePaulyField(watch) → field.value
  ↓
condition(field.value)
  ↓
true → <>{children}</>
false → null (unmounts children)
```

## Re-render contract
| Event | PaulyConditional re-renders? |
|---|---|
| Watched field changes | ✅ Yes (to evaluate condition) |
| Child field typing | ❌ No |
| Sibling field changes | ❌ No |
| Error state changes | ❌ No (subscribes only to value topic) |

## Side effects
- None. Purely reads `field.value`.
- Does NOT attach `ref`, `onChange`, `setValue`, or `onBlur`.

## Dependencies
- packages/core — usePaulyField (for value subscription)
