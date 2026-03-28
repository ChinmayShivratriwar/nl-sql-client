import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const DEFAULT_FORM = {
  host: "",
  port: "5432",
  dbName: "",
  username: "",
  password: "",
};

export default function DbConnectPanel({ onConnect, onDisconnect, isConnected, displayInfo }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [status, setStatus] = useState("idle"); // idle | testing | connected | error
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status === "error") setStatus("idle");
  };

  const handleTest = async () => {
    const { host, port, dbName, username, password } = form;
    if (!host || !dbName || !username) {
      setStatus("error");
      setErrorMsg("Host, Database Name and Username are required.");
      return;
    }

    setStatus("testing");
    setErrorMsg("");

    try {
      const res = await axios.post(`${API_URL}/api/v1/query/connect`, {
        host,
        port: Number(port) || 5432,
        databaseName: dbName,   // backend expects 'databaseName'
        username,
        password,
      });

      // Extract session token — backend returns { token, schema } or { sessionToken, schema }
      const token = res.data?.token ?? res.data?.sessionToken ?? null;
      if (!token) throw new Error("Backend did not return a session token.");

      // Extract schema if present
      const schema = res.data?.schema ?? null;

      // ── Wipe password from local state immediately — no longer needed ──
      setForm((prev) => ({ ...prev, password: "" }));
      setStatus("connected");

      // Pass up: token for auth, non-sensitive display info, schema
      onConnect(
        schema ? (typeof schema === "string" ? schema : JSON.stringify(schema, null, 2)) : null,
        token,
        { host, port: Number(port) || 5432, dbName, username }
      );
    } catch (err) {
      setStatus("error");
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Connection failed. Check your credentials and try again.";
      setErrorMsg(msg);
    }
  };

  const handleDisconnect = () => {
    setForm(DEFAULT_FORM);
    setStatus("idle");
    setErrorMsg("");
    onDisconnect();
  };

  const connected = status === "connected" || isConnected;
  // Non-sensitive display info comes from parent when isConnected (after re-mount),
  // or from local form state when just connected this session.
  const display = isConnected && displayInfo
    ? displayInfo
    : { host: form.host, port: form.port, dbName: form.dbName, username: form.username };

  return (
    <div className="db-connect-panel">
      {connected ? (
        /* ── Connected State ── */
        <div className="db-connect-success">
          <div className="db-connect-success-left">
            <span className="db-connect-success-dot" />
            <div>
              <div className="db-connect-success-title">Custom DB Connected</div>
              <div className="db-connect-success-sub">
                {display.username}@{display.host}:{display.port}/{display.dbName}
              </div>
            </div>
          </div>
          <button className="db-disconnect-btn" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        /* ── Form State ── */
        <>
          <div className="db-connect-form">
            {/* Row 1: Host + Port */}
            <div className="db-connect-field db-field-host">
              <label className="db-connect-label" htmlFor="db-host">Host</label>
              <input
                id="db-host"
                className="db-connect-input"
                name="host"
                type="text"
                placeholder="localhost"
                value={form.host}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="db-connect-field db-field-port">
              <label className="db-connect-label" htmlFor="db-port">Port</label>
              <input
                id="db-port"
                className="db-connect-input"
                name="port"
                type="number"
                placeholder="5432"
                value={form.port}
                onChange={handleChange}
              />
            </div>

            {/* Row 2: Database Name */}
            <div className="db-connect-field db-field-full">
              <label className="db-connect-label" htmlFor="db-name">Database Name</label>
              <input
                id="db-name"
                className="db-connect-input"
                name="dbName"
                type="text"
                placeholder="my_database"
                value={form.dbName}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            {/* Row 3: Username + Password */}
            <div className="db-connect-field db-field-half">
              <label className="db-connect-label" htmlFor="db-user">Username</label>
              <input
                id="db-user"
                className="db-connect-input"
                name="username"
                type="text"
                placeholder="postgres"
                value={form.username}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
            <div className="db-connect-field db-field-half db-password-field">
              <label className="db-connect-label" htmlFor="db-pass">Password</label>
              <div className="db-password-wrapper">
                <input
                  id="db-pass"
                  className="db-connect-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="db-show-pass-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          {/* Error message */}
          {status === "error" && (
            <div className="db-connect-error">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          {/* Action row */}
          <div className="db-connect-actions">
            <span className="db-connect-hint">
              🔒 Only a session token is stored — credentials are never cached.
            </span>
            <button
              className="db-test-btn"
              onClick={handleTest}
              disabled={status === "testing"}
            >
              {status === "testing" ? (
                <>
                  <span className="btn-spinner" />
                  Testing…
                </>
              ) : (
                <>
                  Test Connection
                  <span className="btn-icon">⚡</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
