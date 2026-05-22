import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import "./index.css";

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div dir="rtl" style={{ padding: 32, fontFamily: "monospace", background: "#1a1a2e", color: "#e2c97e", minHeight: "100vh" }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>خطأ في التطبيق</h1>
          <p style={{ color: "#ff6b6b", marginBottom: 8 }}>{e.message}</p>
          <pre style={{ fontSize: 11, color: "#aaa", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{e.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
