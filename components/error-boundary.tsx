"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
          <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg dark:bg-zinc-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/20">
              <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.reload();
                }}
                className="w-full"
              >
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.href = "/";
                }}
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs font-semibold text-zinc-500">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-zinc-100 p-2 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
