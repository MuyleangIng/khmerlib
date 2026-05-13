"use client";

import { useSyncExternalStore } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

type ConnectionInfo = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: ConnectionInfo;
  mozConnection?: ConnectionInfo;
  webkitConnection?: ConnectionInfo;
};

type NetworkKind = "online" | "offline";

const NETWORK_COPY = {
  offline: {
    title: "Offline mode",
    description: "You can keep reading cached pages while waiting to reconnect.",
  },
} as const;

function getConnectionInfo() {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

function getNetworkKind(): NetworkKind {
  if (typeof navigator === "undefined") {
    return "online";
  }

  if (!navigator.onLine) {
    return "offline";
  }

  return "online";
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const connection = getConnectionInfo();
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  connection?.addEventListener?.("change", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
    connection?.removeEventListener?.("change", callback);
  };
}

export default function NetworkStatusBanner() {
  const kind = useSyncExternalStore<NetworkKind>(subscribe, getNetworkKind, () => "online");

  if (kind === "online") return null;

  const copy = NETWORK_COPY.offline;

  return (
    <div className="network-banner network-banner--offline" role="status" aria-live="polite">
      <div className="network-banner__icon" aria-hidden="true">
        <WifiOff size={18} />
      </div>
      <div className="network-banner__copy">
        <p className="network-banner__title">{copy.title}</p>
        <p className="network-banner__text">{copy.description}</p>
      </div>
      <button
        type="button"
        className="network-banner__action"
        onClick={() => window.location.reload()}
        aria-label="Reload page"
      >
        <RefreshCw size={16} />
      </button>
    </div>
  );
}
