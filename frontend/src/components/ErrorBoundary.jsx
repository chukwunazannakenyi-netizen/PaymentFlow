import { Component } from "react";
import Link from "next/link";
import { withTranslation } from "react-i18next";

/**
 * ErrorBoundary — full-page boundary wrapping the entire app.
 *
 * Catches unhandled render errors that bubble past widget-level boundaries.
 * Distinguishes fatal errors (missing auth context) which redirect to /login,
 * from recoverable errors which show a retry/reload fallback UI.
 *
 * Usage: wrap the top-level <Component> in _app.jsx.
 */
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info.componentStack);

    // Fatal: missing auth/session context — redirect rather than showing
    // a confusing fallback UI.
    if (
      error?.message?.toLowerCase().includes("cannot read propert") &&
      error?.message?.toLowerCase().includes("auth")
    ) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  retry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            color: "var(--text, #0f172a)",
          }}
        >
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
            {t("errorBoundary.title")}
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--text-muted, #64748b)",
              maxWidth: "360px",
            }}
          >
            {t("errorBoundary.body")}
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => this.retry()}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "8px",
                border: "none",
                background: "var(--grad-brand, #059669)",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("errorBoundary.reload")}
            </button>
            <button
              onClick={() => {
                const onNavigated = () => {
                  this.setState({ hasError: false, error: null });
                };
                window.addEventListener("popstate", onNavigated, { once: true });
                window.history.back();
              }}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "8px",
                border: "1px solid var(--border, #e7e9f3)",
                background: "var(--card-bg, #fff)",
                color: "var(--text, #0f172a)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("errorBoundary.goBack")}
            </button>
            <Link
              href="/"
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "8px",
                border: "1px solid var(--border, #e7e9f3)",
                background: "var(--card-bg, #fff)",
                color: "var(--text, #0f172a)",
                fontWeight: 600,
                textDecoration: "none",
                lineHeight: "1.5",
              }}
            >
              {t("errorBoundary.goHome")}
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);

/**
 * WidgetErrorBoundary — lightweight boundary for individual dashboard widgets
 * and page sections.
 *
 * A thrown error in a child component shows a compact fallback with a retry
 * button that re-mounts the failed subtree, without crashing the rest of the
 * page.
 *
 * Usage:
 *   <WidgetErrorBoundary label="Payment Summary">
 *     <PaymentSummaryWidget />
 *   </WidgetErrorBoundary>
 */
export class WidgetErrorBoundary extends Component {
  state = { hasError: false, error: null, retryKey: 0 };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(
      `[WidgetErrorBoundary] Error in "${this.props.label || "widget"}":`,
      error,
      info.componentStack
    );
  }

  retry() {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
    }));
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.label || "this section";
      return (
        <div
          role="alert"
          style={{
            padding: "1.25rem",
            borderRadius: 8,
            border: "1px solid var(--border, #e7e9f3)",
            background: "var(--card-bg, #fff)",
            textAlign: "center",
            color: "var(--text-muted, #64748b)",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>⚠️</div>
          <p style={{ margin: "0 0 0.75rem" }}>
            Something went wrong loading {label}. Try refreshing this section.
          </p>
          <button
            onClick={() => this.retry()}
            style={{
              padding: "0.375rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: "var(--grad-brand, #059669)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    // retryKey forces a full re-mount of children when retrying
    return (
      <div key={this.state.retryKey}>
        {this.props.children}
      </div>
    );
  }
}
