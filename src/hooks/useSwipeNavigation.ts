import { useRef, useEffect } from "react";

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

/**
 * Detects horizontal swipe gestures (touch + trackpad).
 * Touch: provides drag-follow visual feedback, animates out on threshold.
 * Trackpad: accumulates deltaX from wheel events, triggers on threshold.
 */
export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, threshold = 60 }: SwipeConfig) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight });
  callbacksRef.current = { onSwipeLeft, onSwipeRight };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let currentDx = 0;
    let isTracking = false;
    let directionLocked: "horizontal" | "vertical" | null = null;
    let animating = false;

    // ── Touch events ─────────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (animating) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      currentDx = 0;
      isTracking = true;
      directionLocked = null;
      el.style.transition = "none";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTracking || animating) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (!directionLocked) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          directionLocked = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        }
      }

      if (directionLocked !== "horizontal") return;
      e.preventDefault();

      const canGoRight = !!callbacksRef.current.onSwipeRight;
      const canGoLeft = !!callbacksRef.current.onSwipeLeft;
      let resistance = 0.6;
      if ((dx > 0 && !canGoRight) || (dx < 0 && !canGoLeft)) {
        resistance = 0.12; // rubber band at edges
      }

      currentDx = dx * resistance;
      el.style.transform = `translateX(${currentDx}px)`;
    };

    const onTouchEnd = () => {
      if (!isTracking || animating) return;
      isTracking = false;

      if (currentDx > threshold && callbacksRef.current.onSwipeRight) {
        animating = true;
        el.style.transition = "transform 0.18s ease-out, opacity 0.18s ease-out";
        el.style.transform = `translateX(${Math.min(window.innerWidth * 0.35, 300)}px)`;
        el.style.opacity = "0";
        setTimeout(() => {
          callbacksRef.current.onSwipeRight?.();
          el.style.transition = "none";
          el.style.transform = "";
          el.style.opacity = "";
          animating = false;
        }, 180);
      } else if (currentDx < -threshold && callbacksRef.current.onSwipeLeft) {
        animating = true;
        el.style.transition = "transform 0.18s ease-out, opacity 0.18s ease-out";
        el.style.transform = `translateX(${-Math.min(window.innerWidth * 0.35, 300)}px)`;
        el.style.opacity = "0";
        setTimeout(() => {
          callbacksRef.current.onSwipeLeft?.();
          el.style.transition = "none";
          el.style.transform = "";
          el.style.opacity = "";
          animating = false;
        }, 180);
      } else {
        // Snap back
        el.style.transition = "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        el.style.transform = "translateX(0)";
        currentDx = 0;
      }
    };

    // ── Trackpad (wheel with horizontal deltaX) ────────────────────────────
    let wheelAccum = 0;
    let wheelTimer: ReturnType<typeof setTimeout>;
    let wheelCooldown = false;

    const onWheel = (e: WheelEvent) => {
      if (wheelCooldown || animating) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaX) < 3) return;

      e.preventDefault();
      wheelAccum += e.deltaX;

      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (wheelAccum > threshold && callbacksRef.current.onSwipeLeft) {
          callbacksRef.current.onSwipeLeft();
          wheelCooldown = true;
          setTimeout(() => { wheelCooldown = false; }, 450);
        } else if (wheelAccum < -threshold && callbacksRef.current.onSwipeRight) {
          callbacksRef.current.onSwipeRight();
          wheelCooldown = true;
          setTimeout(() => { wheelCooldown = false; }, 450);
        }
        wheelAccum = 0;
      }, 80);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      clearTimeout(wheelTimer);
    };
  }, [threshold]);

  return ref;
}
