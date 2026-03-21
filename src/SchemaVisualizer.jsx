import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────
   PARSER
   Handles these common schema text formats:
   1. "Table: employees" / "TABLE employees" header + indented columns
   2. SQL DDL  "CREATE TABLE employees ( ... )"
   3. Loose key-value "employees.id INT PK"
   Returns: Array<{ name:string, columns:Array<{name,type,isPK,isFK,refTable,refCol}> }>
───────────────────────────────────────────── */
function parseSchema(raw) {
  if (!raw || typeof raw !== "string") return [];

  // ── Strategy 1: already a JSON array
  try {
    const obj = JSON.parse(raw);
    if (Array.isArray(obj)) return obj;
  } catch (_) {}

  const lines = raw.split(/\r?\n/);
  const tables = [];
  let current = null;

  // Actual backend format:
  //   Table: departments
  //   Columns:
  //     - id (integer, nullable: NO)
  //     - name (varchar, nullable: YES)
  const tableRe  = /^Table:\s+([a-z_][a-z0-9_]*)/i;
  // column:  "  - col_name (type, nullable: YES)"
  //   OR     "  - col_name type"
  const colRe    = /^[\s]*-\s+([a-z_][a-z0-9_]*)\s+(?:\(([a-z ]+)(?:,\s*nullable:\s*(YES|NO))?\)|(varchar|integer|int|bigint|numeric|decimal|float|double|boolean|bool|text|date|timestamp|uuid|json|jsonb|serial))/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "Columns:") continue;

    const tableMatch = trimmed.match(tableRe);
    if (tableMatch) {
      current = { name: tableMatch[1].toLowerCase(), columns: [] };
      tables.push(current);
      continue;
    }

    if (current) {
      const colMatch = line.match(colRe);
      if (colMatch) {
        const colName = colMatch[1].toLowerCase();
        const rawType = (colMatch[2] || colMatch[4] || "").trim().toUpperCase().split(" ")[0] || "—";
        // Heuristic PK: column literally named "id"
        const isPK = colName === "id";
        // Heuristic FK: ends with "_id" but isn't itself "id"
        const isFK = !isPK && /_id$/.test(colName);
        // Infer referenced table from col name: "department_id" → "departments"
        let refTable = null;
        if (isFK) {
          const base = colName.replace(/_id$/, "");
          // try plural: department → departments
          refTable = base + "s";
        }
        current.columns.push({ name: colName, type: rawType, isPK, isFK, refTable, refCol: isFK ? "id" : null });
      }
    }
  }

  // Fallback: raw dump as one card
  if (tables.length === 0 && raw.trim()) {
    tables.push({
      name: "schema",
      columns: raw.trim().split(/\r?\n/).filter(Boolean).map((l) => ({
        name: l.trim(), type: "", isPK: false, isFK: false, refTable: null, refCol: null,
      })),
    });
  }

  return tables;
}


/* ─────────────────────────────────────────────
   RELATIONSHIP LINES  (SVG overlay)
   Uses ResizeObserver + card refs to compute
   connector positions dynamically.
───────────────────────────────────────────── */
function RelationshipLines({ tables, cardRefs, containerRef, hoveredTable }) {
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    function recalc() {
      if (!containerRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      const newPaths = [];

      tables.forEach((srcTable) => {
        srcTable.columns.forEach((col) => {
          if (!col.isFK || !col.refTable) return;
          const srcEl = cardRefs.current[srcTable.name];
          const tgtEl = cardRefs.current[col.refTable];
          if (!srcEl || !tgtEl) return;

          const s = srcEl.getBoundingClientRect();
          const t = tgtEl.getBoundingClientRect();

          const x1 = s.right - container.left;
          const y1 = s.top + s.height / 2 - container.top;
          const x2 = t.left - container.left;
          const y2 = t.top + t.height / 2 - container.top;

          const cx = (x1 + x2) / 2;
          newPaths.push({
            id: `${srcTable.name}-${col.refTable}-${col.name}`,
            d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`,
            src: srcTable.name,
            tgt: col.refTable,
          });
        });
      });
      setPaths(newPaths);
    }

    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [tables, cardRefs, containerRef]);

  return (
    <svg className="schema-svg-overlay" aria-hidden="true">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(99,102,241,0.6)" />
        </marker>
      </defs>
      {paths.map((p) => {
        const isActive =
          !hoveredTable ||
          p.src === hoveredTable ||
          p.tgt === hoveredTable;
        return (
          <path
            key={p.id}
            d={p.d}
            className={`schema-rel-line ${isActive ? "active" : "dim"}`}
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   TABLE CARD
───────────────────────────────────────────── */
function TableCard({ table, index, cardRefs, hoveredTable, setHoveredTable }) {
  return (
    <div
      className={`sv-table-card ${
        hoveredTable && hoveredTable !== table.name ? "sv-dim" : ""
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
      ref={(el) => {
        if (el) cardRefs.current[table.name] = el;
      }}
      onMouseEnter={() => setHoveredTable(table.name)}
      onMouseLeave={() => setHoveredTable(null)}
    >
      <div className="sv-table-header">
        <span className="sv-table-icon">⬡</span>
        <span className="sv-table-name">{table.name}</span>
        <span className="sv-col-count">{table.columns.length}</span>
      </div>
      <div className="sv-col-list">
        {table.columns.map((col, i) => (
          <div key={i} className={`sv-col-row ${col.isPK ? "sv-pk" : ""} ${col.isFK ? "sv-fk" : ""}`}>
            <span className="sv-col-name">{col.name}</span>
            <div className="sv-col-badges">
              {col.type && <span className="sv-badge sv-badge-type">{col.type}</span>}
              {col.isPK && <span className="sv-badge sv-badge-pk">PK</span>}
              {col.isFK && <span className="sv-badge sv-badge-fk">FK</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function SchemaVisualizer({ schema }) {
  const tables = parseSchema(schema);
  const containerRef = useRef(null);
  const cardRefs = useRef({});
  const [hoveredTable, setHoveredTable] = useState(null);

  if (!tables.length) {
    return (
      <div className="sv-empty">No tables found in schema.</div>
    );
  }

  return (
    <div className="sv-wrapper" ref={containerRef}>
      <RelationshipLines
        tables={tables}
        cardRefs={cardRefs}
        containerRef={containerRef}
        hoveredTable={hoveredTable}
      />
      <div className="sv-grid">
        {tables.map((table, i) => (
          <TableCard
            key={table.name}
            table={table}
            index={i}
            cardRefs={cardRefs}
            hoveredTable={hoveredTable}
            setHoveredTable={setHoveredTable}
          />
        ))}
      </div>
    </div>
  );
}
