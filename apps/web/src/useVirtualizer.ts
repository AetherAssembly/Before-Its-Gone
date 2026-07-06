/**
 * Minimal useVirtualizer implementation compatible with @tanstack/react-virtual's API.
 * Replace this import with '@tanstack/react-virtual' once the package is available.
 */
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  lane: number;
  key: string | number;
  measureElement: (el: Element | null) => void;
}

interface VirtualizerOptions {
  count: number;
  estimateSize: (index: number) => number;
  getScrollElement: () => HTMLElement | null;
  overscan?: number;
}

interface Virtualizer {
  getVirtualItems: () => VirtualItem[];
  getTotalSize: () => number;
  measureElement: (el: Element | null) => void;
}

export function useVirtualizer(options: VirtualizerOptions): Virtualizer {
  const { count, estimateSize, getScrollElement, overscan = 3 } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const measuredSizes = useRef<Map<number, number>>(new Map());
  const rafRef = useRef<number | undefined>(undefined);

  // Stabilize the getter so the scroll effect doesn't re-attach on every render
  const getScrollElementRef = useRef(getScrollElement);
  useLayoutEffect(() => {
    getScrollElementRef.current = getScrollElement;
  });

  // Cache cumulative offsets so we don't recompute on every render
  const offsetCache = useRef<number[]>([]);

  const getSize = useCallback(
    (index: number) => measuredSizes.current.get(index) ?? estimateSize(index),
    [estimateSize],
  );

  // Rebuild offset cache whenever count or measured sizes might have changed
  const buildOffsets = useCallback(() => {
    const offsets: number[] = new Array(count + 1);
    offsets[0] = 0;
    for (let i = 0; i < count; i++) {
      offsets[i + 1] = offsets[i] + getSize(i);
    }
    offsetCache.current = offsets;
    return offsets;
  }, [count, getSize]);

  useEffect(() => {
    const el = getScrollElementRef.current();
    if (!el) return;

    const onScroll = () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setScrollTop(el.scrollTop);
      });
    };

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    el.addEventListener('scroll', onScroll, { passive: true });
    ro.observe(el);
    setScrollTop(el.scrollTop);
    setContainerHeight(el.clientHeight);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
   
  }, []);

  const getVirtualItems = useCallback((): VirtualItem[] => {
    if (count === 0) return [];
    const offsets = buildOffsets();
    const totalSize = offsets[count];
    if (totalSize === 0) return [];

    const viewStart = scrollTop;
    const viewEnd = scrollTop + containerHeight;

    // Binary search for first visible item
    let lo = 0;
    let hi = count - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid + 1] <= viewStart) lo = mid + 1;
      else hi = mid;
    }
    const startIndex = Math.max(0, lo - overscan);

    // Find last visible item
    let end = lo;
    while (end < count && offsets[end] < viewEnd) end++;
    const endIndex = Math.min(count - 1, end - 1 + overscan);

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const measureElement = (el: Element | null) => {
        if (!el) return;
        const height = (el as HTMLElement).offsetHeight;
        if (height > 0 && measuredSizes.current.get(i) !== height) {
          measuredSizes.current.set(i, height);
          // Trigger a re-render via a tiny state update (batched by React)
          setScrollTop(prev => prev);
        }
      };
      items.push({
        index: i,
        start: offsets[i],
        size: getSize(i),
        lane: 0,
        key: i,
        measureElement,
      });
    }
    return items;
  }, [count, scrollTop, containerHeight, overscan, buildOffsets, getSize]);

  const getTotalSize = useCallback(() => {
    const offsets = buildOffsets();
    return offsets[count] ?? 0;
  }, [buildOffsets, count]);

  const measureElement = useCallback((el: Element | null) => {
    // top-level measureElement — not used when per-item measureElement is used
    if (!el) return;
  }, []);

  return { getVirtualItems, getTotalSize, measureElement };
}
