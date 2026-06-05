import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  AlertCircle,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  WifiOff,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  ClipboardList,
  CheckCircle,
  Package,
  Banknote,
  BarChart2,
} from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// ─── Storage Helpers ───────────────────────────────────────────────
const ORDERS_KEY = "tp_orders";
const TX_KEY = "tp_tx";
const load = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};
const persist = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) =>
  "₦" +
  (parseFloat(n) || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// ─── Seed Data ─────────────────────────────────────────────────────
const SEED_ORDERS = [];
const SEED_TX = [];

// ─── Date Helpers ──────────────────────────────────────────────────
const getPresetRange = (preset) => {
  const now = new Date();
  const y = now.getFullYear(),
    mo = now.getMonth(),
    d = now.getDate();
  if (preset === "today") {
    const t = today();
    return { from: t, to: t };
  }
  if (preset === "week") {
    const day = now.getDay();
    const mon = new Date(y, mo, d - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      from: mon.toISOString().split("T")[0],
      to: sun.toISOString().split("T")[0],
    };
  }
  if (preset === "month")
    return {
      from: new Date(y, mo, 1).toISOString().split("T")[0],
      to: new Date(y, mo + 1, 0).toISOString().split("T")[0],
    };
  if (preset === "last30") {
    const f = new Date(y, mo, d - 29);
    return { from: f.toISOString().split("T")[0], to: today() };
  }
  return { from: "", to: "" };
};

const inRange = (dateStr, from, to) => {
  if (!from && !to) return true;
  if (!dateStr) return false;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
};

// ─── Styles ────────────────────────────────────────────────────────
const S = {
  app: {
    fontFamily: "'Georgia', serif",
    background: "#FAFAF8",
    minHeight: "100vh",
    color: "#1A1A1A",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
  },
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "#1A1A1A",
    borderBottom: "2px solid #B8860B",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
  },
  navBrand: {
    color: "#B8860B",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
    padding: "13px 0",
    marginRight: "auto",
    lineHeight: 1.2,
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  navBrandSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontFamily: "sans-serif",
    letterSpacing: 1,
    fontWeight: "normal",
    display: "block",
    marginTop: 1,
  },
  navTab: (active) => ({
    color: active ? "#B8860B" : "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "sans-serif",
    padding: "14px 12px",
    cursor: "pointer",
    border: "none",
    background: "none",
    borderBottom: active ? "2px solid #B8860B" : "2px solid transparent",
    marginBottom: -2,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
    transition: "color 0.2s",
  }),
  offlineBar: {
    background: "#FFF8E7",
    borderBottom: "1px solid rgba(184,134,11,0.3)",
    padding: "6px 16px",
    fontFamily: "sans-serif",
    fontSize: 11,
    color: "#B8860B",
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  page: { padding: 16 },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 10,
    marginBottom: 16,
  },
  metric: (variant) => {
    const bg =
      {
        gold: "#FFF8E7",
        green: "#EAF5EE",
        danger: "#FDECEA",
        default: "#FFFFFF",
      }[variant] || "#FFFFFF";
    const border =
      {
        gold: "rgba(184,134,11,0.2)",
        green: "rgba(45,125,70,0.2)",
        danger: "rgba(192,57,43,0.2)",
        default: "rgba(0,0,0,0.08)",
      }[variant] || "rgba(0,0,0,0.08)";
    return {
      background: bg,
      border: `0.5px solid ${border}`,
      borderRadius: 10,
      padding: "12px 14px",
    };
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: "sans-serif",
    color: "#6B6B6B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  metricValue: (variant) => ({
    fontSize: 19,
    fontWeight: "bold",
    color:
      {
        gold: "#B8860B",
        green: "#2D7D46",
        danger: "#C0392B",
        default: "#1A1A1A",
      }[variant] || "#1A1A1A",
    letterSpacing: -0.5,
  }),
  metricSub: {
    fontSize: 10,
    fontFamily: "sans-serif",
    color: "#6B6B6B",
    marginTop: 2,
  },
  secHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  secTitle: { fontSize: 17, color: "#1A1A1A", letterSpacing: -0.3 },
  btnPrimary: {
    background: "#1A1A1A",
    color: "#B8860B",
    border: "none",
    padding: "8px 14px",
    borderRadius: 10,
    fontSize: 12,
    fontFamily: "sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
    letterSpacing: 0.3,
  },
  btnSm: { padding: "6px 10px", fontSize: 11, borderRadius: 8 },
  btnDanger: {
    background: "#FDECEA",
    color: "#C0392B",
    border: "1px solid rgba(192,57,43,0.2)",
  },
  btnCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    fontFamily: "sans-serif",
    fontSize: 13,
    cursor: "pointer",
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#FAFAF8",
    color: "#6B6B6B",
    fontWeight: 500,
  },
  btnSave: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    fontFamily: "sans-serif",
    fontSize: 13,
    cursor: "pointer",
    border: "none",
    background: "#1A1A1A",
    color: "#B8860B",
    fontWeight: 500,
  },
  card: {
    background: "#FFFFFF",
    border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 10,
  },
  cardName: { fontSize: 15, fontWeight: "bold", color: "#1A1A1A" },
  cardSub: {
    fontSize: 12,
    fontFamily: "sans-serif",
    color: "#6B6B6B",
    marginTop: 1,
  },
  cardMeta: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 6,
    marginTop: 10,
  },
  metaItem: { fontFamily: "sans-serif", fontSize: 11 },
  metaLabel: { color: "#6B6B6B", marginBottom: 1 },
  metaVal: { color: "#1A1A1A", fontWeight: 500 },
  cardActions: {
    display: "flex",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTop: "0.5px solid rgba(0,0,0,0.08)",
  },
  badge: (variant) => {
    const map = {
      Pending: { bg: "#FFF3CD", color: "#856404" },
      "In Progress": { bg: "#EBF3FB", color: "#1A5C9A" },
      Ready: { bg: "#FFF8E7", color: "#B8860B" },
      Delivered: { bg: "#EAF5EE", color: "#2D7D46" },
      paid: { bg: "#EAF5EE", color: "#2D7D46" },
      partial: { bg: "#FFF3CD", color: "#856404" },
      unpaid: { bg: "#FDECEA", color: "#C0392B" },
    };
    const v = map[variant] || { bg: "#F1EFE8", color: "#5F5E5A" };
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "sans-serif",
      fontSize: 10,
      padding: "3px 8px",
      borderRadius: 20,
      fontWeight: 600,
      letterSpacing: 0.3,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      background: v.bg,
      color: v.color,
    };
  },
  searchWrap: { position: "relative", marginBottom: 12 },
  searchInput: {
    width: "100%",
    paddingLeft: 34,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 10,
    fontSize: 13,
    fontFamily: "sans-serif",
    color: "#1A1A1A",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  searchIconWrap: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9B9B9B",
    display: "flex",
  },
  filterRow: {
    display: "flex",
    gap: 6,
    marginBottom: 14,
    overflowX: "auto",
    paddingBottom: 4,
  },
  chip: (active) => ({
    fontFamily: "sans-serif",
    fontSize: 11,
    padding: "5px 12px",
    borderRadius: 20,
    border: active ? "1px solid #1A1A1A" : "1px solid rgba(0,0,0,0.12)",
    background: active ? "#1A1A1A" : "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
    color: active ? "#B8860B" : "#6B6B6B",
    letterSpacing: 0.3,
  }),
  divider: {
    fontFamily: "sans-serif",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6B6B6B",
    margin: "16px 0 8px",
    paddingBottom: 4,
    borderBottom: "0.5px solid rgba(0,0,0,0.08)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  modal: {
    background: "#fff",
    borderRadius: "14px 14px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "92vh",
    overflowY: "auto",
    padding: "20px 18px 30px",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "0.5px solid rgba(0,0,0,0.08)",
  },
  formGroup: { marginBottom: 14 },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 10,
  },
  label: {
    fontFamily: "sans-serif",
    fontSize: 11,
    color: "#6B6B6B",
    display: "block",
    marginBottom: 5,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "sans-serif",
    color: "#1A1A1A",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "sans-serif",
    color: "#1A1A1A",
    background: "#fff",
    outline: "none",
    resize: "vertical",
    minHeight: 80,
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "sans-serif",
    color: "#1A1A1A",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  modalActions: { display: "flex", gap: 8, marginTop: 18 },
  txDot: (type) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    background: type === "income" ? "#2D7D46" : "#C0392B",
  }),
  txAmount: (type) => ({
    fontFamily: "sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: type === "income" ? "#2D7D46" : "#C0392B",
  }),
  chartWrap: {
    background: "#fff",
    border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 14,
  },
  empty: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#9B9B9B",
    fontFamily: "sans-serif",
    fontSize: 13,
  },
};

