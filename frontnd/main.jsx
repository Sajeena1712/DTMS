import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error) {
    console.error("Root render failure:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", padding: "24px", background: "#0f172a", color: "#f8fafc" }}>
          <h1 style={{ margin: 0, fontSize: "20px" }}>Application failed to render</h1>
          <p style={{ marginTop: "12px", color: "#cbd5e1" }}>{this.state.message}</p>
          <p style={{ marginTop: "8px", color: "#94a3b8" }}>Open browser console for stack trace.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
