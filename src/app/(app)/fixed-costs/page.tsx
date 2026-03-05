"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatBaht } from "@/lib/utils";
import {
  Plus,
  Check,
  Upload,
  Camera,
  Trash2,
  Edit3,
  RotateCcw,
  CalendarDays,
  AlertTriangle,
  X,
  ChevronDown,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/* ── Constants ── */
const CATEGORIES = [
  "utilities",
  "employees",
  "credit_card",
  "internet",
  "advertising",
  "rent",
  "insurance",
  "other",
];

const CATEGORY_LABELS: Record<string, string> = {
  utilities: "Utilities",
  employees: "Employees",
  credit_card: "Credit Card",
  internet: "Internet",
  advertising: "Advertising",
  rent: "Rent",
  insurance: "Insurance",
  other: "Other",
};

// Smart suggestions per category
const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  utilities: ["Water", "Electricity"],
  credit_card: ["UMB"],
  employees: ["First Half Salary", "Second Half Salary"],
  internet: ["Internet"],
};





const PAYMENT_METHODS = ["Cash", "KBank", "SCB", "Bangkok Bank", "Krungsri"];
const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#22c55e", "#f43f5e", "#3b82f6", "#ec4899", "#14b8a6"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FixedCost {
  id: string;
  name: string;
  category: string;
  amount: number;
  payment_method: string;
  due_day: number | null;
  is_paid: boolean;
  is_recurring: boolean;
  paid_date: string | null;
  period_month: number;
  period_year: number;
  notes: string | null;
  receipt_image_url: string | null;
}

interface Reminder {
  id: string;
  cost_type: string;
  period_month: number;
  period_year: number;
  due_date: string;
  amount: number;
  paid: boolean;
  payment_date: string | null;
}

const COST_TYPE_LABELS: Record<string, string> = {
  WATER: "Water",
  ELECTRICITY: "Electricity",
  CREDIT_CARD_UOB: "Credit Card UOB",
  INTERNET: "Internet",
  EMPLOYEE_FIRST_HALF: "Employee (1st Half)",
  EMPLOYEE_SECOND_HALF: "Employee (2nd Half)",
};

