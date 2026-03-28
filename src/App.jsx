import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";
import SchemaVisualizer from "./SchemaVisualizer";
import DbConnectPanel from "./DbConnectPanel";

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
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [schemaError, setSchemaError] = useState(null);
  const heartbeatRef = useRef(null);

  // ── Custom DB state — hydrated from sessionStorage so refresh keeps the session alive ──
  const [dbMode, setDbMode] = useState(
    () => sessionStorage.getItem("db_mode") || "default"
  );
  const [dbToken, setDbToken] = useState(
    () => sessionStorage.getItem("db_token") || null
  );
  const [dbDisplay, setDbDisplay] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("db_display")); } catch { return null; }
  });
  const [customSchema, setCustomSchema] = useState(
    () => sessionStorage.getItem("db_schema") || null
  );
  const [customDbOpen, setCustomDbOpen] = useState(false);

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
      const payload = { question };
      if (dbMode === "custom" && dbToken) {
        payload.sessionToken = dbToken;   // backend: { question, sessionToken }
      }
      const res = await axios.post(`${API_URL}/api/v1/query`, payload);
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

  /* ——— Custom DB handlers ——— */
  // schema: string | null, token: JWT string, display: { host, port, dbName, username }
  const handleDbConnect = (schema, token, display) => {
    setDbToken(token);
    setDbDisplay(display);
    setCustomSchema(schema);
    setDbMode("custom");
    setCustomDbOpen(false);
    // Persist across refresh (sessionStorage clears when tab closes)
    sessionStorage.setItem("db_token", token);
    sessionStorage.setItem("db_display", JSON.stringify(display));
    sessionStorage.setItem("db_mode", "custom");
    if (schema) sessionStorage.setItem("db_schema", schema);
    else sessionStorage.removeItem("db_schema");
  };

  const handleDbDisconnect = () => {
    // Tell backend to invalidate the session token (fire-and-forget)
    if (dbToken) {
      axios.post(`${API_URL}/api/v1/query/disconnect`, { sessionToken: dbToken }).catch(() => {});
    }
    setDbToken(null);
    setDbDisplay(null);
    setCustomSchema(null);
    setDbMode("default");
    // Clear sessionStorage
    sessionStorage.removeItem("db_token");
    sessionStorage.removeItem("db_display");
    sessionStorage.removeItem("db_mode");
    sessionStorage.removeItem("db_schema");
  };

  /* ——— Fetch Database Schema on mount ——— */
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v1/query/schema`, {
          headers: { 'X-Internal-Key': import.meta.env.VITE_SCHEMA_KEY }
        });
        // Handle both string and object responses
        const data = res.data;
        setSchema(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        setSchemaError(null);
      } catch (err) {
        console.error("Failed to fetch schema", err);
        setSchema(null);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setSchemaError(`Access denied (${status}): Check VITE_SCHEMA_KEY in your .env`);
        } else if (status) {
          setSchemaError(`Server returned ${status}: ${err.response?.data?.error || err.message}`);
        } else {
          setSchemaError("Could not reach backend. Is it running?");
        }
      } finally {
        setSchemaLoading(false);
      }
    };
    fetchSchema();
  }, []);

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

      {/* Database Schema */}
      <section className="schema-section">
        {/* ── Mode Toggle pill ── */}
        <div className="db-mode-toggle">
          <button
            className={`db-mode-btn ${dbMode === "default" ? "active" : ""}`}
            onClick={() => {
              setDbMode("default");
              if (dbMode === "custom") handleDbDisconnect();
            }}
          >
            🗄️ Default DB
          </button>
          <button
            className={`db-mode-btn ${dbMode === "custom" ? "active" : ""}`}
            onClick={() => {
              setDbMode("custom");
              // Only open the credential form if not already connected
              if (!dbToken) setCustomDbOpen(true);
            }}
          >
            🔌 Connect Custom DB
            {dbMode === "custom" && <span className="db-mode-connected-dot" />}
          </button>
        </div>

        {/* ── Default DB schema ── */}
        {dbMode === "default" && !schemaLoading && (
          schema ? (
            <div className="schema-card">
              <div
                className="schema-card-header"
                onClick={() => setSchemaOpen(!schemaOpen)}
              >
                <div className="schema-card-title">
                  <span>🗂️</span> Database Schema
                </div>
                <div className="schema-toggle">
                  {schemaOpen ? "Collapse" : "View Tables & Columns"}
                  <span className={`schema-toggle-icon ${schemaOpen ? "open" : ""}`}>
                    ▾
                  </span>
                </div>
              </div>
              <div className={`schema-body ${schemaOpen ? "open" : ""}`}>
                <SchemaVisualizer schema={schema} />
              </div>
            </div>
          ) : schemaError ? (
            <div className="schema-card">
              <div className="schema-card-header" style={{ cursor: "default" }}>
                <div className="schema-card-title">
                  <span>🗂️</span> Database Schema
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--accent-red, #f87171)" }}>Unavailable</span>
              </div>
              <div className="schema-body open" style={{ padding: "0.75rem 1rem" }}>
                <p style={{ color: "var(--accent-red, #f87171)", margin: 0, fontSize: "0.85rem" }}>⚠️ {schemaError}</p>
              </div>
            </div>
          ) : null
        )}

        {/* ── Custom DB panel ── */}
        {dbMode === "custom" && (
          <div className="schema-card">
            {/* Panel header */}
            <div
              className="schema-card-header"
              onClick={() => dbToken && setCustomDbOpen(!customDbOpen)}
              style={{ cursor: dbToken ? "pointer" : "default" }}
            >
              <div className="schema-card-title">
                <span>🔌</span> Custom Database
                {dbToken && <span className="db-connected-badge">Connected</span>}
              </div>
              {dbToken && (
                <div className="schema-toggle">
                  {customDbOpen ? "Collapse" : "Edit Connection"}
                  <span className={`schema-toggle-icon ${customDbOpen ? "open" : ""}`}>▾</span>
                </div>
              )}
            </div>

            {/* Always show form when not yet connected, or when editing */}
            <div className={`schema-body ${(!dbToken || customDbOpen) ? "open" : ""}`}>
              <DbConnectPanel
                onConnect={handleDbConnect}
                onDisconnect={handleDbDisconnect}
                isConnected={!!dbToken}
                displayInfo={dbDisplay}
              />
            </div>

            {/* Show custom schema when connected and form is collapsed */}
            {dbToken && !customDbOpen && (
              customSchema ? (
                <div>
                  <div
                    className="schema-card-header"
                    style={{ borderTop: "1px solid var(--border-primary)", cursor: "pointer" }}
                    onClick={() => setSchemaOpen(!schemaOpen)}
                  >
                    <div className="schema-card-title">
                      <span>🗂️</span> Custom DB Schema
                    </div>
                    <div className="schema-toggle">
                      {schemaOpen ? "Collapse" : "View Tables & Columns"}
                      <span className={`schema-toggle-icon ${schemaOpen ? "open" : ""}`}>▾</span>
                    </div>
                  </div>
                  <div className={`schema-body ${schemaOpen ? "open" : ""}`}>
                    <SchemaVisualizer schema={customSchema} />
                  </div>
                </div>
              ) : (
                <div className="db-no-schema-notice">
                  <span>✅</span>
                  <div>
                    <div className="db-no-schema-title">Connected — ready to query</div>
                    <div className="db-no-schema-sub">
                      No schema was returned by the connect endpoint. You can still run natural-language queries against your database.
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

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