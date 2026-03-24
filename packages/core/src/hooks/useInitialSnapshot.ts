import { useRef } from 'react';

/**
 * Caches an initial value precisely once on the first mounting render.
 * Critical for preventing repetitive useEffect re-renders in uncontrolled 
 * components that bypass cyclic React dependency updates.
 */
export function useInitialSnapshot<T>(value: T): T {
  const snapshotRef = useRef<T>(value);
  return snapshotRef.current;
}
