"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const PINCH_DAMPING = 0.65;
const VIEWER_PADDING = 16;

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function roundScale(value: number) {
  return Math.round(value * 100) / 100;
}

export default function PDFReader({ url }: { url: string }) {
  const { t } = useI18n();
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [containerWidth, setContainerWidth] = useState(0);
  const viewerAreaRef = useRef<HTMLDivElement>(null);
  const pagesFlowRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentScaleRef = useRef(DEFAULT_SCALE);

  const commitScale = useCallback((next: number | ((current: number) => number)) => {
    setScale((current) => {
      const raw = typeof next === "function" ? next(current) : next;
      const value = roundScale(clampScale(raw));
      currentScaleRef.current = value;
      return value;
    });
  }, []);

  const goToPage = useCallback(
    (nextPage: number) => {
      if (!pageCount) return;
      const targetPage = Math.min(pageCount, Math.max(1, nextPage));
      setPageNumber(targetPage);
      requestAnimationFrame(() => {
        pageRefs.current[targetPage - 1]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [pageCount]
  );

  useEffect(() => {
    currentScaleRef.current = scale;
  }, [scale]);

  // Measure viewer area so pages auto-fit width
  useEffect(() => {
    const el = viewerAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = viewerAreaRef.current;
    if (!root || !pageCount) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nextPage = Number((active?.target as HTMLElement | undefined)?.dataset.pageNumber);
        if (nextPage) setPageNumber(nextPage);
      },
      { root, threshold: [0.35, 0.6, 0.85] }
    );

    pageRefs.current.slice(0, pageCount).forEach((page) => {
      if (page) observer.observe(page);
    });

    return () => observer.disconnect();
  }, [pageCount, scale]);

  useEffect(() => {
    const el = viewerAreaRef.current;
    if (!el) return;

    let pinch: { distance: number; scale: number } | null = null;
    let liveScale = currentScaleRef.current;

    const getDistance = (a: Touch, b: Touch) =>
      Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

    const resetPreview = () => {
      const pages = pagesFlowRef.current;
      if (!pages) return;
      pages.style.transform = "";
      pages.style.transformOrigin = "";
      pages.style.transition = "";
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length < 2) return;
      pinch = {
        distance: getDistance(event.touches[0], event.touches[1]),
        scale: currentScaleRef.current,
      };
      liveScale = currentScaleRef.current;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length < 2 || !pinch) return;
      event.preventDefault();

      const ratio = getDistance(event.touches[0], event.touches[1]) / pinch.distance;
      const dampedRatio = 1 + (ratio - 1) * PINCH_DAMPING;
      liveScale = roundScale(clampScale(pinch.scale * dampedRatio));

      const pages = pagesFlowRef.current;
      if (pages) {
        pages.style.transition = "none";
        pages.style.transform = `scale(${liveScale / pinch.scale})`;
        pages.style.transformOrigin = "center top";
      }
    };

    const handleTouchEnd = () => {
      if (!pinch) return;
      resetPreview();
      commitScale(liveScale);
      pinch = null;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const nextScale = currentScaleRef.current * (1 - event.deltaY * 0.0025);
      commitScale(nextScale);
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
      el.removeEventListener("wheel", handleWheel);
    };
  }, [commitScale]);

  const pageWidth =
    containerWidth > 0
      ? Math.max(120, (containerWidth - VIEWER_PADDING * 2) * scale)
      : undefined;

  return (
    <div className="pdf-reader-wrap">
      <div className="pdf-toolbar-bar">
        <div className="pdf-tb-group">
          <button
            type="button"
            className="pdf-tb-btn"
            onClick={() => commitScale((current) => current - 0.1)}
            disabled={scale <= MIN_SCALE}
            title={t("reader.zoomOut")}
          >
            <Minus size={15} />
          </button>
          <span className="pdf-tb-scale">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="pdf-tb-btn"
            onClick={() => commitScale((current) => current + 0.1)}
            disabled={scale >= MAX_SCALE}
            title={t("reader.zoomIn")}
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="pdf-tb-btn pdf-tb-fit"
            onClick={() => commitScale(DEFAULT_SCALE)}
            title={t("reader.backTo100")}
          >
            <RotateCcw size={13} />
          </button>
        </div>

        <div className="pdf-tb-group">
          <button
            type="button"
            className="pdf-tb-btn"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            title={t("reader.prevPage")}
          >
            <ChevronLeft size={15} />
          </button>
          <div className="pdf-tb-page">
            <input
              type="number"
              min={1}
              max={pageCount || 1}
              value={pageNumber}
              onChange={(event) => goToPage(Number(event.target.value) || 1)}
              aria-label={t("reader.currentPage")}
            />
            <span className="pdf-tb-sep">/</span>
            <span>{pageCount || "-"}</span>
          </div>
          <button
            type="button"
            className="pdf-tb-btn"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={!pageCount || pageNumber >= pageCount}
            title={t("reader.nextPage")}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="pdf-viewer-area" ref={viewerAreaRef}>
        <Document
          file={url}
          loading={<div className="pdf-loading-skeleton" />}
          error={<div className="pdf-reader-message">{t("reader.pdfError")}</div>}
          onLoadSuccess={({ numPages }) => {
            setPageCount(numPages);
            setPageNumber(1);
            commitScale(DEFAULT_SCALE);
          }}
        >
          <div className="pdf-pages-flow" ref={pagesFlowRef}>
            {Array.from({ length: pageCount }, (_, index) => {
              const page = index + 1;
              return (
                <div
                  key={page}
                  className="pdf-page-stage"
                  data-page-number={page}
                  ref={(element) => {
                    pageRefs.current[index] = element;
                  }}
                >
                  <Page
                    pageNumber={page}
                    width={pageWidth}
                    loading={<div className="pdf-loading-skeleton" />}
                    renderAnnotationLayer
                    renderTextLayer
                  />
                </div>
              );
            })}
          </div>
        </Document>
      </div>
    </div>
  );
}
