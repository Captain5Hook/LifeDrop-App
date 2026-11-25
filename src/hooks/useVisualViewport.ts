import { useEffect, useState } from 'react';

/**
 * Tracks mobile virtual keyboard height via visualViewport API so modals
 * and search inputs adjust without layout jumps or clipped controls.
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window !== 'undefined' && window.visualViewport
      ? window.visualViewport.height
      : null,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => setHeight(vv.height);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  return height;
}
