function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-block ${className}`} />;
}

export function BookGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="book-grid mt-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="book-skeleton-card">
          <SkeletonBlock className="book-skeleton-cover" />
          <SkeletonBlock className="book-skeleton-line book-skeleton-line--title" />
          <SkeletonBlock className="book-skeleton-line" />
          <SkeletonBlock className="book-skeleton-pill" />
        </div>
      ))}
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="loading-page max-w-7xl mx-auto px-4 py-8">
      <SkeletonBlock className="loading-hero" />
      <div className="loading-tabs">
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
      <BookGridSkeleton />
    </div>
  );
}

export function BookDetailLoadingSkeleton() {
  return (
    <div className="book-detail-page max-w-7xl mx-auto px-4 py-8">
      <div className="book-detail-layout flex flex-col lg:flex-row gap-8">
        <div className="book-detail-cover-column lg:w-64 shrink-0">
          <SkeletonBlock className="book-detail-skeleton-cover" />
          <SkeletonBlock className="book-detail-skeleton-button" />
          <SkeletonBlock className="book-detail-skeleton-button" />
        </div>
        <div className="book-detail-main flex-1">
          <SkeletonBlock className="book-detail-skeleton-title" />
          <SkeletonBlock className="book-detail-skeleton-subtitle" />
          <SkeletonBlock className="book-detail-skeleton-panel" />
          <SkeletonBlock className="book-detail-skeleton-paragraph" />
        </div>
      </div>
    </div>
  );
}

export function ReaderLoadingSkeleton() {
  return (
    <div className="reader-loading">
      <div className="reader-loading-bar">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
      <div className="reader-loading-content">
        <SkeletonBlock className="reader-loading-cover" />
        <div className="reader-loading-lines">
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonBlock key={index} className={index % 3 === 0 ? "short" : ""} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsLoadingSkeleton() {
  return (
    <div className="settings-page max-w-5xl mx-auto px-4 py-8">
      <SkeletonBlock className="settings-skeleton-hero" />
      <div className="settings-layout">
        <SkeletonBlock className="settings-skeleton-card" />
        <SkeletonBlock className="settings-skeleton-card settings-skeleton-card--wide" />
      </div>
    </div>
  );
}
