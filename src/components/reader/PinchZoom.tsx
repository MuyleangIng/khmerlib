"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
}

type DragState = {
  startX: number;
  startY: number;
  x0: number;
  y0: number;
};

type PinchState = {
  distance: number;
  scale: number;
  x0: number;
  y0: number;
};

export default function PinchZoom({
  children,
  className = "",
  minScale = 1,
  maxScale = 4,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const scaleRef = useRef(1);
  const xRef = useRef(0);
  const yRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [indicator, setIndicator] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const getDistance = (a: Touch, b: Touch) =>
      Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

    const clampScale = (scale: number) =>
      Math.min(maxScale, Math.max(minScale, scale));

    const getBounds = (scale: number) => {
      const outerRect = outer.getBoundingClientRect();
      const innerWidth = inner.offsetWidth;
      const innerHeight = inner.offsetHeight;

      return {
        x: Math.max(0, (innerWidth * scale - outerRect.width) / 2),
        y: Math.max(0, (innerHeight * scale - outerRect.height) / 2),
      };
    };

    const clampOffset = (scale: number, x: number, y: number) => {
      const bounds = getBounds(scale);
      return {
        x: Math.min(bounds.x, Math.max(-bounds.x, x)),
        y: Math.min(bounds.y, Math.max(-bounds.y, y)),
      };
    };

    const applyTransform = (scale: number, x: number, y: number, animate: boolean) => {
      const nextScale = clampScale(scale);
      const nextOffset = nextScale <= 1
        ? { x: 0, y: 0 }
        : clampOffset(nextScale, x, y);

      scaleRef.current = nextScale;
      xRef.current = nextOffset.x;
      yRef.current = nextOffset.y;
      setIsZoomed(nextScale > 1.01);

      inner.style.transition = animate ? "transform .22s cubic-bezier(.2,0,0,1)" : "none";
      inner.style.transformOrigin = "50% 50%";
      inner.style.transform = `translate3d(${nextOffset.x}px, ${nextOffset.y}px, 0) scale(${nextScale})`;
    };

    const finalizeZoom = () => {
      dragRef.current = null;
      pinchRef.current = null;
      setIsDragging(false);

      const scale = scaleRef.current;
      if (scale < 1.02) {
        applyTransform(1, 0, 0, true);
        setIndicator(null);
        return;
      }

      applyTransform(scale, xRef.current, yRef.current, true);
      if (timerRef.current) clearTimeout(timerRef.current);
      setIndicator(`${(Math.round(scale * 10) / 10).toFixed(1)}x`);
      timerRef.current = setTimeout(() => setIndicator(null), 1400);
    };

    const beginDrag = (clientX: number, clientY: number) => {
      dragRef.current = {
        startX: clientX,
        startY: clientY,
        x0: xRef.current,
        y0: yRef.current,
      };
      setIsDragging(true);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const [a, b] = [event.touches[0], event.touches[1]];
        pinchRef.current = {
          distance: getDistance(a, b),
          scale: scaleRef.current,
          x0: xRef.current,
          y0: yRef.current,
        };
        dragRef.current = null;
        setIsDragging(false);
        return;
      }

      if (event.touches.length === 1 && scaleRef.current > 1.01) {
        beginDrag(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchRef.current) {
        event.preventDefault();

        const [a, b] = [event.touches[0], event.touches[1]];
        const midpointX = (a.clientX + b.clientX) / 2;
        const midpointY = (a.clientY + b.clientY) / 2;
        const rect = outer.getBoundingClientRect();
        const relativeX = midpointX - (rect.left + rect.width / 2);
        const relativeY = midpointY - (rect.top + rect.height / 2);

        const scale = clampScale(
          pinchRef.current.scale * (getDistance(a, b) / pinchRef.current.distance)
        );
        const ratio = scale / pinchRef.current.scale;
        const x = relativeX * (1 - ratio) + pinchRef.current.x0 * ratio;
        const y = relativeY * (1 - ratio) + pinchRef.current.y0 * ratio;
        applyTransform(scale, x, y, false);
        return;
      }

      if (event.touches.length === 1 && dragRef.current && scaleRef.current > 1.01) {
        event.preventDefault();
        const dx = event.touches[0].clientX - dragRef.current.startX;
        const dy = event.touches[0].clientY - dragRef.current.startY;
        applyTransform(
          scaleRef.current,
          dragRef.current.x0 + dx,
          dragRef.current.y0 + dy,
          false
        );
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 1 && scaleRef.current > 1.01) {
        beginDrag(event.touches[0].clientX, event.touches[0].clientY);
        pinchRef.current = null;
        return;
      }

      if (event.touches.length === 0) {
        finalizeZoom();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || scaleRef.current <= 1.01) return;
      beginDrag(event.clientX, event.clientY);
      outer.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !dragRef.current || scaleRef.current <= 1.01) return;
      event.preventDefault();
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      applyTransform(
        scaleRef.current,
        dragRef.current.x0 + dx,
        dragRef.current.y0 + dy,
        false
      );
    };

    const endPointerDrag = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !dragRef.current) return;
      if (outer.hasPointerCapture(event.pointerId)) {
        outer.releasePointerCapture(event.pointerId);
      }
      finalizeZoom();
    };

    const onDoubleClick = () => {
      if (scaleRef.current > 1.01) {
        applyTransform(1, 0, 0, true);
        setIndicator(null);
        return;
      }

      applyTransform(2, 0, 0, true);
      if (timerRef.current) clearTimeout(timerRef.current);
      setIndicator("2.0x");
      timerRef.current = setTimeout(() => setIndicator(null), 1200);
    };

    const onResize = () => {
      applyTransform(scaleRef.current, xRef.current, yRef.current, false);
    };

    outer.addEventListener("touchstart", onTouchStart, { passive: true });
    outer.addEventListener("touchmove", onTouchMove, { passive: false });
    outer.addEventListener("touchend", onTouchEnd, { passive: true });
    outer.addEventListener("touchcancel", onTouchEnd, { passive: true });
    outer.addEventListener("pointerdown", onPointerDown);
    outer.addEventListener("pointermove", onPointerMove);
    outer.addEventListener("pointerup", endPointerDrag);
    outer.addEventListener("pointercancel", endPointerDrag);
    outer.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("resize", onResize);

    return () => {
      outer.removeEventListener("touchstart", onTouchStart);
      outer.removeEventListener("touchmove", onTouchMove);
      outer.removeEventListener("touchend", onTouchEnd);
      outer.removeEventListener("touchcancel", onTouchEnd);
      outer.removeEventListener("pointerdown", onPointerDown);
      outer.removeEventListener("pointermove", onPointerMove);
      outer.removeEventListener("pointerup", endPointerDrag);
      outer.removeEventListener("pointercancel", endPointerDrag);
      outer.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("resize", onResize);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [maxScale, minScale]);

  return (
    <div
      ref={outerRef}
      className={[
        "reader-pinch-zoom",
        className,
        isZoomed ? "reader-pinch-zoom--zoomed" : "",
        isDragging ? "reader-pinch-zoom--dragging" : "",
      ].filter(Boolean).join(" ")}
      style={{ touchAction: isZoomed ? "none" : "pan-y" }}
    >
      <div ref={innerRef} className="reader-pinch-zoom__content">
        {children}
      </div>

      {indicator && (
        <div className="reader-pinch-zoom__indicator" aria-hidden="true">
          {indicator}
        </div>
      )}
    </div>
  );
}