export default function FixedCostsPage() {
  // Use Bangkok timezone to determine current month/year
  const bkkParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const bkkGet = (t: string) => Number(bkkParts.find(p => p.type === t)?.value ?? '0');
  const bkkYear = bkkGet('year');
  const bkkMonth = bkkGet('month');
  const bkkDay = bkkGet('day');
  const [month] = useState(bkkMonth);
  const [year] = useState(bkkYear);

  const { data, isLoading } = useSWR(
    `/api/fixed-costs?month=${month}&year=${year}`,
    fetcher
  );
  const costs: FixedCost[] = data?.costs ?? [];

  // Fetch unpaid reminders from the dedicated fixed_cost_reminders table
  const { data: reminderData } = useSWR('/api/fixed-cost-reminders', fetcher);
  const reminders: Reminder[] = reminderData?.reminders ?? [];



  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("utilities");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [dueDay, setDueDay] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form period selection
  const [periodMode, setPeriodMode] = useState<"this_month" | "custom">("this_month");
  const [formMonth, setFormMonth] = useState(bkkMonth);
  const [formYear, setFormYear] = useState(bkkYear);

  // Suggestion popup
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When category changes, show suggestions if available
  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory);
    const sug = CATEGORY_SUGGESTIONS[newCategory];
    if (sug && sug.length > 0) {
      setSuggestions(sug);
      setShowSuggestions(true);
      setName(""); // Clear name so user picks a suggestion
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (result.url) setReceiptImageUrl(result.url);
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategory("utilities");
    setAmount("");
    setPaymentMethod("Cash");
    setDueDay("");
    setNotes("");
    setIsRecurring(true);
    setReceiptImageUrl(null);
    setShowSuggestions(false);
    setSuggestions([]);
    setPeriodMode("this_month");
    setFormMonth(bkkMonth);
    setFormYear(bkkYear);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedMonth = periodMode === "this_month" ? month : formMonth;
      const selectedYear = periodMode === "this_month" ? year : formYear;
      const payload = {
        name,
        category,
        amount: Number(amount),
        paymentMethod,
        dueDay: dueDay ? Number(dueDay) : null,
        periodMonth: selectedMonth,
        periodYear: selectedYear,
        notes: notes || null,
        isRecurring,
        receiptImageUrl: receiptImageUrl || null,
      };
      const res = await fetch("/api/fixed-costs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      const sm = periodMode === "this_month" ? month : formMonth;
      const sy = periodMode === "this_month" ? year : formYear;
      resetForm();
      setShowForm(false);
      mutate(`/api/fixed-costs?month=${month}&year=${year}`);
      if (sm !== month || sy !== year) mutate(`/api/fixed-costs?month=${sm}&year=${sy}`);
      mutate("/api/fixed-cost-reminders");
    } catch (err) {
      alert("Failed to save fixed cost.");
      console.error(err);
    }
    setSaving(false);
  };

  const editCost = (cost: FixedCost) => {
    setEditingId(cost.id);
    setName(cost.name);
    setCategory(cost.category);
    setAmount(String(cost.amount));
    setPaymentMethod(cost.payment_method);
    setDueDay(cost.due_day ? String(cost.due_day) : "");
    setNotes(cost.notes || "");
    setIsRecurring(cost.is_recurring);
    setReceiptImageUrl(cost.receipt_image_url);
    // Set period
    if (cost.period_month === bkkMonth && cost.period_year === bkkYear) {
      setPeriodMode("this_month");
    } else {
      setPeriodMode("custom");
      setFormMonth(cost.period_month);
      setFormYear(cost.period_year);
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePaid = async (id: string, isPaid: boolean) => {
    try {
      const res = await fetch("/api/fixed-costs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPaid }),
      });
      if (!res.ok) throw new Error("Failed to update");
      mutate(`/api/fixed-costs?month=${month}&year=${year}`);
      mutate("/api/fixed-cost-reminders");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCost = async (id: string, costName: string) => {
    if (!confirm(`Delete "${costName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/fixed-costs?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      mutate(`/api/fixed-costs?month=${month}&year=${year}`);
      mutate("/api/fixed-cost-reminders");
    } catch (err) {
      alert("Failed to delete fixed cost.");
      console.error(err);
    }
  };

  // Reminder: mark paid / update amount
  const markReminderPaid = async (id: string) => {
    try {
      const res = await fetch("/api/fixed-cost-reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, paid: true }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate("/api/fixed-cost-reminders");
    } catch (err) {
      console.error(err);
    }
  };

  // Seed reminders for ALL months from Feb 2026 through current month
  const [seeding, setSeeding] = useState(false);
  const seedAllReminders = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/fixed-cost-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedAll: true }),
      });
      if (!res.ok) throw new Error("Failed");
      mutate("/api/fixed-cost-reminders");
    } catch (err) {
      console.error(err);
    }
    setSeeding(false);
  };

  // Computed
  const categoryTotals: Record<string, number> = {};
  costs.forEach((c) => {
    const label = CATEGORY_LABELS[c.category] || c.category;
    categoryTotals[label] = (categoryTotals[label] || 0) + Number(c.amount);
  });
  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .filter((d) => d.value > 0);

  const totalPaid = costs
    .filter((c) => c.is_paid)
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalUnpaid = costs
    .filter((c) => !c.is_paid)
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalAll = totalPaid + totalUnpaid;
  const paidCount = costs.filter((c) => c.is_paid).length;

  const thaiMonth = new Date(year, month - 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  // Compute reminder items from the dedicated table
  const today = bkkDay;
  const reminderItems = reminders.map((r) => {
    const dueObj = new Date(r.due_date + "T00:00:00");
    const dueDay = dueObj.getDate();
    // Is in the past period?
    const isPastPeriod =
      r.period_year < bkkYear ||
      (r.period_year === bkkYear && r.period_month < bkkMonth);
    // Is current period and within 5 days of due or past due?
    const isCurrentMonth = r.period_year === bkkYear && r.period_month === bkkMonth;
    const daysUntilDue = dueDay - today;
    const isAlmostDue = isCurrentMonth && daysUntilDue >= 0 && daysUntilDue <= 5;
    const isOverdue = isPastPeriod || (isCurrentMonth && today > dueDay);

    const periodLabel = new Date(r.period_year, r.period_month - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    return {
      ...r,
      dueDay,
      isAlmostDue,
      isOverdue,
      periodLabel,
      label: COST_TYPE_LABELS[r.cost_type] || r.cost_type,
    };
  });

  return (
    <div className="mx-auto max-w-3xl pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fixed Costs</h1>
          <p className="text-xs text-muted-foreground">{thaiMonth}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all hover:brightness-110"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close" : "Add Cost"}
        </button>
      </div>

      {/* ── Fixed Cost Reminder ── */}
      <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold text-foreground">Fixed Cost Reminder</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {reminderItems.length} unpaid
          </span>
          <button
            onClick={seedAllReminders}
            disabled={seeding}
            className="rounded-lg bg-secondary px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground disabled:opacity-50"
          >
            {seeding ? "Seeding..." : "+ Seed Reminders"}
          </button>
        </div>

        {reminderItems.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 px-4">
            <Check className="h-6 w-6 text-emerald-500" />
            <p className="text-xs font-medium text-emerald-600">All fixed costs are paid</p>
            <p className="text-[10px] text-muted-foreground">Click &quot;Seed Reminders&quot; to generate reminders from Feb 2026 to now</p>
          </div>
        ) : (
          <div className="p-4">
            {/* Group by period */}
            {Object.entries(
              reminderItems.reduce<Record<string, typeof reminderItems>>((groups, item) => {
                const key = `${item.period_year}-${item.period_month}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
                return groups;
              }, {})
            ).map(([key, items]) => (
              <div key={key} className="mb-4 last:mb-0">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {items[0].periodLabel}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => markReminderPaid(item.id)}
                      className={`group relative flex flex-col rounded-xl border px-3 py-2.5 text-left transition-all hover:shadow-sm ${
                        item.isOverdue
                          ? "border-red-300 bg-red-50/80 hover:border-red-400"
                          : item.isAlmostDue
                          ? "border-amber-300 bg-amber-50/60 hover:border-amber-400"
                          : "border-border bg-background hover:border-emerald-300 hover:bg-emerald-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs font-semibold leading-tight ${
                          item.isOverdue ? "text-red-600" : "text-foreground"
                        }`}>
                          {item.label}
                        </p>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all ${
                          item.isOverdue
                            ? "border-red-400 group-hover:border-emerald-500 group-hover:bg-emerald-500"
                            : item.isAlmostDue
                            ? "border-amber-400 group-hover:border-emerald-500 group-hover:bg-emerald-500"
                            : "border-muted-foreground/30 group-hover:border-emerald-500 group-hover:bg-emerald-500"
                        }`}>
                          <Check className="h-2.5 w-2.5 text-transparent group-hover:text-white" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground">
                          Due {item.dueDay}th
                        </span>
                        <span className="text-[9px] text-muted-foreground/50">|</span>
                        {item.isOverdue ? (
                          <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-red-100 text-red-600">
                            Overdue
                          </span>
                        ) : item.isAlmostDue ? (
                          <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-600">
                            Due Soon
                          </span>
                        ) : (
                          <span className="rounded px-1 py-0.5 text-[9px] font-semibold bg-secondary text-muted-foreground">
                            Upcoming
                          </span>
                        )}
                      </div>
                      {Number(item.amount) > 0 && (
                        <p className="mt-1 text-[10px] font-semibold text-foreground">
                          {formatBaht(Number(item.amount))}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Cost Form ── */}
      {showForm && (
        <div className="mb-6 rounded-2xl border-2 border-violet-200 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              {editingId ? "Edit Fixed Cost" : "Add Fixed Cost"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(false); }}
                className="rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Recurring toggle */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cost Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecurring(true)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-xs font-semibold transition-all ${
                    isRecurring
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-border bg-background text-muted-foreground hover:border-violet-300"
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Recurring
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecurring(false)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-xs font-semibold transition-all ${
                    !isRecurring
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-border bg-background text-muted-foreground hover:border-violet-300"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  This Month Only
                </button>
              </div>
            </div>

            {/* Period */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Period
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setPeriodMode("this_month"); setFormMonth(bkkMonth); setFormYear(bkkYear); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                    periodMode === "this_month"
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-border bg-background text-muted-foreground hover:border-violet-300"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  This Month ({new Date(bkkYear, bkkMonth - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })})
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode("custom")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                    periodMode === "custom"
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-border bg-background text-muted-foreground hover:border-violet-300"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Custom
                </button>
              </div>
              {periodMode === "custom" && (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <select
                      value={formMonth}
                      onChange={(e) => setFormMonth(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-input bg-background px-3.5 py-2.5 pr-8 text-sm text-foreground focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2026, i).toLocaleDateString("en-US", { month: "long" })}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <div className="w-28 relative">
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full appearance-none rounded-xl border border-input bg-background px-3.5 py-2.5 pr-8 text-sm text-foreground focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                      {[2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                Submitted: {new Date().toLocaleDateString("en-US", { timeZone: "Asia/Bangkok", month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCategoryChange(c)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      category === c
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-border bg-background text-muted-foreground hover:border-violet-300"
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* Name with suggestions */}
            <div className="relative" ref={suggestionsRef}>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => {
                  const sug = CATEGORY_SUGGESTIONS[category];
                  if (sug && sug.length > 0 && !name) {
                    setSuggestions(sug);
                    setShowSuggestions(true);
                  }
                }}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                placeholder={
                  category === "utilities"
                    ? "e.g. Water, Electricity"
                    : category === "credit_card"
                    ? "e.g. UMB"
                    : category === "employees"
                    ? "e.g. First Half Salary, Second Half Salary"
                    : "Enter name"
                }
              />
              {/* Suggestion popup */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-violet-200 bg-card shadow-lg">
                  <div className="border-b border-border/50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick Pick
                    </p>
                  </div>
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setName(sug);
                        setShowSuggestions(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-violet-50"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">
                        {sug[0]}
                      </span>
                      {sug}
                    </button>
                  ))}
                  <div className="border-t border-border/50 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">
                      Or type a custom name above
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {"Amount (THB) *"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {"฿"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-7 pr-3.5 text-sm text-foreground focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment Method
                </label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-input bg-background px-3.5 py-2.5 pr-8 text-sm text-foreground focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Receipt Image Upload */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Receipt Image
              </label>
              {receiptImageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={receiptImageUrl}
                    alt="Receipt"
                    className="max-h-48 rounded-xl object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptImageUrl(null)}
                    className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 shadow-md hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-6 transition-all">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploading}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 transition-colors hover:bg-violet-200 active:bg-violet-300 disabled:opacity-50"
                      aria-label="Take photo"
                    >
                      <Camera className="h-4 w-4 text-violet-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 transition-colors hover:bg-violet-200 active:bg-violet-300 disabled:opacity-50"
                      aria-label="Upload from gallery"
                    >
                      <Upload className="h-4 w-4 text-violet-500" />
                    </button>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {uploading
                      ? "Uploading..."
                      : "Tap to upload receipt image"}
                  </span>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-violet-500/20 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {editingId ? "Update" : "Save"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatBaht(totalAll)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {costs.length} items
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-500 p-4 shadow-lg shadow-emerald-500/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-50/80">
            Paid
          </p>
          <p className="text-lg font-bold text-white">
            {formatBaht(totalPaid)}
          </p>
          <p className="text-[11px] text-emerald-50/70 mt-0.5">
            {paidCount} of {costs.length}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-500 p-4 shadow-lg shadow-amber-500/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-50/80">
            Unpaid
          </p>
          <p className="text-lg font-bold text-white">
            {formatBaht(totalUnpaid)}
          </p>
          <p className="text-[11px] text-amber-50/70 mt-0.5">
            {costs.length - paidCount} remaining
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {costs.length > 0 && (
        <div className="mb-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${totalAll > 0 ? (totalPaid / totalAll) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0}% paid
          </p>
        </div>
      )}

      {/* ── Activities (All Costs) ── */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : costs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              No fixed costs for this month yet.
            </p>
          </div>
        </div>
      ) : (
        <CostSection
          title="Activities"
          subtitle={`${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })} payments`}
          icon={<RotateCcw className="h-3.5 w-3.5 text-violet-500" />}
          costs={costs}
          togglePaid={togglePaid}
          deleteCost={deleteCost}
          editCost={editCost}
        />
      )}

      {/* ── Pie Chart ── */}
      {pieData.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-foreground">
            Fixed Cost Breakdown
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">By category this month</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={11}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: number) => formatBaht(val)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── Helper: check if a fixed cost maps to a reminder ── */
function isLinkedToReminder(cost: FixedCost): boolean {
  const n = cost.name.toLowerCase().trim();
  if (cost.category === "utilities" && (n.includes("water") || n.includes("electric"))) return true;
  if (cost.category === "credit_card" && (n.includes("uob") || n.includes("umb"))) return true;
  if (cost.category === "internet") return true;
  if (cost.category === "employees" && (n.includes("first") || n.includes("1st") || n.includes("second") || n.includes("2nd"))) return true;
  return false;
}

/* ── Cost Section Component ── */
function CostSection({
  title,
  subtitle,
  icon,
  costs,
  togglePaid,
  deleteCost,
  editCost,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  costs: FixedCost[];
  togglePaid: (id: string, isPaid: boolean) => void;
  deleteCost: (id: string, name: string) => void;
  editCost: (cost: FixedCost) => void;
}) {
  const sectionPaid = costs.filter((c) => c.is_paid).length;
  const allPaid = sectionPaid === costs.length;

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <h2 className="text-sm font-bold text-foreground">{title}</h2>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allPaid ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <Check className="h-3 w-3" /> All Paid
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {sectionPaid}/{costs.length} paid
            </span>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col divide-y divide-border/50 md:hidden">
        {costs.map((cost) => (
          <CostCardMobile key={cost.id} cost={cost} togglePaid={togglePaid} deleteCost={deleteCost} editCost={editCost} />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 w-16">Status</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {costs.map((cost) => (
              <CostRowDesktop
                key={cost.id}
                cost={cost}
                togglePaid={togglePaid}
                deleteCost={deleteCost}
                editCost={editCost}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Desktop Row ── */
function CostRowDesktop({
  cost,
  togglePaid,
  deleteCost,
  editCost,
}: {
  cost: FixedCost;
  togglePaid: (id: string, isPaid: boolean) => void;
  deleteCost: (id: string, name: string) => void;
  editCost: (cost: FixedCost) => void;
}) {
  return (
    <tr
      className={`group border-b border-border/50 transition-all duration-300 last:border-0 ${
        cost.is_paid ? "bg-emerald-50/60" : ""
      }`}
    >
      <td className="px-5 py-3">
        <button
          onClick={() => togglePaid(cost.id, !cost.is_paid)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
            cost.is_paid
              ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
              : "border-muted-foreground/30 bg-transparent hover:border-emerald-400 hover:bg-emerald-50"
          }`}
          aria-label={cost.is_paid ? "Mark unpaid" : "Mark paid"}
        >
          {cost.is_paid ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
        </button>
      </td>
      <td
        className={`px-5 py-3 font-medium ${
          cost.is_paid
            ? "text-muted-foreground line-through"
            : "text-foreground"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {cost.name}
          {cost.receipt_image_url && (
            <a
              href={cost.receipt_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0"
              title="View receipt"
            >
              <Camera className="h-3.5 w-3.5 text-violet-500" />
            </a>
          )}
        </span>
      </td>
      <td className="px-5 py-3">
        <span className={`block text-xs ${cost.is_paid ? "text-muted-foreground/70" : "text-foreground"}`}>
          {new Date(cost.period_year, cost.period_month - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
        {cost.is_paid && cost.paid_date ? (
          <span className="block text-[10px] font-medium text-emerald-600 mt-0.5">
            Paid {new Date(cost.paid_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ) : (
          <span className="block text-[10px] text-muted-foreground/60 mt-0.5">
            {cost.is_recurring ? "Recurring" : "One-time"}
          </span>
        )}
      </td>
      <td
        className={`px-5 py-3 capitalize ${
          cost.is_paid ? "text-muted-foreground/70" : "text-muted-foreground"
        }`}
      >
        {CATEGORY_LABELS[cost.category] || cost.category}
      </td>
      <td
        className={`px-5 py-3 ${
          cost.is_paid ? "text-muted-foreground/70" : "text-muted-foreground"
        }`}
      >
        {cost.payment_method}
      </td>
      <td
        className="whitespace-nowrap px-5 py-3 text-right font-semibold text-red-600"
      >
        -{formatBaht(Number(cost.amount))}
      </td>
      <td className="px-5 py-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => editCost(cost)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-secondary hover:text-foreground"
            aria-label={`Edit ${cost.name}`}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => deleteCost(cost.id, cost.name)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${cost.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Mobile Card ── */
function CostCardMobile({
  cost,
  togglePaid,
  deleteCost,
  editCost,
}: {
  cost: FixedCost;
  togglePaid: (id: string, isPaid: boolean) => void;
  deleteCost: (id: string, name: string) => void;
  editCost: (cost: FixedCost) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 transition-all duration-300 ${
        cost.is_paid ? "bg-emerald-50/60" : ""
      }`}
    >
      <button
        onClick={() => togglePaid(cost.id, !cost.is_paid)}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
          cost.is_paid
            ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
            : "border-muted-foreground/30 bg-transparent"
        }`}
        aria-label={cost.is_paid ? "Mark unpaid" : "Mark paid"}
      >
        {cost.is_paid ? <Check className="h-6 w-6" strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`flex items-center gap-1.5 truncate text-sm font-medium ${
            cost.is_paid
              ? "text-muted-foreground line-through"
              : "text-foreground"
          }`}
        >
          {cost.name}
          {cost.receipt_image_url && (
            <a
              href={cost.receipt_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0"
              title="View receipt"
            >
              <Camera className="h-3.5 w-3.5 text-violet-500" />
            </a>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {CATEGORY_LABELS[cost.category] || cost.category} &middot;{" "}
          {cost.payment_method} &middot;{" "}
          {new Date(cost.period_year, cost.period_month - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          {cost.is_recurring ? "" : " (One-time)"}
        </p>
        {cost.is_paid && cost.paid_date && (
          <p className="text-[10px] text-emerald-600">
            Paid {new Date(cost.paid_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
      <p className="shrink-0 text-sm font-semibold text-red-600">
        -{formatBaht(Number(cost.amount))}
      </p>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => editCost(cost)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-secondary hover:text-foreground"
          aria-label={`Edit ${cost.name}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => deleteCost(cost.id, cost.name)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete ${cost.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
