# signature — function summary

## Purpose
Freehand signature pad that captures drawing as a base64 PNG data URL.
Ultimate stress test of PaulyForm's "Zero Re-render" architecture.

## Exports
- PaulySignature (React.FC\<PaulySignatureProps\>)
- PaulySignatureProps (interface)

## Field contract
- **value**: `string | null` — base64 `image/png` data URL or `null`
- **onChange**: called ONLY on `pointerup` (stroke end) or Clear

## Performance contract
| Phase | React re-renders | Store updates |
|---|---|---|
| During drawing (pointermove) | 0 | 0 |
| Stroke end (pointerup) | 0-1 (composite setValue) | 1 |
| Clear button | 0-1 | 1 (null) |
| Sibling fields during drawing | 0 | 0 |

## Architecture
```
Canvas Events → refs only (isDrawing, ctxRef)
                ↓ (pointerup)
         field.onChange(dataURL) → store.setValue() → pub/sub
```

## Side effects
- `useEffect`: initializes 2D context (size, color, lineWidth)
- `useEffect`: registers canvas element as field ref
- Pointer capture for smooth out-of-bounds drawing

## Props
- `penColor` (string, default '#000000')
- `penWidth` (number, default 2)
- `canvasHeight` (number, default 200)
- Standard: `name`, `label`, `required`, `disabled`, `className`, `id`

## SSR
`browserOnly: true` — Canvas API is not available in Node.js.
Wrap with dynamic import or `Suspense` in Next.js.

## Dependencies
- packages/core — usePaulyField
- registry/label — PaulyLabel
- registry/field-error — PaulyFieldError
