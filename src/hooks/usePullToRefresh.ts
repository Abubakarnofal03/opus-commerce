import { useEffect, useRef, useState, useCallback } from 'react';
import { isCapacitor } from '@/lib/capacitor';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // px to pull before triggering
  containerRef?: React.RefObject<HTMLElement>;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 72,
  containerRef,
}: UsePullToRefreshOptions) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    // Only activate on Capacitor (native app)
    if (!isCapacitor()) return;

    const el = containerRef?.current ?? document.documentElement;

    const onTouchStart = (e: TouchEvent) => {
      // Only start pull-to-refresh if scrolled to top
      const scrollTop = (containerRef?.current ?? document.documentElement).scrollTop
        || document.body.scrollTop;
      if (scrollTop > 2) return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta < 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }
      // Resistance: feels like dragging through water
      const resistance = Math.min(delta * 0.45, threshold + 24);
      setPullDistance(resistance);
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistance >= threshold * 0.45) {
        await triggerRefresh();
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, threshold, triggerRefresh, containerRef]);

  return { pullDistance, isRefreshing };
};
