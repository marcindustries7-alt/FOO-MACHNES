import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ─── PERSISTENCE LAYER ───────────────────────────────────────────────
// Uses localStorage so all data survives page refresh.
// Every team member on the SAME device/browser keeps their own copy.
// To share data across team members → replace the load/save functions
// below with Supabase calls (see comments marked SUPABASE UPGRADE).

const STORAGE_KEY = "foomachines_v1";

function loadData(defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    // Merge saved data with defaults (in case new keys were added)
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // ── SUPABASE UPGRADE ─────────────────────────────────────────────
    // Replace the line above with:
    //   await supabase.from('foomachines').upsert({ id: 1, data })
    // and wrap the App in an async context or use React Query.
    // Free Supabase project: https://supabase.com
    // ─────────────────────────────────────────────────────────────────
  } catch (e) {
    console.warn("Save failed:", e);
  }
}

// Auto-save hook: saves all state 1 second after any change
function usePersistedState(key, defaultValue, allState, saveAll) {
  const [value, setValueRaw] = useState(() => {
    const loaded = loadData({});
    return loaded[key] !== undefined ? loaded[key] : defaultValue;
  });
  return [value, (updater) => {
    setValueRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }];
}

// Save indicator component
function SaveBadge({ saving }) {
  return (
    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: saving ? COLORS.warning : COLORS.success, display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: saving ? COLORS.warning : COLORS.success, animation: saving ? "pulse 1s infinite" : "none" }} />
      {saving ? "Saving…" : "Saved"}
    </div>
  );
}

// ─── THEME & GLOBALS ────────────────────────────────────────────────
const COLORS = {
  bg: "#0a0c0f",
  surface: "#111418",
  card: "#161b22",
  border: "#21262d",
  accent: "#f97316",
  accentDim: "#7c3a16",
  accentGlow: "rgba(249,115,22,0.15)",
  text: "#e6edf3",
  muted: "#7d8590",
  success: "#3fb950",
  warning: "#d29922",
  danger: "#f85149",
  blue: "#58a6ff",
};

