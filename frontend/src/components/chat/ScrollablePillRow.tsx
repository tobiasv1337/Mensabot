import React, { useCallback, useRef, useEffect, useState } from "react";
import * as S from "./chat.styles";

type ScrollablePillRowProps = React.HTMLAttributes<HTMLDivElement> & {
  component?: React.ElementType;
};

const ScrollablePillRow: React.FC<ScrollablePillRowProps> = ({
  children,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClickCapture,
  component,
  ...rest
}) => {
  const Component = (component ?? S.PillRow) as React.ElementType;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const dragState = useRef({
    el: null as HTMLDivElement | null,
    startX: 0,
    scrollLeft: 0,
    suppressClick: false,
    isDragging: false,
  });
  const dragThreshold = 8;

  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    setScrollState({ canScrollLeft, canScrollRight });
    
    // Update classes for styling
    el.classList.toggle("can-scroll-left", canScrollLeft);
    el.classList.toggle("can-scroll-right", canScrollRight);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollState();
    
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        onWheel?.(event);
        return;
      }
      if (el.scrollWidth <= el.clientWidth) {
        onWheel?.(event);
        return;
      }
      el.scrollLeft += event.deltaY;
      event.preventDefault();
      onWheel?.(event);
    },
    [onWheel]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        onPointerDown?.(event);
        return;
      }
      if (event.pointerType === "touch") {
        onPointerDown?.(event);
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea")) {
        onPointerDown?.(event);
        return;
      }
      const el = event.currentTarget;
      dragState.current = {
        el,
        startX: event.clientX,
        scrollLeft: el.scrollLeft,
        suppressClick: false,
        isDragging: false,
      };
      onPointerDown?.(event);
    },
    [onPointerDown]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragState.current;
      if (!state.el) {
        onPointerMove?.(event);
        return;
      }
      const delta = event.clientX - state.startX;
      if (!state.isDragging) {
        if (Math.abs(delta) < dragThreshold) {
          onPointerMove?.(event);
          return;
        }
        state.isDragging = true;
        state.suppressClick = true;
        state.el.classList.add("is-dragging");
        try {
          state.el.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture errors.
        }
      }
      state.el.scrollLeft = state.scrollLeft - delta;
      event.preventDefault();
      onPointerMove?.(event);
    },
    [dragThreshold, onPointerMove]
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragState.current;
      if (!state.el) {
        onPointerUp?.(event);
        return;
      }
      const wasDragging = state.isDragging;
      if (wasDragging) {
        state.el.classList.remove("is-dragging");
        try {
          state.el.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore release errors if capture wasn't set.
        }
      }
      state.isDragging = false;
      state.el = null;
      state.suppressClick = wasDragging;
      if (wasDragging) {
        window.setTimeout(() => {
          if (dragState.current.suppressClick) {
            dragState.current.suppressClick = false;
          }
        }, 150);
      }
      onPointerUp?.(event);
    },
    [onPointerUp]
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragState.current;
      if (state.el) {
        state.el.classList.remove("is-dragging");
      }
      state.isDragging = false;
      state.suppressClick = false;
      state.el = null;
      onPointerCancel?.(event);
    },
    [onPointerCancel]
  );

  const handleClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.current.suppressClick) {
        onClickCapture?.(event);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      dragState.current.suppressClick = false;
    },
    [onClickCapture]
  );

  return (
    <Component
      ref={containerRef}
      {...rest}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
    >
      {children}
    </Component>
  );
};

export default ScrollablePillRow;
