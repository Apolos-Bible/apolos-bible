import { useEffect, useRef, useState } from 'react';

/**
 * Returns a ref + className that adds ReactFlow's `nowheel` class only when
 * the element actually overflows. Lets the canvas zoom freely on the wheel
 * when there's nothing to scroll inside the node.
 */
export function useNoWheelOnOverflow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const next =
        el.scrollHeight > el.clientHeight + 1 ||
        el.scrollWidth > el.clientWidth + 1;
      setOverflows((prev) => (prev === next ? prev : next));
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, characterData: true, subtree: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return { ref, className: overflows ? 'nowheel' : '' };
}