const style = (css) => css;

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${COLORS.bg}; color: ${COLORS.text}; font-family: 'Syne', sans-serif; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${COLORS.surface}; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.accentDim}; border-radius: 3px; }
  input, select, textarea { font-family: 'Syne', sans-serif; }
  button { cursor: pointer; font-family: 'Syne', sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
`;

// ─── SAMPLE DATA ─────────────────────────────────────────────────────
const SAMPLE_PRODUCTS = [
  { id: 1, name: "KE-250R Kart Exhaust", sku: "KE-250R", revision: "Rev B", category: "Kart Exhaust", demand: 25, batchSize: 5, status: "Active" },
  { id: 2, name: "ME-R6 Motorcycle Header", sku: "ME-R6", revision: "Rev A", category: "Motorcycle Exhaust", demand: 15, batchSize: 3, status: "Active" },
];

const SAMPLE_BOM = {
  1: [
    { id: 1, partNo: "KE-P-001", name: "Header Pipe", category: "Pipe", material: "SS304", description: "OD 38mm, T 1.5mm, L 450mm", qty: 1, uom: "Nos", rate: 320, stock: 40 },
    { id: 2, partNo: "KE-P-002", name: "Collector Cone", category: "Pipe", material: "SS304", description: "OD 38-60mm, T 1.5mm, L 120mm", qty: 1, uom: "Nos", rate: 210, stock: 20 },
    { id: 3, partNo: "KE-M-001", name: "Perforated Core Pipe", category: "Mesh", material: "SS304", description: "OD 40mm, T 1mm, L 300mm perf", qty: 1, uom: "Nos", rate: 185, stock: 30 },
    { id: 4, partNo: "KE-L-001", name: "Flange Plate", category: "Laser Cut", material: "SS304", description: "60x60mm, T 3mm, laser cut", qty: 2, uom: "Nos", rate: 95, stock: 60 },
    { id: 5, partNo: "KE-I-001", name: "Ceramic Wool", category: "Insulation", material: "Ceramic", description: "Bulk packing, 0.15 kg/unit", qty: 0.15, uom: "kg", rate: 480, stock: 8 },
    { id: 6, partNo: "KE-F-001", name: "M8 Spring Bolt Kit", category: "Fasteners", material: "SS", description: "M8x25 bolt + spring + nut", qty: 4, uom: "Nos", rate: 18, stock: 200 },
  ],
  2: [
    { id: 7, partNo: "ME-P-001", name: "Primary Pipe", category: "Pipe", material: "SS304", description: "OD 32mm, T 1.2mm, L 600mm", qty: 4, uom: "Nos", rate: 280, stock: 15 },
    { id: 8, partNo: "ME-L-001", name: "Header Flange", category: "Laser Cut", material: "SS304", description: "Custom profile, T 4mm", qty: 1, uom: "Nos", rate: 320, stock: 10 },
    { id: 9, partNo: "ME-P-002", name: "Collector Body", category: "Pipe", material: "SS304", description: "OD 50mm, T 1.5mm, L 180mm", qty: 1, uom: "Nos", rate: 265, stock: 12 },
    { id: 10, partNo: "ME-F-001", name: "Gasket", category: "Fasteners", material: "SS304", description: "OD 40mm gasket", qty: 4, uom: "Nos", rate: 35, stock: 80 },
  ]
};

const SAMPLE_PROCESSES = {
  1: [
    { id: 1, name: "Pipe Cutting", type: "In-house", vendor: "", cost: 45 },
    { id: 2, name: "TIG Welding", type: "In-house", vendor: "", cost: 180 },
    { id: 3, name: "Bending", type: "In-house", vendor: "", cost: 60 },
    { id: 4, name: "Polishing", type: "Outsourced", vendor: "Shine Metals Pvt Ltd", cost: 120 },
    { id: 5, name: "Packing", type: "In-house", vendor: "", cost: 25 },
  ],
  2: [
    { id: 6, name: "Pipe Cutting", type: "In-house", vendor: "", cost: 80 },
    { id: 7, name: "TIG Welding", type: "In-house", vendor: "", cost: 350 },
    { id: 8, name: "Polishing", type: "Outsourced", vendor: "Shine Metals Pvt Ltd", cost: 180 },
    { id: 9, name: "Packing", type: "In-house", vendor: "", cost: 35 },
  ]
};

const SAMPLE_VENDORS = [
  { id: 1, name: "Kapoor Steel Works", category: "Steel", contact: "Rajiv Kapoor | +91-98765-43210", email: "rajiv@kapoorsteel.com", pricing: "SS304 pipes from ₹280/m" },
  { id: 2, name: "Shine Metals Pvt Ltd", category: "Polishing", contact: "Meena S | +91-90123-45678", email: "meena@shinemetals.com", pricing: "Polishing ₹100–200/unit" },
  { id: 3, name: "LaserTech CNC", category: "Laser", contact: "Ajay Nair | +91-87654-32109", email: "ajay@lasertech.in", pricing: "Laser cutting ₹85–320/part" },
  { id: 4, name: "FastFix Fasteners", category: "Steel", contact: "Priya M | +91-99887-65432", email: "priya@fastfix.in", pricing: "Bulk M8 bolts ₹15–20/pc" },
];

const SAMPLE_INVENTORY = [
  { id: 1, name: "SS304 Pipe OD38mm", category: "Pipe", stock: 12, reorder: 5, unit: "meters" },
  { id: 2, name: "SS304 Pipe OD32mm", category: "Pipe", stock: 3, reorder: 5, unit: "meters" },
  { id: 3, name: "Perf Sheet 8x4ft", category: "Mesh", stock: 2, reorder: 2, unit: "sheets" },
  { id: 4, name: "Ceramic Wool", category: "Insulation", stock: 8, reorder: 10, unit: "kg" },
  { id: 5, name: "M8 Spring Bolt Kit", category: "Fasteners", stock: 200, reorder: 100, unit: "sets" },
];

// ─── UTILS ───────────────────────────────────────────────────────────
const fmt = (n) => typeof n === "number" ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtN = (n) => typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—";

function parseInventorCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map(h => h.replace(/["']/g, "").trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.replace(/["']/g, "").trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
    rows.push(row);
  }
  const mapField = (row, keys) => keys.map(k => row[k]).find(v => v && v.trim()) || "";
  return rows.filter(r => mapField(r, ["part number", "item number", "part no", "partno", "number"])).map((row, i) => ({
    id: i + 1,
    partNo: mapField(row, ["part number", "item number", "part no", "partno", "number"]),
    name: mapField(row, ["description", "part name", "name", "component"]),
    category: guessCategory(mapField(row, ["description", "part name", "name", "type", "category"])),
    material: mapField(row, ["material", "mat", "material spec"]) || "SS304",
    description: mapField(row, ["description", "notes", "remark", "dimensions"]),
    qty: parseFloat(mapField(row, ["qty", "quantity", "amount"])) || 1,
    uom: mapField(row, ["unit", "uom", "units"]) || "Nos",
    rate: parseFloat(mapField(row, ["rate", "unit price", "cost", "price"])) || 0,
    stock: 0,
  }));
}

function guessCategory(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("pipe") || d.includes("tube") || d.includes("elbow") || d.includes("bend")) return "Pipe";
  if (d.includes("mesh") || d.includes("perf") || d.includes("sheet")) return "Mesh";
  if (d.includes("laser") || d.includes("flange") || d.includes("bracket") || d.includes("plate")) return "Laser Cut";
  if (d.includes("bolt") || d.includes("nut") || d.includes("screw") || d.includes("washer") || d.includes("spring")) return "Fasteners";
  if (d.includes("wool") || d.includes("ceramic") || d.includes("insul")) return "Insulation";
  return "Others";
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: color + "22", color, border: `1px solid ${color}44`, letterSpacing: 1 }}>{label}</span>
);

const Tag = ({ label }) => {
  const map = { Active: COLORS.success, Inactive: COLORS.muted, "In-house": COLORS.blue, Outsourced: COLORS.warning, Planned: COLORS.muted, "In Progress": COLORS.warning, Completed: COLORS.success };
  return <Badge label={label} color={map[label] || COLORS.muted} />;
};

const Card = ({ children, style: s }) => (
  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "20px 24px", ...s }}>{children}</div>
);

const SectionTitle = ({ icon, title, sub }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: COLORS.text }}>{title}</span>
    </div>
    {sub && <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4, marginLeft: 32 }}>{sub}</div>}
  </div>
);

const Btn = ({ onClick, children, variant = "primary", small }) => {
  const base = { border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne',sans-serif", fontSize: small ? 12 : 14, padding: small ? "5px 12px" : "9px 18px", transition: "all 0.15s" };
  const variants = {
    primary: { background: COLORS.accent, color: "#fff" },
    ghost: { background: "transparent", color: COLORS.accent, border: `1px solid ${COLORS.accentDim}` },
    danger: { background: COLORS.danger + "22", color: COLORS.danger, border: `1px solid ${COLORS.danger}44` },
    success: { background: COLORS.success + "22", color: COLORS.success, border: `1px solid ${COLORS.success}44` },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
};

const Input = ({ value, onChange, placeholder, type = "text", small }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, padding: small ? "5px 10px" : "8px 12px", fontSize: small ? 12 : 14, width: "100%", outline: "none" }} />
);

const Select = ({ value, onChange, options, small }) => (
  <select value={value} onChange={onChange}
    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, padding: small ? "5px 10px" : "8px 12px", fontSize: small ? 12 : 14, width: "100%", outline: "none" }}>
    {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
  </select>
);

const TH = ({ children }) => (
  <th style={{ padding: "9px 12px", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}`, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</th>
);
const TD = ({ children, mono, right, accent }) => (
  <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: mono ? "'JetBrains Mono',monospace" : "'Syne',sans-serif", color: accent ? COLORS.accent : COLORS.text, textAlign: right ? "right" : "left", borderBottom: `1px solid ${COLORS.border}18` }}>{children}</td>
);

