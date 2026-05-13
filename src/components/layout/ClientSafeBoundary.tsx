"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ClientSafeBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ClientSafeBoundaryState = {
  hasError: boolean;
};

export default class ClientSafeBoundary extends Component<ClientSafeBoundaryProps, ClientSafeBoundaryState> {
  state: ClientSafeBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ClientSafeBoundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
