import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

/* ——— Time-based Greeting ——— */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

/* ——— JSON Syntax Highlighter ——— */
function highlightJson(json) {
  if (typeof json !== "string") {
    json = JSON.stringify(json, null, 2);
  }
  // Escape HTML
  json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Syntax highlight
  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\bnull\b|[[\]{}])/g,
    (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "json-key" : "json-string";
      } else if (/true|false/.test(match)) {
        cls = "json-boolean";
      } else if (/null/.test(match)) {
        cls = "json-null";
      } else if (/[[\]{}]/.test(match)) {
        cls = "json-bracket";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

/* ——— Example Queries ——— */
const EXAMPLES = [
  "Show all engineers with salary above 90000",
  "Count employees in each department",
  "Find the highest paid employee",
  "List all departments with avg salary",
];

export default function App() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const heartbeatRef = useRef(null);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setJsonOpen(false);
    setCopied(false);
    setSlowWarning(false);

    const slowTimer = setTimeout(() => {
      setSlowWarning(true);
    }, 30000);

    try {
      const res = await axios.post(`${API_URL}/api/v1/query`, { question });
      setResponse(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response.data);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Something went wrong. Is the backend running?");
      }
    } finally {
      clearTimeout(slowTimer);
      setSlowWarning(false);
      setLoading(false);
    }
  };

  /* ——— Lazy Heartbeat (keeps Render alive) ——— */
  useEffect(() => {
    const HEARTBEAT_INTERVAL = 13 * 60 * 1000; // 13 minutes

    const startHeartbeat = () => {
      // Ping immediately when tab becomes visible
      axios.get(`${API_URL}/api/v1/query/health`).catch(() => { });
      // Then ping every 13 minutes
      heartbeatRef.current = setInterval(() => {
        axios.get(`${API_URL}/api/v1/query/health`).catch(() => { });
      }, HEARTBEAT_INTERVAL);
    };

    const stopHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    };

    // Start heartbeat if tab is already visible on mount
    if (document.visibilityState === "visible") {
      startHeartbeat();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExample = (example) => {
    setQuestion(example);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-greeting">{getGreeting()} 👋</div>
        <h1 className="header-title">NL-SQL Engine</h1>
        <p className="header-tagline">
          Transform plain English into powerful SQL queries — instantly.
        </p>
        <div className="header-status">
          <span className="status-dot"></span>
          Engine Ready
        </div>
      </header>

      {/* Query Input */}
      <section className="query-section">
        <div className="query-card">
          <div className="query-label">
            <span className="query-label-icon">💬</span>
            Ask a question
          </div>
          <div className="query-input-wrapper">
            <textarea
              className="query-input"
              placeholder="e.g. Show me all engineers with salary above 90000..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
            />
          </div>
          <div className="query-actions">
            <span className="query-hint">
              <kbd>Enter</kbd> to run · <kbd>Shift+Enter</kbd> for new line
            </span>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={loading || !question.trim()}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  Generating...
                </>
              ) : (
                <>
                  Run Query
                  <span className="btn-icon">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="loading-skeleton">
          <div className="skeleton-card">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
          {slowWarning && (
            <div className="slow-warning">
              <span className="slow-warning-icon">☕</span>
              Render is waking up after inactivity, first request may take up to 60 seconds. Please wait...
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <div className="error-content">
            <h3>Query Failed</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {response && (
        <div className="results-section">
          {/* Generated SQL */}
          <div className="sql-card">
            <div className="sql-card-header">
              <div className="sql-card-title">
                <span>🔧</span> Generated SQL
              </div>
              <div className="sql-card-meta">
                {response.fromCache && (
                  <span className="badge badge-cache">⚡ Cached</span>
                )}
                <span className="badge badge-time">
                  {response.executionTimeMs}ms
                </span>
                <button
                  className={`copy-btn ${copied ? "copied" : ""}`}
                  onClick={() => handleCopy(response.generatedSql)}
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            </div>
            <pre className="sql-code">{response.generatedSql}</pre>
          </div>

          {/* Query Results / Error */}
          {response.error ? (
            <div className="error-card">
              <span className="error-icon">⚠️</span>
              <div className="error-content">
                <h3>Execution Error</h3>
                <p>{response.error}</p>
              </div>
            </div>
          ) : response.results && response.results.length > 0 ? (
            <div className="table-card">
              <div className="table-card-header">
                <div className="table-card-title">
                  <span>📊</span> Query Results
                </div>
                <span className="row-count">
                  {response.results.length} row{response.results.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      {Object.keys(response.results[0]).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {response.results.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              No results found for this query.
            </div>
          )}

          {/* Raw JSON Output */}
          <div className="json-card">
            <div
              className="json-card-header"
              onClick={() => setJsonOpen(!jsonOpen)}
            >
              <div className="json-card-title">
                <span>{ }</span> Raw JSON Response
              </div>
              <div className="json-toggle">
                {jsonOpen ? "Collapse" : "Expand"}
                <span className={`json-toggle-icon ${jsonOpen ? "open" : ""}`}>
                  ▾
                </span>
              </div>
            </div>
            <div className={`json-body ${jsonOpen ? "open" : ""}`}>
              <pre
                className="json-pre"
                dangerouslySetInnerHTML={{
                  __html: highlightJson(response),
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !response && (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <h3>Ask anything about your data</h3>
          <p>
            Type a question in plain English and get the SQL query with results
            instantly.
          </p>
          <div className="examples-grid">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                className="example-chip"
                onClick={() => handleExample(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <span>NL-SQL Engine · Powered by AI</span>
        <span className="footer-credit">Created by Chinmay Shivratriwar</span>
      </footer>
    </div>
  );
}