// ─── MODULE: DASHBOARD ───────────────────────────────────────────────
function Dashboard({ products, bom, processes, inventory, pos }) {
  const stats = products.map(p => {
    const parts = bom[p.id] || [];
    const matCost = parts.reduce((s, part) => s + part.qty * part.rate, 0);
    const procCost = (processes[p.id] || []).reduce((s, pr) => s + pr.cost, 0);
    const cogs = matCost + procCost;
    return { ...p, matCost, procCost, cogs };
  });

  const totalDemand = products.reduce((s, p) => s + p.demand, 0);
  const lowStock = inventory.filter(i => i.stock <= i.reorder);
  const activePOs = pos.filter(p => p.status !== "Completed");

  return (
    <div>
      <SectionTitle icon="⚡" title="Dashboard" sub="FOOMACHINES — Live Overview" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Active Products", value: products.filter(p => p.status === "Active").length, icon: "📦", color: COLORS.blue },
          { label: "Monthly Units", value: totalDemand, icon: "🔩", color: COLORS.accent },
          { label: "Low Stock Alerts", value: lowStock.length, icon: "⚠️", color: lowStock.length ? COLORS.danger : COLORS.success },
          { label: "Open POs", value: activePOs.length, icon: "📋", color: COLORS.warning },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>💰 Cost Per Product</div>
          {stats.map(p => (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>{p.name}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: COLORS.accent, fontSize: 13 }}>{fmt(p.cogs)}</span>
              </div>
              <div style={{ height: 4, background: COLORS.border, borderRadius: 2 }}>
                <div style={{ height: 4, background: COLORS.accent, borderRadius: 2, width: `${Math.min(100, p.cogs / 30)}%`, transition: "width 0.6s" }} />
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>⚠️ Stock Alerts</div>
          {inventory.map(i => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "8px 12px", background: i.stock <= i.reorder ? COLORS.danger + "11" : COLORS.surface, borderRadius: 6, border: `1px solid ${i.stock <= i.reorder ? COLORS.danger + "44" : COLORS.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{i.name}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{i.category}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", color: i.stock <= i.reorder ? COLORS.danger : COLORS.success, fontWeight: 700 }}>{i.stock} {i.unit}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>min {i.reorder}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── MODULE: BOM IMPORT ──────────────────────────────────────────────
function BOMImport({ onImport }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [productName, setProductName] = useState("");
  const [productSKU, setProductSKU] = useState("");
  const [category, setCategory] = useState("Kart Exhaust");
  const [status, setStatus] = useState("");

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseInventorCSV(text);
      setPreview(parsed);
      if (!status) setStatus("✅ " + parsed.length + " parts parsed from " + file.name);
    };
    reader.readAsText(file);
  }, [status]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    if (!preview || !productName) return;
    onImport({ name: productName, sku: productSKU, category, parts: preview });
    setPreview(null); setProductName(""); setProductSKU(""); setStatus("🎉 Imported!");
  };

  const catColors = { Pipe: COLORS.blue, Mesh: COLORS.accent, "Laser Cut": "#a371f7", Fasteners: COLORS.warning, Insulation: COLORS.success, Others: COLORS.muted };

  return (
    <div>
      <SectionTitle icon="📥" title="BOM Import" sub="Upload Autodesk Inventor BOM export (CSV/TXT/XLS)" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ marginBottom: 8, fontSize: 13, color: COLORS.muted }}>Product Name *</div>
          <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. KE-250R Kart Exhaust" />
        </div>
        <div>
          <div style={{ marginBottom: 8, fontSize: 13, color: COLORS.muted }}>Product SKU</div>
          <Input value={productSKU} onChange={e => setProductSKU(e.target.value)} placeholder="e.g. KE-250R" />
        </div>
        <div>
          <div style={{ marginBottom: 8, fontSize: 13, color: COLORS.muted }}>Category</div>
          <Select value={category} onChange={e => setCategory(e.target.value)} options={["Kart Exhaust", "Motorcycle Exhaust"]} />
        </div>
      </div>

      <label
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        style={{ display: "block", border: `2px dashed ${dragOver ? COLORS.accent : COLORS.border}`, borderRadius: 10, padding: 40, textAlign: "center", cursor: "pointer", background: dragOver ? COLORS.accentGlow : COLORS.surface, transition: "all 0.2s", marginBottom: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Drop Inventor BOM file here</div>
        <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>Supports CSV, TXT (tab-separated) · Drag & drop or click to browse</div>
        <input type="file" accept=".csv,.txt,.tsv" onChange={handleChange} style={{ display: "none" }} />
        <div style={{ marginTop: 12 }}>
          <span style={{ background: COLORS.accent, color: "#fff", padding: "7px 20px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>Browse File</span>
        </div>
      </label>

      {status && <div style={{ padding: "10px 16px", borderRadius: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, marginBottom: 16, fontSize: 13, color: COLORS.success }}>{status}</div>}

      {preview && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>Preview — {preview.length} Parts</div>
              <Btn onClick={handleImport} variant="primary">✅ Confirm & Import</Btn>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><TH>Part No</TH><TH>Name</TH><TH>Category</TH><TH>Material</TH><TH>Qty</TH><TH>UOM</TH><TH>Rate</TH></tr></thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i}>
                      <TD mono>{p.partNo}</TD>
                      <TD>{p.name}</TD>
                      <TD><Badge label={p.category} color={catColors[p.category] || COLORS.muted} /></TD>
                      <TD mono>{p.material}</TD>
                      <TD mono right>{p.qty}</TD>
                      <TD>{p.uom}</TD>
                      <TD mono accent>{p.rate > 0 ? fmt(p.rate) : <span style={{ color: COLORS.warning }}>Set rate</span>}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div style={{ padding: "12px 16px", background: COLORS.warning + "11", border: `1px solid ${COLORS.warning}44`, borderRadius: 8, fontSize: 13, color: COLORS.warning }}>
            💡 After import, go to <strong>Product Master</strong> → <strong>BOM</strong> to set rates for parts with ₹0. Categories are auto-detected from part names.
          </div>
        </>
      )}
    </div>
  );
}

// ─── MODULE: PRODUCT MASTER ──────────────────────────────────────────
function ProductMaster({ products, setProducts, bom, setBom, processes, setProcesses }) {
  const [selected, setSelected] = useState(null);
  const [editingBOM, setEditingBOM] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newP, setNewP] = useState({ name: "", sku: "", revision: "Rev A", category: "Kart Exhaust", demand: 20, batchSize: 5, status: "Active" });

  const addProduct = () => {
    const id = Date.now();
    setProducts(ps => [...ps, { ...newP, id }]);
    setBom(b => ({ ...b, [id]: [] }));
    setProcesses(pr => ({ ...pr, [id]: [] }));
    setNewP({ name: "", sku: "", revision: "Rev A", category: "Kart Exhaust", demand: 20, batchSize: 5, status: "Active" });
    setShowAdd(false);
  };

  const selProd = products.find(p => p.id === selected);
  const selBOM = bom[selected] || [];
  const selProc = processes[selected] || [];
  const matCost = selBOM.reduce((s, p) => s + p.qty * p.rate, 0);
  const procCost = selProc.reduce((s, p) => s + p.cost, 0);

  const addBOMRow = () => {
    setBom(b => ({ ...b, [selected]: [...(b[selected] || []), { id: Date.now(), partNo: "", name: "", category: "Pipe", material: "SS304", description: "", qty: 1, uom: "Nos", rate: 0, stock: 0 }] }));
  };

  const updateBOM = (rowId, field, val) => {
    setBom(b => ({ ...b, [selected]: b[selected].map(r => r.id === rowId ? { ...r, [field]: field === "qty" || field === "rate" ? parseFloat(val) || 0 : val } : r) }));
  };

  const addProcRow = () => {
    setProcesses(pr => ({ ...pr, [selected]: [...(pr[selected] || []), { id: Date.now(), name: "", type: "In-house", vendor: "", cost: 0 }] }));
  };

  const updateProc = (rowId, field, val) => {
    setProcesses(pr => ({ ...pr, [selected]: pr[selected].map(r => r.id === rowId ? { ...r, [field]: field === "cost" ? parseFloat(val) || 0 : val } : r) }));
  };

  const catColors = { Pipe: COLORS.blue, Mesh: COLORS.accent, "Laser Cut": "#a371f7", Fasteners: COLORS.warning, Insulation: COLORS.success, Others: COLORS.muted };

  return (
    <div>
      <SectionTitle icon="📦" title="Product Master" sub="Manage products, BOM & process costing" />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600 }}>PRODUCTS</span>
            <Btn onClick={() => setShowAdd(v => !v)} small>{showAdd ? "✕ Cancel" : "+ Add"}</Btn>
          </div>

          {showAdd && (
            <Card style={{ marginBottom: 12 }}>
              {[["Product Name", "name", "text"], ["SKU", "sku", "text"]].map(([label, field, type]) => (
                <div key={field} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>{label}</div>
                  <Input small value={newP[field]} onChange={e => setNewP(v => ({ ...v, [field]: e.target.value }))} />
                </div>
              ))}
              {[["Revision", "revision", ["Rev A", "Rev B", "Rev C"]], ["Category", "category", ["Kart Exhaust", "Motorcycle Exhaust"]], ["Status", "status", ["Active", "Inactive"]]].map(([label, field, opts]) => (
                <div key={field} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>{label}</div>
                  <Select small value={newP[field]} onChange={e => setNewP(v => ({ ...v, [field]: e.target.value }))} options={opts} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[["Monthly Demand", "demand"], ["Batch Size", "batchSize"]].map(([label, field]) => (
                  <div key={field}>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>{label}</div>
                    <Input small type="number" value={newP[field]} onChange={e => setNewP(v => ({ ...v, [field]: parseInt(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
              <Btn onClick={addProduct}>✅ Create Product</Btn>
            </Card>
          )}

          {products.map(p => (
            <div key={p.id} onClick={() => { setSelected(p.id); setEditingBOM(false); }}
              style={{ padding: "12px 14px", borderRadius: 8, marginBottom: 8, cursor: "pointer", border: `1px solid ${selected === p.id ? COLORS.accent : COLORS.border}`, background: selected === p.id ? COLORS.accentGlow : COLORS.surface, transition: "all 0.15s" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>{p.sku} · {p.revision}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <Tag label={p.status} />
                <Badge label={p.category.split(" ")[0]} color={COLORS.blue} />
              </div>
            </div>
          ))}
        </div>

        <div>
          {!selProd ? (
            <Card style={{ textAlign: "center", padding: 60, color: COLORS.muted }}>
              <div style={{ fontSize: 48 }}>👈</div>
              <div style={{ marginTop: 12 }}>Select a product to view details</div>
            </Card>
          ) : (
            <>
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>{selProd.name}</div>
                    <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{selProd.sku} · {selProd.revision} · {selProd.category}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Tag label={selProd.status} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 16 }}>
                  {[["Monthly Demand", selProd.demand + " units"], ["Batch Size", selProd.batchSize + " units"], ["Material Cost", fmt(matCost)], ["Process Cost", fmt(procCost)]].map(([k, v]) => (
                    <div key={k} style={{ padding: "10px 14px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{k}</div>
                      <div style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: COLORS.accent, marginTop: 4 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <Btn onClick={() => setEditingBOM(false)} variant={!editingBOM ? "primary" : "ghost"}>📋 BOM</Btn>
                <Btn onClick={() => setEditingBOM(true)} variant={editingBOM ? "primary" : "ghost"}>⚙️ Process Costing</Btn>
              </div>

              {!editingBOM ? (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700 }}>Bill of Materials</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: COLORS.accent, fontSize: 14 }}>Total: {fmt(matCost)}</span>
                      <Btn onClick={addBOMRow} small>+ Part</Btn>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead><tr><TH>Part No</TH><TH>Name</TH><TH>Cat</TH><TH>Material</TH><TH>Description</TH><TH>Qty</TH><TH>UOM</TH><TH>Rate</TH><TH>Cost</TH></tr></thead>
                      <tbody>
                        {selBOM.map(row => (
                          <tr key={row.id}>
                            <TD><input value={row.partNo} onChange={e => updateBOM(row.id, "partNo", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, width: 90 }} /></TD>
                            <TD><input value={row.name} onChange={e => updateBOM(row.id, "name", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 13, width: 130 }} /></TD>
                            <TD>
                              <select value={row.category} onChange={e => updateBOM(row.id, "category", e.target.value)}
                                style={{ background: "transparent", border: "none", color: catColors[row.category] || COLORS.muted, fontSize: 12, fontWeight: 700 }}>
                                {["Pipe", "Mesh", "Laser Cut", "Fasteners", "Insulation", "Others"].map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </TD>
                            <TD><input value={row.material} onChange={e => updateBOM(row.id, "material", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 12, width: 70 }} /></TD>
                            <TD><input value={row.description} onChange={e => updateBOM(row.id, "description", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.muted, fontSize: 12, width: 150 }} /></TD>
                            <TD><input type="number" value={row.qty} onChange={e => updateBOM(row.id, "qty", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, width: 50, textAlign: "right" }} /></TD>
                            <TD>
                              <select value={row.uom} onChange={e => updateBOM(row.id, "uom", e.target.value)}
                                style={{ background: "transparent", border: "none", color: COLORS.muted, fontSize: 12 }}>
                                {["Nos", "mm", "m", "kg", "sheets"].map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </TD>
                            <TD><input type="number" value={row.rate} onChange={e => updateBOM(row.id, "rate", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, width: 70, textAlign: "right" }} /></TD>
                            <TD mono accent right>{fmt(row.qty * row.rate)}</TD>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={8} style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.muted }}>TOTAL MATERIAL COST</td>
                          <td style={{ padding: "12px 12px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 16, color: COLORS.accent }}>{fmt(matCost)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700 }}>Process Costing</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: COLORS.accent, fontSize: 14 }}>Total: {fmt(procCost)}</span>
                      <Btn onClick={addProcRow} small>+ Process</Btn>
                    </div>
                  </div>
                  <table>
                    <thead><tr><TH>Process</TH><TH>Type</TH><TH>Vendor</TH><TH>Cost/Unit</TH></tr></thead>
                    <tbody>
                      {selProc.map(row => (
                        <tr key={row.id}>
                          <TD><input value={row.name} onChange={e => updateProc(row.id, "name", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 13, width: 140 }} /></TD>
                          <TD>
                            <select value={row.type} onChange={e => updateProc(row.id, "type", e.target.value)}
                              style={{ background: "transparent", border: "none", color: row.type === "In-house" ? COLORS.blue : COLORS.warning, fontWeight: 700, fontSize: 13 }}>
                              <option>In-house</option><option>Outsourced</option>
                            </select>
                          </TD>
                          <TD><input value={row.vendor} onChange={e => updateProc(row.id, "vendor", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.muted, fontSize: 12, width: 160 }} placeholder="—" /></TD>
                          <TD><input type="number" value={row.cost} onChange={e => updateProc(row.id, "cost", e.target.value)} style={{ background: "transparent", border: "none", color: COLORS.accent, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, width: 90 }} /></TD>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: COLORS.muted }}>TOTAL PROCESS COST</td>
                        <td style={{ padding: "12px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: COLORS.accent, fontSize: 16 }}>{fmt(procCost)}</td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODULE: COST SUMMARY ─────────────────────────────────────────────
function CostSummary({ products, bom, processes }) {
  const [selected, setSelected] = useState(products[0]?.id || null);
  const [overhead, setOverhead] = useState(12);
  const [transport, setTransport] = useState(150);
  const [margin, setMargin] = useState(35);
  const [oemDisc, setOemDisc] = useState(20);
  const [dealerDisc, setDealerDisc] = useState(10);

  const selProd = products.find(p => p.id === selected);
  const selBOM = bom[selected] || [];
  const selProc = processes[selected] || [];
  const matCost = selBOM.reduce((s, p) => s + p.qty * p.rate, 0);
  const procCost = selProc.reduce((s, p) => s + p.cost, 0);
  const overheadAmt = matCost * overhead / 100;
  const cogs = matCost + procCost + overheadAmt + transport;
  const retailPrice = cogs / (1 - margin / 100);
  const dealerPrice = retailPrice * (1 - dealerDisc / 100);
  const oemPrice = retailPrice * (1 - oemDisc / 100);
  const profit = retailPrice - cogs;
  const profitPct = (profit / retailPrice * 100);

  return (
    <div>
      <SectionTitle icon="💰" title="Cost Summary" sub="Auto-calculated COGS, margins, and pricing" />
      <div style={{ marginBottom: 16 }}>
        <Select value={selected || ""} onChange={e => setSelected(parseInt(e.target.value))} options={products.map(p => ({ value: p.id, label: p.name }))} />
      </div>

      {selProd && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>📊 Cost Breakdown</div>
              {[
                ["Material Cost", matCost, COLORS.blue],
                ["Process Cost", procCost, COLORS.warning],
                ["Overheads", overheadAmt, "#a371f7"],
                ["Transport & Logistics", transport, COLORS.accent],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "10px 14px", background: COLORS.surface, borderRadius: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                    <span style={{ fontSize: 14 }}>{label}</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color }}>{fmt(val)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: COLORS.border, margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: COLORS.accentGlow, borderRadius: 6, border: `1px solid ${COLORS.accent}44` }}>
                <span style={{ fontWeight: 700 }}>Total COGS</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: COLORS.accent, fontSize: 18 }}>{fmt(cogs)}</span>
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>⚙️ Adjustments</div>
              {[
                ["Overhead %", overhead, setOverhead],
                ["Transport ₹", transport, setTransport],
                ["Margin %", margin, setMargin],
                ["OEM Discount %", oemDisc, setOemDisc],
                ["Dealer Discount %", dealerDisc, setDealerDisc],
              ].map(([label, val, setter]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: COLORS.muted }}>{label}</span>
                  <input type="number" value={val} onChange={e => setter(parseFloat(e.target.value) || 0)}
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.accent, padding: "5px 10px", fontSize: 14, fontFamily: "'JetBrains Mono',monospace", width: 90, textAlign: "right" }} />
                </div>
              ))}
            </Card>
          </div>

          <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>🏷️ Pricing</div>
              {[
                ["Retail Price", retailPrice, COLORS.success, "MRP / End customer"],
                ["Dealer Price", dealerPrice, COLORS.blue, `${dealerDisc}% off retail`],
                ["OEM Price", oemPrice, COLORS.warning, `${oemDisc}% off retail`],
              ].map(([label, val, color, note]) => (
                <div key={label} style={{ padding: "16px 20px", background: COLORS.surface, borderRadius: 8, marginBottom: 12, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{note}</div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22, color }}>{fmt(val)}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>📈 Profit Analysis</div>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: profit > 0 ? COLORS.success : COLORS.danger }}>{fmt(profit)}</div>
                <div style={{ color: COLORS.muted, marginTop: 4 }}>Profit per unit (Retail)</div>
                <div style={{ marginTop: 16, fontSize: 28, fontWeight: 800, color: profitPct > 20 ? COLORS.success : COLORS.warning, fontFamily: "'JetBrains Mono',monospace" }}>{profitPct.toFixed(1)}%</div>
                <div style={{ color: COLORS.muted, fontSize: 13 }}>Margin on selling price</div>
              </div>
              <div style={{ height: 8, background: COLORS.border, borderRadius: 4, marginTop: 12 }}>
                <div style={{ height: 8, background: profitPct > 20 ? COLORS.success : COLORS.warning, borderRadius: 4, width: `${Math.min(100, profitPct)}%` }} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MODULE: PROCUREMENT ─────────────────────────────────────────────
function Procurement({ products, bom, inventory, setPOs }) {
  const [selected, setSelected] = useState(products[0]?.id || null);
  const [qty, setQty] = useState(25);
  const [wastage, setWastage] = useState(8);
  const [plan, setPlan] = useState(null);

  const calculate = () => {
    const parts = bom[selected] || [];
    const result = parts.map(part => {
      const required = part.qty * qty;
      const withWaste = required * (1 + wastage / 100);
      let purchaseQty = withWaste;
      let purchaseUnit = part.uom;
      let purchaseNote = "";

      if (part.category === "Pipe") {
        const meters = withWaste * (parseFloat(part.description?.match(/L\s*(\d+)/i)?.[1] || 450) / 1000);
        purchaseQty = Math.ceil(meters / 6);
        purchaseUnit = "6m bars";
        purchaseNote = `${meters.toFixed(2)}m needed`;
      } else if (part.category === "Mesh") {
        purchaseQty = Math.ceil(withWaste / 4);
        purchaseUnit = "8×4ft sheets";
        purchaseNote = `~${withWaste.toFixed(0)} pcs per sheet`;
      } else if (part.category === "Insulation") {
        purchaseQty = Math.ceil(withWaste / 15) * 15;
        purchaseUnit = "kg";
        purchaseNote = "bulk 15kg sacks";
      } else if (part.category === "Fasteners") {
        purchaseQty = Math.ceil(withWaste / 50) * 50;
        purchaseUnit = "pcs";
        purchaseNote = "bulk pack";
      } else if (part.category === "Laser Cut") {
        purchaseQty = Math.ceil(withWaste);
        purchaseUnit = "pcs";
        purchaseNote = "outsourced nesting";
      }

      const stockItem = inventory.find(i => i.name.toLowerCase().includes(part.name.toLowerCase().substring(0, 8)));
      const available = stockItem?.stock || 0;
      const toOrder = Math.max(0, purchaseQty - available);

      return { ...part, required: required.toFixed(2), withWaste: withWaste.toFixed(2), purchaseQty, purchaseUnit, purchaseNote, available, toOrder };
    });
    setPlan(result);
  };

  const generatePO = () => {
    if (!plan) return;
    const items = plan.filter(p => p.toOrder > 0).map(p => ({ name: p.name, qty: p.toOrder, unit: p.purchaseUnit, rate: p.rate, total: p.toOrder * p.rate }));
    const newPO = { id: Date.now(), product: products.find(p => p.id === selected)?.name, date: new Date().toLocaleDateString("en-IN"), items, status: "Pending", total: items.reduce((s, i) => s + i.total, 0) };
    setPOs(pos => [...pos, newPO]);
    alert("✅ Purchase Order created! View in PO Management tab.");
  };

  return (
    <div>
      <SectionTitle icon="🔄" title="Procurement Planning" sub="Raw material requirements with 6m pipe & sheet optimization" />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>Product</div>
            <Select value={selected || ""} onChange={e => setSelected(parseInt(e.target.value))} options={products.map(p => ({ value: p.id, label: p.name }))} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>Production Qty</div>
            <Input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>Wastage %</div>
            <Input type="number" value={wastage} onChange={e => setWastage(parseFloat(e.target.value) || 0)} />
          </div>
          <Btn onClick={calculate}>Calculate</Btn>
        </div>
      </Card>

      {plan && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>Procurement Plan — {qty} units</div>
              <Btn onClick={generatePO} variant="success">📋 Generate PO</Btn>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><TH>Part</TH><TH>Category</TH><TH>Required</TH><TH>+Waste</TH><TH>Purchase Qty</TH><TH>Unit</TH><TH>Note</TH><TH>In Stock</TH><TH>To Order</TH></tr></thead>
                <tbody>
                  {plan.map(row => (
                    <tr key={row.id} style={{ background: row.toOrder > 0 ? COLORS.warning + "08" : "transparent" }}>
                      <TD>{row.name}</TD>
                      <TD><Badge label={row.category} color={{ Pipe: COLORS.blue, Mesh: COLORS.accent, "Laser Cut": "#a371f7", Fasteners: COLORS.warning, Insulation: COLORS.success, Others: COLORS.muted }[row.category] || COLORS.muted} /></TD>
                      <TD mono right>{row.required}</TD>
                      <TD mono right>{row.withWaste}</TD>
                      <TD mono right style={{ color: COLORS.accent }}>{fmtN(row.purchaseQty)}</TD>
                      <TD>{row.purchaseUnit}</TD>
                      <TD style={{ fontSize: 11, color: COLORS.muted }}>{row.purchaseNote}</TD>
                      <TD mono right style={{ color: row.available > 0 ? COLORS.success : COLORS.muted }}>{row.available}</TD>
                      <TD mono right style={{ color: row.toOrder > 0 ? COLORS.danger : COLORS.success, fontWeight: 700 }}>{row.toOrder > 0 ? row.toOrder : "✓"}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div style={{ padding: "12px 16px", background: COLORS.blue + "11", border: `1px solid ${COLORS.blue}33`, borderRadius: 8, fontSize: 13, color: COLORS.blue }}>
            🔧 <strong>Pipe optimization:</strong> Calculated in 6m standard bars &nbsp;·&nbsp; <strong>Sheet optimization:</strong> Mesh in 8×4ft sheets &nbsp;·&nbsp; <strong>Insulation:</strong> Rounded to 15kg sacks
          </div>
        </>
      )}
    </div>
  );
}

// ─── MODULE: INVENTORY ────────────────────────────────────────────────
function Inventory({ inventory, setInventory }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Pipe", stock: 0, reorder: 5, unit: "Nos" });

  const addItem = () => {
    setInventory(inv => [...inv, { ...newItem, id: Date.now(), stock: parseFloat(newItem.stock) || 0, reorder: parseFloat(newItem.reorder) || 0 }]);
    setNewItem({ name: "", category: "Pipe", stock: 0, reorder: 5, unit: "Nos" });
    setShowAdd(false);
  };

  const updateStock = (id, delta) => {
    setInventory(inv => inv.map(i => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i));
  };

  return (
    <div>
      <SectionTitle icon="🏭" title="Inventory Management" sub="Live stock levels with reorder alerts" />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn onClick={() => setShowAdd(v => !v)}>{showAdd ? "✕ Cancel" : "+ Add Item"}</Btn>
      </div>

      {showAdd && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            {[["Item Name", "name", "text"], ["Current Stock", "stock", "number"], ["Reorder Level", "reorder", "number"], ["Unit", "unit", "text"]].map(([label, field, type]) => (
              <div key={field}>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>{label}</div>
                <Input type={type} value={newItem[field]} onChange={e => setNewItem(v => ({ ...v, [field]: e.target.value }))} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Category</div>
              <Select value={newItem.category} onChange={e => setNewItem(v => ({ ...v, category: e.target.value }))} options={["Pipe", "Mesh", "Laser Cut", "Fasteners", "Insulation", "Others"]} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={addItem}>✅ Add Item</Btn></div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {inventory.map(item => {
          const pct = Math.min(100, (item.stock / (item.reorder * 3)) * 100);
          const low = item.stock <= item.reorder;
          return (
            <Card key={item.id} style={{ border: `1px solid ${low ? COLORS.danger + "55" : COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3 }}>{item.category}</div>
                </div>
                {low && <Badge label="LOW" color={COLORS.danger} />}
              </div>
              <div style={{ height: 6, background: COLORS.border, borderRadius: 3, marginBottom: 10 }}>
                <div style={{ height: 6, background: low ? COLORS.danger : COLORS.success, borderRadius: 3, width: `${pct}%`, transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color: low ? COLORS.danger : COLORS.success }}>{item.stock} <span style={{ fontSize: 13, color: COLORS.muted, fontWeight: 400 }}>{item.unit}</span></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => updateStock(item.id, -1)} style={{ background: COLORS.danger + "22", border: `1px solid ${COLORS.danger}44`, borderRadius: 4, color: COLORS.danger, padding: "4px 10px", fontWeight: 700, cursor: "pointer" }}>−</button>
                  <button onClick={() => updateStock(item.id, 1)} style={{ background: COLORS.success + "22", border: `1px solid ${COLORS.success}44`, borderRadius: 4, color: COLORS.success, padding: "4px 10px", fontWeight: 700, cursor: "pointer" }}>+</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>Reorder at {item.reorder} {item.unit}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── MODULE: VENDORS ─────────────────────────────────────────────────
function Vendors({ vendors, setVendors }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newV, setNewV] = useState({ name: "", category: "Steel", contact: "", email: "", pricing: "" });

  const addVendor = () => {
    setVendors(vs => [...vs, { ...newV, id: Date.now() }]);
    setNewV({ name: "", category: "Steel", contact: "", email: "", pricing: "" });
    setShowAdd(false);
  };

  const catIcons = { Steel: "🔩", Laser: "⚡", Fabrication: "🔧", Polishing: "✨" };

  return (
    <div>
      <SectionTitle icon="🏪" title="Vendor Management" sub="Suppliers for steel, laser cutting, fabrication & polishing" />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn onClick={() => setShowAdd(v => !v)}>{showAdd ? "✕ Cancel" : "+ Add Vendor"}</Btn>
      </div>

      {showAdd && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {[["Vendor Name", "name"], ["Contact", "contact"], ["Email", "email"], ["Pricing Ref", "pricing"]].map(([label, field]) => (
              <div key={field}>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>{label}</div>
                <Input value={newV[field]} onChange={e => setNewV(v => ({ ...v, [field]: e.target.value }))} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>Category</div>
              <Select value={newV.category} onChange={e => setNewV(v => ({ ...v, category: e.target.value }))} options={["Steel", "Laser", "Fabrication", "Polishing", "Insulation", "Fasteners"]} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={addVendor}>✅ Add Vendor</Btn></div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {vendors.map(v => (
          <Card key={v.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: COLORS.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{catIcons[v.category] || "🏭"}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</div>
                <Badge label={v.category} color={COLORS.accent} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>
              <div>📞 {v.contact}</div>
              <div>✉️ {v.email}</div>
              <div style={{ marginTop: 8, padding: "8px 12px", background: COLORS.surface, borderRadius: 6, color: COLORS.text, fontSize: 12 }}>💲 {v.pricing}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── MODULE: PURCHASE ORDERS ──────────────────────────────────────────
function PurchaseOrders({ pos, setPOs }) {
  const printPO = (po) => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>PO #${po.id}</title><style>
      body{font-family:monospace;padding:40px;max-width:800px;margin:auto}
      h1{font-size:24px;border-bottom:2px solid #000;padding-bottom:10px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ccc;padding:8px 12px;text-align:left}
      th{background:#f5f5f5}
      .total{font-weight:bold;font-size:18px;text-align:right;margin-top:20px}
    </style></head><body>
      <h1>🔧 FOOMACHINES — Purchase Order</h1>
      <p><strong>PO Number:</strong> PO-${po.id}</p>
      <p><strong>Date:</strong> ${po.date}</p>
      <p><strong>Product:</strong> ${po.product}</p>
      <table>
        <tr><th>Item</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total</th></tr>
        ${po.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.unit}</td><td>₹${i.rate}</td><td>₹${i.total.toFixed(2)}</td></tr>`).join("")}
      </table>
      <div class="total">Grand Total: ₹${po.total.toFixed(2)}</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const updateStatus = (id, status) => setPOs(pos => pos.map(p => p.id === id ? { ...p, status } : p));

  return (
    <div>
      <SectionTitle icon="📋" title="Purchase Orders" sub="Auto-generated POs grouped by procurement plan" />
      {pos.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 60, color: COLORS.muted }}>
          <div style={{ fontSize: 48 }}>📭</div>
          <div style={{ marginTop: 12 }}>No Purchase Orders yet. Generate from Procurement Planning.</div>
        </Card>
      ) : (
        pos.map(po => (
          <Card key={po.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>PO-{po.id}</div>
                <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>{po.product} · {po.date}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Tag label={po.status || "Pending"} />
                <Select small value={po.status || "Pending"} onChange={e => updateStatus(po.id, e.target.value)} options={["Pending", "Sent", "Confirmed", "Completed"]} />
                <Btn onClick={() => printPO(po)} small variant="ghost">🖨️ Print</Btn>
              </div>
            </div>
            <table>
              <thead><tr><TH>Item</TH><TH>Qty</TH><TH>Unit</TH><TH>Rate</TH><TH>Total</TH></tr></thead>
              <tbody>
                {po.items.map((item, i) => (
                  <tr key={i}>
                    <TD>{item.name}</TD>
                    <TD mono right>{item.qty}</TD>
                    <TD>{item.unit}</TD>
                    <TD mono right>{fmt(item.rate)}</TD>
                    <TD mono accent right>{fmt(item.total)}</TD>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: COLORS.muted }}>GRAND TOTAL</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: COLORS.accent, fontSize: 18 }}>{fmt(po.total)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── MODULE: PRODUCTION PLANNING ─────────────────────────────────────
function Production({ products, bom, inventory }) {
  const [batches, setBatches] = useState([]);
  const [selected, setSelected] = useState(products[0]?.id || null);
  const [batchQty, setBatchQty] = useState(5);

  const createBatch = () => {
    const prod = products.find(p => p.id === selected);
    if (!prod) return;
    setBatches(bs => [...bs, { id: Date.now(), product: prod.name, qty: batchQty, status: "Planned", created: new Date().toLocaleDateString("en-IN"), completedSteps: [] }]);
  };

  const updateStatus = (id, status) => setBatches(bs => bs.map(b => b.id === id ? { ...b, status } : b));
  const statusColor = { Planned: COLORS.muted, "In Progress": COLORS.warning, Completed: COLORS.success };

  return (
    <div>
      <SectionTitle icon="🏗️" title="Production Planning" sub="Batch tracking and production status" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>Product</div>
            <Select value={selected || ""} onChange={e => setSelected(parseInt(e.target.value))} options={products.map(p => ({ value: p.id, label: p.name }))} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>Batch Qty</div>
            <Input type="number" value={batchQty} onChange={e => setBatchQty(parseInt(e.target.value) || 1)} />
          </div>
          <Btn onClick={createBatch}>+ Create Batch</Btn>
        </div>
      </Card>

      {batches.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 60, color: COLORS.muted }}>
          <div style={{ fontSize: 48 }}>🔧</div>
          <div style={{ marginTop: 12 }}>No production batches planned yet.</div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {batches.map(batch => {
            const prod = products.find(p => p.name === batch.product);
            const parts = prod ? (bom[prod.id] || []) : [];
            return (
              <Card key={batch.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{batch.product}</div>
                    <div style={{ color: COLORS.muted, fontSize: 13 }}>Batch #{batch.id} · {batch.qty} units · {batch.created}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag label={batch.status} />
                    <Select small value={batch.status} onChange={e => updateStatus(batch.id, e.target.value)} options={["Planned", "In Progress", "Completed"]} />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted, marginBottom: 8 }}>MATERIAL REQUIREMENT</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
                  {parts.map(p => (
                    <div key={p.id} style={{ padding: "8px 12px", background: COLORS.surface, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", color: COLORS.accent, marginTop: 2 }}>{(p.qty * batch.qty).toFixed(2)} {p.uom}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // ── All state loads from localStorage on first open ──────────────
  const DEFAULTS = {
    products: SAMPLE_PRODUCTS,
    bom: SAMPLE_BOM,
    processes: SAMPLE_PROCESSES,
    vendors: SAMPLE_VENDORS,
    inventory: SAMPLE_INVENTORY,
    pos: [],
  };
  const initial = useMemo(() => loadData(DEFAULTS), []);

  const [products, setProductsRaw] = useState(initial.products);
  const [bom, setBomRaw] = useState(initial.bom);
  const [processes, setProcessesRaw] = useState(initial.processes);
  const [vendors, setVendorsRaw] = useState(initial.vendors);
  const [inventory, setInventoryRaw] = useState(initial.inventory);
  const [pos, setPOsRaw] = useState(initial.pos);

  // ── Auto-save: any state change triggers a debounced save ─────────
  const triggerSave = useCallback((patch) => {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(false);
    }, 900);
    saveData(patch);
  }, []);

  // Wrapped setters that also persist
  const makeSet = (key, raw, setRaw, current) => (updater) => {
    setRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // We need latest values of all state — use a small trick via setTimeout
      setTimeout(() => {
        triggerSave({
          products: key === "products" ? next : current.products,
          bom: key === "bom" ? next : current.bom,
          processes: key === "processes" ? next : current.processes,
          vendors: key === "vendors" ? next : current.vendors,
          inventory: key === "inventory" ? next : current.inventory,
          pos: key === "pos" ? next : current.pos,
        });
      }, 0);
      return next;
    });
  };

  // Build a current-values ref so wrapped setters always see latest
  const cur = { products, bom, processes, vendors, inventory, pos };
  const setProducts = makeSet("products", products, setProductsRaw, cur);
  const setBom = makeSet("bom", bom, setBomRaw, cur);
  const setProcesses = makeSet("processes", processes, setProcessesRaw, cur);
  const setVendors = makeSet("vendors", vendors, setVendorsRaw, cur);
  const setInventory = makeSet("inventory", inventory, setInventoryRaw, cur);
  const setPOs = makeSet("pos", pos, setPOsRaw, cur);

  const handleImport = ({ name, sku, category, parts }) => {
    const id = Date.now();
    setProducts(ps => [...ps, { id, name, sku, revision: "Rev A", category, demand: 20, batchSize: 5, status: "Active" }]);
    setBom(b => ({ ...b, [id]: parts }));
    setProcesses(pr => ({ ...pr, [id]: [{ id: Date.now(), name: "Cutting", type: "In-house", vendor: "", cost: 0 }, { id: Date.now() + 1, name: "Welding", type: "In-house", vendor: "", cost: 0 }] }));
    setTab("products");
  };

  const tabs = [
    { id: "dashboard", icon: "⚡", label: "Dashboard" },
    { id: "import", icon: "📥", label: "Import BOM" },
    { id: "products", icon: "📦", label: "Products" },
    { id: "cost", icon: "💰", label: "Costing" },
    { id: "procurement", icon: "🔄", label: "Procurement" },
    { id: "inventory", icon: "🏭", label: "Inventory" },
    { id: "vendors", icon: "🏪", label: "Vendors" },
    { id: "pos", icon: "📋", label: "Purchase Orders" },
    { id: "production", icon: "🏗️", label: "Production" },
  ];

  const render = () => {
    switch (tab) {
      case "dashboard": return <Dashboard products={products} bom={bom} processes={processes} inventory={inventory} pos={pos} />;
      case "import": return <BOMImport onImport={handleImport} />;
      case "products": return <ProductMaster products={products} setProducts={setProducts} bom={bom} setBom={setBom} processes={processes} setProcesses={setProcesses} />;
      case "cost": return <CostSummary products={products} bom={bom} processes={processes} />;
      case "procurement": return <Procurement products={products} bom={bom} inventory={inventory} setPOs={setPOs} />;
      case "inventory": return <Inventory inventory={inventory} setInventory={setInventory} />;
      case "vendors": return <Vendors vendors={vendors} setVendors={setVendors} />;
      case "pos": return <PurchaseOrders pos={pos} setPOs={setPOs} />;
      case "production": return <Production products={products} bom={bom} inventory={inventory} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>FOO<span style={{ color: COLORS.accent }}>MACHINES</span></div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>MFG · COSTING · ERP</div>
          </div>
          <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: tab === t.id ? COLORS.accentGlow : "transparent", color: tab === t.id ? COLORS.accent : COLORS.muted, fontWeight: tab === t.id ? 700 : 500, fontSize: 14, cursor: "pointer", marginBottom: 2, textAlign: "left", transition: "all 0.15s", borderLeft: tab === t.id ? `3px solid ${COLORS.accent}` : "3px solid transparent" }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: "14px 16px", borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.muted }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace" }}>v1.1 · Auto-save ON</div>
              <SaveBadge saving={saving} />
            </div>
            <div style={{ marginTop: 2, marginBottom: 10 }}>Low-volume, high-mix</div>
            <button onClick={() => {
              if (window.confirm("⚠️ This will clear ALL saved data and reload sample data. Are you sure?")) {
                localStorage.removeItem(STORAGE_KEY);
                window.location.reload();
              }
            }} style={{ width: "100%", background: COLORS.danger + "18", border: `1px solid ${COLORS.danger}33`, borderRadius: 6, color: COLORS.danger, fontSize: 11, padding: "5px 0", cursor: "pointer", fontFamily: "'Syne',sans-serif" }}>
              🗑 Reset All Data
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", minWidth: 0 }}>
          {render()}
        </div>
      </div>
    </>
  );
}
