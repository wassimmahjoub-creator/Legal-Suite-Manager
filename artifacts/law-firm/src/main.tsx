import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import "./index.css";

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem", background: "#f5f5f0" }}>
          <div style={{ textAlign: "center", maxWidth: "480px" }}>
            <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠</p>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>حدث خطأ عند تحميل التطبيق</h2>
            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem", direction: "ltr", wordBreak: "break-all" }}>
              {err.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "0.5rem 1.5rem", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
            >
              إعادة التحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
const loadingEl = document.getElementById("pre-react-loader");

if (!rootEl) {
  document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif;color:red">خطأ: العنصر #root غير موجود</p>';
} else {
  try {
    if (loadingEl) loadingEl.remove();
    createRoot(rootEl).render(
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    );
  } catch (err) {
    const e = err as Error;
    rootEl.innerHTML = `
      <div dir="rtl" style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:2rem;background:#f5f5f0">
        <div style="text-align:center;max-width:480px">
          <p style="font-size:2rem;margin-bottom:1rem">⚠</p>
          <h2 style="font-size:1.1rem;font-weight:600;margin-bottom:0.5rem">فشل تحميل التطبيق</h2>
          <p style="font-size:0.8rem;color:#666;direction:ltr;word-break:break-all;margin-bottom:1.5rem">${e?.message ?? String(err)}</p>
          <button onclick="window.location.reload()" style="padding:0.5rem 1.5rem;background:#1a3a5c;color:#fff;border:none;border-radius:6px;cursor:pointer">إعادة التحميل</button>
        </div>
      </div>`;
  }
}