// ─── Date Filter Presets ───────────────────────────────────────────
const PRESETS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last30", label: "Last 30 days" },
  { key: "custom", label: "Custom" },
];

function DateFilter({
  dateRange,
  setDateRange,
  dateField,
  setDateField,
  showFieldToggle,
}) {
  const [activePreset, setActivePreset] = useState("all");
  const [showCustom, setShowCustom] = useState(false);

  const applyPreset = (key) => {
    setActivePreset(key);
    if (key === "all") {
      setDateRange({ from: "", to: "" });
      setShowCustom(false);
      return;
    }
    if (key === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    setDateRange(getPresetRange(key));
  };

  const clearFilter = () => {
    setDateRange({ from: "", to: "" });
    setActivePreset("all");
    setShowCustom(false);
  };
  const si = {
    width: "100%",
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 8,
    padding: "7px 8px",
    fontSize: 12,
    fontFamily: "sans-serif",
    color: "#1A1A1A",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        marginBottom: 14,
        background: "#fff",
        border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 10,
          gap: 6,
        }}
      >
        <Calendar size={13} color="#B8860B" />
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: 11,
            color: "#B8860B",
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Filter by date
        </span>
        {showFieldToggle && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 4,
              flexShrink: 0,
            }}
          >
            {[
              ["due", "Due date"],
              ["created", "Created"],
            ].map(([v, lbl]) => (
              <button
                key={v}
                onClick={() => setDateField(v)}
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 20,
                  border:
                    dateField === v
                      ? "1px solid #B8860B"
                      : "1px solid rgba(0,0,0,0.12)",
                  background: dateField === v ? "#FFF8E7" : "#fff",
                  color: dateField === v ? "#B8860B" : "#6B6B6B",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: dateField === v ? 600 : 400,
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}
      >
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            style={{
              fontFamily: "sans-serif",
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 20,
              border:
                activePreset === p.key
                  ? "1px solid #B8860B"
                  : "1px solid rgba(0,0,0,0.12)",
              background: activePreset === p.key ? "#FFF8E7" : "#FAFAF8",
              color: activePreset === p.key ? "#B8860B" : "#6B6B6B",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: activePreset === p.key ? 600 : 400,
              flexShrink: 0,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginTop: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: 10,
                color: "#6B6B6B",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              From
            </div>
            <input
              type="date"
              value={dateRange.from}
              style={si}
              onChange={(e) =>
                setDateRange((r) => ({ ...r, from: e.target.value }))
              }
            />
          </div>
          <div>
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: 10,
                color: "#6B6B6B",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              To
            </div>
            <input
              type="date"
              value={dateRange.to}
              style={si}
              onChange={(e) =>
                setDateRange((r) => ({ ...r, to: e.target.value }))
              }
            />
          </div>
        </div>
      )}
      {(dateRange.from || dateRange.to) && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "sans-serif",
            fontSize: 11,
          }}
        >
          <span style={{ color: "#B8860B" }}>
            {dateRange.from || "start"} → {dateRange.to || "end"}
          </span>
          <button
            onClick={clearFilter}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#C0392B",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontFamily: "sans-serif",
              fontSize: 11,
            }}
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Chart.js Revenue Chart ────────────────────────────────────────
function RevenueChart({ txs, dateRange }) {
  // Build dynamic buckets based on date range
  const buildBuckets = () => {
    const now = new Date();
    if (!dateRange.from && !dateRange.to) {
      // Default: last 6 months by month
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label:
            d.toLocaleString("default", { month: "short" }) +
            " " +
            d.getFullYear(),
          test: (t) => {
            const dt = new Date(t.date);
            return (
              dt.getMonth() === d.getMonth() &&
              dt.getFullYear() === d.getFullYear()
            );
          },
        });
      }
      return months;
    }
    const from = dateRange.from
      ? new Date(dateRange.from)
      : new Date(Math.min(...txs.map((t) => new Date(t.date))));
    const to = dateRange.to ? new Date(dateRange.to) : now;
    const diffDays = Math.round((to - from) / 86400000);

    if (diffDays <= 31) {
      // Day-by-day
      const days = [];
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(from);
        d.setDate(from.getDate() + i);
        const dStr = d.toISOString().split("T")[0];
        days.push({
          label: d.toLocaleDateString("default", {
            day: "2-digit",
            month: "short",
          }),
          test: (t) => t.date === dStr,
        });
      }
      return days;
    } else if (diffDays <= 92) {
      // Week by week
      const weeks = [];
      let cur = new Date(from);
      while (cur <= to) {
        const wStart = new Date(cur);
        const wEnd = new Date(cur);
        wEnd.setDate(cur.getDate() + 6);
        const wStartStr = wStart.toISOString().split("T")[0];
        const wEndStr = (wEnd > to ? to : wEnd).toISOString().split("T")[0];
        weeks.push({
          label: wStart.toLocaleDateString("default", {
            day: "2-digit",
            month: "short",
          }),
          test: (t) => t.date >= wStartStr && t.date <= wEndStr,
        });
        cur.setDate(cur.getDate() + 7);
      }
      return weeks;
    } else {
      // Monthly
      const months = [];
      let cur = new Date(from.getFullYear(), from.getMonth(), 1);
      while (cur <= to) {
        const mo = cur.getMonth(),
          yr = cur.getFullYear();
        months.push({
          label: cur.toLocaleString("default", { month: "short" }) + " " + yr,
          test: (t) => {
            const dt = new Date(t.date);
            return dt.getMonth() === mo && dt.getFullYear() === yr;
          },
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      return months;
    }
  };

  const buckets = buildBuckets();
  const filteredTxs = txs.filter((t) =>
    inRange(t.date, dateRange.from, dateRange.to),
  );
  const incomeData = buckets.map((b) =>
    filteredTxs
      .filter((t) => t.type === "income" && b.test(t))
      .reduce((s, t) => s + t.amount, 0),
  );
  const expenseData = buckets.map((b) =>
    filteredTxs
      .filter((t) => t.type === "expense" && b.test(t))
      .reduce((s, t) => s + t.amount, 0),
  );

  const data = {
    labels: buckets.map((b) => b.label),
    datasets: [
      {
        label: "Income",
        data: incomeData,
        backgroundColor: "rgba(45,125,70,0.75)",
        borderColor: "#2D7D46",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Expenses",
        data: expenseData,
        backgroundColor: "rgba(192,57,43,0.65)",
        borderColor: "#C0392B",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: { family: "sans-serif", size: 11 },
          color: "#6B6B6B",
          boxWidth: 12,
          padding: 14,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => " " + ctx.dataset.label + ": " + fmt(ctx.parsed.y),
        },
        bodyFont: { family: "sans-serif" },
        titleFont: { family: "sans-serif" },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "sans-serif", size: 10 },
          color: "#9B9B9B",
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: {
          font: { family: "sans-serif", size: 10 },
          color: "#9B9B9B",
          callback: (v) => "₦" + (v / 1000).toFixed(0) + "k",
        },
        beginAtZero: true,
      },
    },
  };

  const isFiltered = !!(dateRange.from || dateRange.to);
  return (
    <div style={S.chartWrap}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart2 size={14} color="#6B6B6B" />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 11,
              color: "#6B6B6B",
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Revenue vs Expenses
          </span>
        </div>
        {isFiltered && (
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 10,
              color: "#B8860B",
              background: "#FFF8E7",
              padding: "2px 8px",
              borderRadius: 20,
              border: "1px solid rgba(184,134,11,0.2)",
            }}
          >
            Filtered
          </span>
        )}
      </div>
      <div style={{ height: 180 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────────────────
function MetricCard({ label, value, sub, variant = "default", icon: Icon }) {
  const iconColor =
    {
      gold: "#B8860B",
      green: "#2D7D46",
      danger: "#C0392B",
      default: "#9B9B9B",
    }[variant] || "#9B9B9B";
  return (
    <div style={S.metric(variant)}>
      <div style={S.metricLabel}>
        {Icon && <Icon size={11} color={iconColor} />}
        {label}
      </div>
      <div style={S.metricValue(variant)}>{value}</div>
      {sub && <div style={S.metricSub}>{sub}</div>}
    </div>
  );
}

function Badge({ status }) {
  return <span style={S.badge(status)}>{status}</span>;
}

// ─── Order Modal ───────────────────────────────────────────────────
const BLANK_ORDER = {
  name: "",
  phone: "",
  garment: "",
  price: "",
  deposit: "",
  material: "",
  due: today(),
  status: "Pending",
  measurements: {
    chest: "",
    waist: "",
    hip: "",
    length: "",
    shoulder: "",
    sleeve: "",
  },
  mNotes: "",
  extraCosts: [],
};

// helper: sum all extra costs for an order
const totalExtraCosts = (order) =>
  (order.extraCosts || []).reduce((s, c) => s + (parseFloat(c.value) || 0), 0);
const orderProfit = (order) =>
  (parseFloat(order.price) || 0) -
  (parseFloat(order.material) || 0) -
  totalExtraCosts(order);

function OrderModal({ order, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...BLANK_ORDER,
    ...(order || {}),
    extraCosts: (order?.extraCosts || []).map((c) => ({ ...c })),
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setM = (k, v) =>
    setForm((f) => ({ ...f, measurements: { ...f.measurements, [k]: v } }));

  const addExtraCost = () =>
    setForm((f) => ({
      ...f,
      extraCosts: [...(f.extraCosts || []), { id: uid(), name: "", value: "" }],
    }));
  const removeExtraCost = (id) =>
    setForm((f) => ({
      ...f,
      extraCosts: f.extraCosts.filter((c) => c.id !== id),
    }));
  const setExtraCost = (id, field, val) =>
    setForm((f) => ({
      ...f,
      extraCosts: f.extraCosts.map((c) =>
        c.id === id ? { ...c, [field]: val } : c,
      ),
    }));

  const extraTotal = (form.extraCosts || []).reduce(
    (s, c) => s + (parseFloat(c.value) || 0),
    0,
  );
  const totalCosts = (parseFloat(form.material) || 0) + extraTotal;
  const liveProfit = (parseFloat(form.price) || 0) - totalCosts;

  const handleSave = () => {
    if (!form.name.trim()) {
      alert("Please enter a customer name");
      return;
    }
    onSave(form);
  };

  return (
    <div
      style={S.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={S.modal}>
        <div style={S.modalTitle}>{order?.id ? "Edit Order" : "New Order"}</div>
        <div style={S.formGroup}>
          <label style={S.label}>Customer Name</label>
          <input
            style={S.input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div style={S.formRow}>
          <div style={S.formGroup}>
            <label style={S.label}>Phone</label>
            <input
              style={S.input}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+234..."
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Garment Type</label>
            <input
              style={S.input}
              value={form.garment}
              onChange={(e) => set("garment", e.target.value)}
              placeholder="Agbada, Suit..."
            />
          </div>
        </div>
        <div style={S.divider}>Measurements (in)</div>
        <div style={S.formRow}>
          {["chest", "waist", "hip", "length", "shoulder", "sleeve"].map(
            (k) => (
              <div key={k} style={S.formGroup}>
                <label style={S.label}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </label>
                <input
                  style={S.input}
                  type="number"
                  value={form.measurements[k]}
                  onChange={(e) => setM(k, e.target.value)}
                  placeholder="in"
                />
              </div>
            ),
          )}
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Extra Notes</label>
          <textarea
            style={S.textarea}
            value={form.mNotes}
            onChange={(e) => set("mNotes", e.target.value)}
            placeholder="Inseam, neck, style notes..."
          />
        </div>
        <div style={S.divider}>Payment & Schedule</div>
        <div style={S.formRow}>
          <div style={S.formGroup}>
            <label style={S.label}>Total Price (₦)</label>
            <input
              style={S.input}
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Deposit Paid (₦)</label>
            <input
              style={S.input}
              type="number"
              value={form.deposit}
              onChange={(e) => set("deposit", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div style={S.formRow}>
          <div style={S.formGroup}>
            <label style={S.label}>Due Date</label>
            <input
              style={S.input}
              type="date"
              value={form.due}
              onChange={(e) => set("due", e.target.value)}
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Status</label>
            <select
              style={S.select}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {["Pending", "In Progress", "Ready", "Delivered"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={S.divider}>Costs</div>
        <div style={S.formGroup}>
          <label style={S.label}>Material Cost (₦)</label>
          <input
            style={S.input}
            type="number"
            value={form.material}
            onChange={(e) => set("material", e.target.value)}
            placeholder="Fabric, thread..."
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: "sans-serif",
                fontSize: 11,
                color: "#6B6B6B",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Additional Costs
            </span>
            <button
              onClick={addExtraCost}
              style={{
                background: "none",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 8,
                cursor: "pointer",
                padding: "4px 10px",
                fontFamily: "sans-serif",
                fontSize: 11,
                color: "#1A1A1A",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={12} /> Add cost
            </button>
          </div>
          {(form.extraCosts || []).length === 0 && (
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: 12,
                color: "#9B9B9B",
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              No additional costs — click "Add cost" to include labour,
              embroidery, etc.
            </div>
          )}
          {(form.extraCosts || []).map((c) => (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 32px",
                gap: 6,
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <input
                style={{ ...S.input, fontSize: 13, padding: "8px 10px" }}
                placeholder="e.g. Embroidery, Labour"
                value={c.name}
                onChange={(e) => setExtraCost(c.id, "name", e.target.value)}
              />
              <input
                style={{ ...S.input, fontSize: 13, padding: "8px 10px" }}
                type="number"
                placeholder="₦ amount"
                value={c.value}
                onChange={(e) => setExtraCost(c.id, "value", e.target.value)}
              />
              <button
                onClick={() => removeExtraCost(c.id)}
                style={{
                  background: "#FDECEA",
                  border: "1px solid rgba(192,57,43,0.2)",
                  borderRadius: 8,
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 36,
                  color: "#C0392B",
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div
          style={{
            background: liveProfit >= 0 ? "#EAF5EE" : "#FDECEA",
            border: `0.5px solid ${liveProfit >= 0 ? "rgba(45,125,70,0.2)" : "rgba(192,57,43,0.2)"}`,
            borderRadius: 10,
            padding: "10px 14px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <div style={{ fontFamily: "sans-serif", fontSize: 11 }}>
            <div style={{ color: "#6B6B6B", marginBottom: 2 }}>Total costs</div>
            <div style={{ fontWeight: 600, color: "#C0392B" }}>
              {fmt(totalCosts)}
            </div>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 11 }}>
            <div style={{ color: "#6B6B6B", marginBottom: 2 }}>Price</div>
            <div style={{ fontWeight: 600, color: "#1A1A1A" }}>
              {fmt(form.price)}
            </div>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 11 }}>
            <div style={{ color: "#6B6B6B", marginBottom: 2 }}>Est. profit</div>
            <div
              style={{
                fontWeight: 700,
                color: liveProfit >= 0 ? "#2D7D46" : "#C0392B",
              }}
            >
              {fmt(liveProfit)}
            </div>
          </div>
        </div>

        <div style={S.modalActions}>
          <button style={S.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button style={S.btnSave} onClick={handleSave}>
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ────────────────────────────────────────────────────
function ViewModal({ order, onClose, onEdit }) {
  const bal = (parseFloat(order.price) || 0) - (parseFloat(order.deposit) || 0);
  const extraCosts = order.extraCosts || [];
  const extraTotal = totalExtraCosts(order);
  const allCosts = (parseFloat(order.material) || 0) + extraTotal;
  const profit = orderProfit(order);
  const m = order.measurements || {};
  return (
    <div
      style={S.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={S.modal}>
        <div style={S.modalTitle}>{order.name}</div>
        <div style={S.divider}>Order Info</div>
        <div style={S.cardMeta}>
          {[
            ["Phone", order.phone || "—"],
            ["Garment", order.garment || "—"],
            ["Status", order.status],
            ["Due", order.due || "—"],
          ].map(([l, v]) => (
            <div key={l} style={S.metaItem}>
              <div style={S.metaLabel}>{l}</div>
              <div style={S.metaVal}>{v}</div>
            </div>
          ))}
        </div>
        <div style={S.divider}>Measurements</div>
        <div style={S.cardMeta}>
          {["chest", "waist", "hip", "length", "shoulder", "sleeve"].map(
            (k) => (
              <div key={k} style={S.metaItem}>
                <div style={S.metaLabel}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </div>
                <div style={S.metaVal}>{m[k] ? m[k] + " in" : "—"}</div>
              </div>
            ),
          )}
        </div>
        {order.mNotes && (
          <div
            style={{
              fontSize: 12,
              color: "#6B6B6B",
              fontFamily: "sans-serif",
              margin: "10px 0",
              padding: 8,
              background: "#FAFAF8",
              borderRadius: 8,
            }}
          >
            {order.mNotes}
          </div>
        )}
        <div style={S.divider}>Financials</div>
        <div style={S.cardMeta}>
          {[
            ["Total Price", fmt(order.price), null],
            ["Deposit Paid", fmt(order.deposit), null],
            ["Balance Due", fmt(bal), bal > 0 ? "#C0392B" : "#2D7D46"],
            ["Material Cost", fmt(order.material), null],
          ].map(([l, v, c]) => (
            <div key={l} style={S.metaItem}>
              <div style={S.metaLabel}>{l}</div>
              <div style={{ ...S.metaVal, ...(c ? { color: c } : {}) }}>
                {v}
              </div>
            </div>
          ))}
        </div>

        {extraCosts.length > 0 && (
          <>
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#6B6B6B",
                margin: "12px 0 8px",
                paddingBottom: 4,
                borderBottom: "0.5px solid rgba(0,0,0,0.08)",
              }}
            >
              Additional Costs
            </div>
            <div
              style={{
                background: "#FAFAF8",
                borderRadius: 10,
                border: "0.5px solid rgba(0,0,0,0.08)",
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              {extraCosts.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderBottom:
                      i < extraCosts.length - 1
                        ? "0.5px solid rgba(0,0,0,0.06)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: 12,
                      color: "#1A1A1A",
                    }}
                  >
                    {c.name || "Unnamed cost"}
                  </span>
                  <span
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#C0392B",
                    }}
                  >
                    −{fmt(c.value)}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "#F1EFE8",
                  borderTop: "0.5px solid rgba(0,0,0,0.08)",
                }}
              >
                <span
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 11,
                    color: "#6B6B6B",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Extra costs subtotal
                </span>
                <span
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#C0392B",
                  }}
                >
                  −{fmt(extraTotal)}
                </span>
              </div>
            </div>
          </>
        )}

        <div
          style={{
            background: profit >= 0 ? "#EAF5EE" : "#FDECEA",
            border: `0.5px solid ${profit >= 0 ? "rgba(45,125,70,0.2)" : "rgba(192,57,43,0.2)"}`,
            borderRadius: 10,
            padding: "12px 14px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <div style={{ fontFamily: "sans-serif", fontSize: 11 }}>
            <div style={{ color: "#6B6B6B", marginBottom: 3 }}>Total costs</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#C0392B" }}>
              {fmt(allCosts)}
            </div>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: 11 }}>
            <div style={{ color: "#6B6B6B", marginBottom: 3 }}>
              Estimated profit
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: profit >= 0 ? "#2D7D46" : "#C0392B",
              }}
            >
              {fmt(profit)}
            </div>
          </div>
        </div>

        <div style={S.modalActions}>
          <button style={S.btnCancel} onClick={onClose}>
            Close
          </button>
          <button style={S.btnSave} onClick={onEdit}>
            Edit Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Modal ─────────────────────────────────────────────
function TxModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    type: "income",
    desc: "",
    amount: "",
    date: today(),
    cat: "Payment received",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const cats = [
    "Payment received",
    "Deposit received",
    "Material cost",
    "Salary / labor",
    "Utilities",
    "Equipment",
    "Other income",
    "Other expense",
  ];
  return (
    <div
      style={S.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={S.modal}>
        <div style={S.modalTitle}>Add Transaction</div>
        <div style={S.formGroup}>
          <label style={S.label}>Type</label>
          <select
            style={S.select}
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Description</label>
          <input
            style={S.input}
            value={form.desc}
            onChange={(e) => set("desc", e.target.value)}
            placeholder="e.g. Material purchase, payment received"
          />
        </div>
        <div style={S.formRow}>
          <div style={S.formGroup}>
            <label style={S.label}>Amount (₦)</label>
            <input
              style={S.input}
              type="number"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Date</label>
            <input
              style={S.input}
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Category</label>
          <select
            style={S.select}
            value={form.cat}
            onChange={(e) => set("cat", e.target.value)}
          >
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={S.modalActions}>
          <button style={S.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            style={S.btnSave}
            onClick={() => {
              if (!form.desc.trim()) {
                alert("Please add a description");
                return;
              }
              onSave({
                ...form,
                id: uid(),
                amount: parseFloat(form.amount) || 0,
                created: Date.now(),
              });
            }}
          >
            Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Page ───────────────────────────────────────────────────
function OrdersPage() {
  const [orders, setOrders] = useState(() => {
    const d = load(ORDERS_KEY);
    return d.length ? d : SEED_ORDERS;
  });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [dateField, setDateField] = useState("due");

  useEffect(() => {
    persist(ORDERS_KEY, orders);
  }, [orders]);

  const saveOrder = useCallback((form) => {
    setOrders((prev) => {
      if (form.id) return prev.map((o) => (o.id === form.id ? { ...form } : o));
      return [{ ...form, id: uid(), created: Date.now() }, ...prev];
    });
    setModal(null);
  }, []);

  const deleteOrder = (id) => {
    if (window.confirm("Delete this order?"))
      setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const filtered = orders
    .filter((o) => {
      const q = search.toLowerCase();
      const matchQ =
        !q || o.name.toLowerCase().includes(q) || (o.phone || "").includes(q);
      const matchStatus = filter === "all" || o.status === filter;
      const dateStr =
        dateField === "due"
          ? o.due || ""
          : new Date(o.created).toISOString().split("T")[0];
      return (
        matchQ && matchStatus && inRange(dateStr, dateRange.from, dateRange.to)
      );
    })
    .sort((a, b) => b.created - a.created);

  const isFiltered = !!(dateRange.from || dateRange.to);
  const metricSet = isFiltered ? filtered : orders;
  const totalRevenue = metricSet.reduce(
    (s, o) => s + (parseFloat(o.price) || 0),
    0,
  );
  const totalBalance = metricSet.reduce(
    (s, o) => s + (parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0),
    0,
  );

  return (
    <div style={S.page}>
      <div style={S.metricsGrid}>
        <MetricCard
          icon={ClipboardList}
          label="Total Orders"
          value={metricSet.length}
          sub={`${metricSet.filter((o) => o.status !== "Delivered").length} active`}
        />
        <MetricCard
          icon={Banknote}
          label="Revenue"
          value={fmt(totalRevenue)}
          sub={isFiltered ? "filtered period" : "all orders"}
          variant="gold"
        />
        <MetricCard
          icon={CheckCircle}
          label="Ready / Done"
          value={
            metricSet.filter(
              (o) => o.status === "Ready" || o.status === "Delivered",
            ).length
          }
          sub="to collect"
          variant="green"
        />
        <MetricCard
          icon={AlertCircle}
          label="Outstanding"
          value={fmt(totalBalance)}
          sub="balance due"
          variant="danger"
        />
      </div>
      <div style={S.secHeader}>
        <div style={S.secTitle}>Orders</div>
        <button style={S.btnPrimary} onClick={() => setModal({ order: null })}>
          <Plus size={14} /> New Order
        </button>
      </div>
      <div style={S.searchWrap}>
        <span style={S.searchIconWrap}>
          <Search size={15} />
        </span>
        <input
          style={S.searchInput}
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DateFilter
        dateRange={dateRange}
        setDateRange={setDateRange}
        dateField={dateField}
        setDateField={setDateField}
        showFieldToggle={true}
      />
      <div style={S.filterRow}>
        {["all", "Pending", "In Progress", "Ready", "Delivered"].map((f) => (
          <button
            key={f}
            style={S.chip(filter === f)}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div style={S.empty}>
          <ClipboardList
            size={36}
            style={{
              opacity: 0.25,
              marginBottom: 8,
              display: "block",
              margin: "0 auto 8px",
            }}
          />
          No orders found{isFiltered ? " in this date range" : ""}
        </div>
      )}
      {filtered.map((o) => {
        const bal = (parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0);
        const payStatus =
          bal <= 0 ? "paid" : o.deposit > 0 ? "partial" : "unpaid";
        const isOverdue = o.due && o.due < today() && o.status !== "Delivered";
        const profit = orderProfit(o);
        const extraCount = (o.extraCosts || []).length;
        return (
          <div key={o.id} style={S.card}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div>
                <div style={S.cardName}>{o.name}</div>
                <div style={S.cardSub}>
                  {o.garment || "—"} · {o.phone || "—"}
                </div>
              </div>
              <Badge status={o.status} />
            </div>
            <div style={S.cardMeta}>
              <div style={S.metaItem}>
                <div style={S.metaLabel}>Price</div>
                <div style={S.metaVal}>{fmt(o.price)}</div>
              </div>
              <div style={S.metaItem}>
                <div style={S.metaLabel}>Balance due</div>
                <div style={S.metaVal}>{fmt(bal)}</div>
              </div>
              <div style={S.metaItem}>
                <div style={S.metaLabel}>Due date</div>
                <div
                  style={{
                    ...S.metaVal,
                    ...(isOverdue ? { color: "#C0392B" } : {}),
                  }}
                >
                  {o.due || "—"}
                </div>
              </div>
              <div style={S.metaItem}>
                <div style={S.metaLabel}>Payment</div>
                <div style={S.metaVal}>
                  <Badge status={payStatus} />
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: profit >= 0 ? "#EAF5EE" : "#FDECEA",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontFamily: "sans-serif", fontSize: 11 }}>
                <span style={{ color: "#6B6B6B" }}>Est. profit</span>
                {extraCount > 0 && (
                  <span
                    style={{ marginLeft: 6, color: "#9B9B9B", fontSize: 10 }}
                  >
                    {extraCount} extra cost{extraCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: profit >= 0 ? "#2D7D46" : "#C0392B",
                }}
              >
                {fmt(profit)}
              </span>
            </div>
            <div style={S.cardActions}>
              <button
                style={{ ...S.btnPrimary, ...S.btnSm }}
                onClick={() => setViewing(o)}
              >
                <Eye size={12} /> View
              </button>
              <button
                style={{ ...S.btnPrimary, ...S.btnSm }}
                onClick={() => setModal({ order: o })}
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                style={{ ...S.btnPrimary, ...S.btnSm, ...S.btnDanger }}
                onClick={() => deleteOrder(o.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
      {modal && (
        <OrderModal
          order={modal.order}
          onClose={() => setModal(null)}
          onSave={saveOrder}
        />
      )}
      {viewing && (
        <ViewModal
          order={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setModal({ order: viewing });
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Profit Page ───────────────────────────────────────────────────
function ProfitPage() {
  const [txs, setTxs] = useState(() => {
    const d = load(TX_KEY);
    return d.length ? d : SEED_TX;
  });
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  useEffect(() => {
    persist(TX_KEY, txs);
  }, [txs]);

  const saveTx = (tx) => {
    setTxs((prev) => [tx, ...prev]);
    setShowModal(false);
  };
  const deleteTx = (id) => {
    if (window.confirm("Delete transaction?"))
      setTxs((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTxs = txs.filter((t) => {
    return (
      inRange(t.date, dateRange.from, dateRange.to) &&
      (txTypeFilter === "all" || t.type === txTypeFilter)
    );
  });

  const isFiltered = !!(dateRange.from || dateRange.to);
  const metricSet = isFiltered ? filteredTxs : txs;
  const totalIncome = metricSet
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = metricSet
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const orders = load(ORDERS_KEY);
  const matCost = orders.reduce((s, o) => s + (parseFloat(o.material) || 0), 0);

  return (
    <div style={S.page}>
      <div style={S.metricsGrid}>
        <MetricCard
          icon={ArrowUpCircle}
          label="Total Income"
          value={fmt(totalIncome)}
          sub={
            isFiltered
              ? "filtered period"
              : `${txs.filter((t) => t.type === "income").length} entries`
          }
          variant="green"
        />
        <MetricCard
          icon={ArrowDownCircle}
          label="Total Expenses"
          value={fmt(totalExpense)}
          sub={
            isFiltered
              ? "filtered period"
              : `${txs.filter((t) => t.type === "expense").length} entries`
          }
          variant="danger"
        />
        <MetricCard
          icon={TrendingUp}
          label="Net Profit"
          value={fmt(totalIncome - totalExpense)}
          sub={isFiltered ? "filtered period" : "income − expenses"}
          variant="gold"
        />
        <MetricCard
          icon={Package}
          label="Material Costs"
          value={fmt(matCost)}
          sub="from all orders"
        />
      </div>

      <DateFilter
        dateRange={dateRange}
        setDateRange={setDateRange}
        showFieldToggle={false}
        dateField="date"
        setDateField={() => {}}
      />

      <RevenueChart txs={txs} dateRange={dateRange} />

      <div style={S.secHeader}>
        <div style={S.secTitle}>Transactions</div>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          ["all", "All"],
          ["income", "Income only"],
          ["expense", "Expenses only"],
        ].map(([v, lbl]) => (
          <button
            key={v}
            onClick={() => setTxTypeFilter(v)}
            style={{
              fontFamily: "sans-serif",
              fontSize: 11,
              padding: "5px 12px",
              borderRadius: 20,
              border:
                txTypeFilter === v
                  ? "1px solid #1A1A1A"
                  : "1px solid rgba(0,0,0,0.12)",
              background: txTypeFilter === v ? "#1A1A1A" : "#fff",
              color: txTypeFilter === v ? "#B8860B" : "#6B6B6B",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {!filteredTxs.length && (
        <div style={S.empty}>
          <Receipt
            size={36}
            style={{
              opacity: 0.25,
              marginBottom: 8,
              display: "block",
              margin: "0 auto 8px",
            }}
          />
          No transactions{isFiltered ? " in this date range" : " yet"}
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "0.5px solid rgba(0,0,0,0.08)",
          padding: "4px 16px",
        }}
      >
        {filteredTxs.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 0",
              borderBottom:
                i < filteredTxs.length - 1
                  ? "0.5px solid rgba(0,0,0,0.08)"
                  : "none",
            }}
          >
            {t.type === "income" ? (
              <ArrowUpCircle
                size={16}
                color="#2D7D46"
                style={{ flexShrink: 0 }}
              />
            ) : (
              <ArrowDownCircle
                size={16}
                color="#C0392B"
                style={{ flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#1A1A1A" }}>{t.desc}</div>
              <div
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 10,
                  color: "#9B9B9B",
                  marginTop: 1,
                }}
              >
                {t.cat} · {t.date}
              </div>
            </div>
            <div style={S.txAmount(t.type)}>
              {t.type === "income" ? "+" : "−"}
              {fmt(t.amount)}
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#C0392B",
                padding: 4,
                marginLeft: 2,
                display: "flex",
              }}
              onClick={() => deleteTx(t.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      {showModal && (
        <TxModal onClose={() => setShowModal(false)} onSave={saveTx} />
      )}
    </div>
  );
}

// ─── App Root ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("orders");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!load(ORDERS_KEY).length) persist(ORDERS_KEY, SEED_ORDERS);
    if (!load(TX_KEY).length) persist(TX_KEY, SEED_TX);
  }, []);

  return (
    <div style={S.app}>
      {!online && (
        <div style={S.offlineBar}>
          <WifiOff size={13} /> Working offline — all data saved locally
        </div>
      )}
      <nav style={S.nav}>
        <div style={S.navBrand}>
          {/* <Scissors size={16} color="#B8860B" /> */}
          <div>
            Caramel Clothing
            <span style={S.navBrandSub}>SHOP MANAGER</span>
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {[
            ["orders", "Orders"],
            ["profit", "Profit"],
          ].map(([key, label]) => (
            <button
              key={key}
              style={S.navTab(tab === key)}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      {tab === "orders" && <OrdersPage />}
      {tab === "profit" && <ProfitPage />}
    </div>
  );
}
