"use client";

import Link from "next/link";
import { AlertTriangle, BookOpenText, Home, RefreshCw, WifiOff } from "lucide-react";

type StatusVariant = "not-found" | "error" | "offline";

type StatusAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "secondary";
};

type AppStatusViewProps = {
  variant: StatusVariant;
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  actions: StatusAction[];
};

const variantIcon = {
  "not-found": BookOpenText,
  error: AlertTriangle,
  offline: WifiOff,
} as const;

export default function AppStatusView({
  variant,
  eyebrow,
  title,
  description,
  meta,
  actions,
}: AppStatusViewProps) {
  const Icon = variantIcon[variant];

  return (
    <section className="status-shell">
      <div className={`status-card status-card--${variant}`}>
        <div className="status-icon" aria-hidden="true">
          <Icon size={24} />
        </div>
        <p className="status-eyebrow">{eyebrow}</p>
        <h1 className="status-title">{title}</h1>
        <p className="status-description">{description}</p>
        {meta ? <p className="status-meta">{meta}</p> : null}
        <div className="status-actions">
          {actions.map((action) => {
            const toneClass = action.tone === "secondary" ? "status-action--secondary" : "status-action--primary";
            const icon = action.onClick ? (
              <RefreshCw size={16} />
            ) : action.href === "/books" ? (
              <BookOpenText size={16} />
            ) : (
              <Home size={16} />
            );

            if (action.onClick) {
              return (
                <button
                  key={action.label}
                  type="button"
                  className={`status-action ${toneClass}`}
                  onClick={action.onClick}
                >
                  {icon}
                  <span>{action.label}</span>
                </button>
              );
            }

            return (
              <Link key={action.label} href={action.href ?? "/"} className={`status-action ${toneClass}`}>
                {icon}
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
