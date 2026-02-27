"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatBaht } from "@/lib/utils";
import {
  Plus,
  Check,
  Upload,
  Camera,
  Trash2,
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
  "advertising",
  "rent",
  "insurance",
  "other",
];

const CATEGORY_LABELS: Record<string, string> = {
  utilities: "Utilities",
  employees: "Employees",
  credit_card: "Credit Card",
  advertising: "Advertising",
  rent: "Rent",
  insurance: "Insurance",
  other: "Other",
};

// Smart suggestions per category
const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  utilities: ["Water", "Electricity"],
  credit_card: ["UMB"],
  employees: ["First Half", "Second Half"],
};

// Bills to track in reminder section
const REMINDER_BILLS = [
  { name: "Electricity", category: "utilities" },
  { name: "Water", category: "utilities" },
  { name: "UMB Credit Card", category: "credit_card" },
  { name: "Rent", category: "rent" },
  { name: "Insurance", category: "insurance" },
  { name: "First Half", category: "employees" },
  { name: "Second Half", category: "employees" },
];

const PAYMENT_METHODS = ["Cash", "KBank", "SCB", "Bangkok Bank", "Krungsri"];
const PIE_COLORS = ["#22c55e", "#06b6d4", "#f59e0b", "#a78bfa", "#f43f5e", "#8b5cf6"];

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

export default function FixedCostsPage() {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data, isLoading } = useSWR(
    `/api/fixed-costs?month=${month}&year=${year}`,
    fetcher
  );
  const costs: FixedCost[] = data?.costs ?? [];

  // Also fetch previous month to check overdue
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { data: prevData } = useSWR(
    `/api/fixed-costs?month=${prevMonth}&year=${prevYear}`,
    fetcher
  );
  const prevCosts: FixedCost[] = prevData?.costs ?? [];

  const [showForm, setShowForm] = useState(false);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/fixed-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          amount: Number(amount),
          paymentMethod,
          dueDay: dueDay ? Number(dueDay) : null,
          periodMonth: month,
          periodYear: year,
          notes: notes || null,
          isRecurring,
          receiptImageUrl: receiptImageUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      resetForm();
      setShowForm(false);
      mutate(`/api/fixed-costs?month=${month}&year=${year}`);
    } catch (err) {
      alert("Failed to save fixed cost.");
      console.error(err);
    }
    setSaving(false);
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
    } catch (err) {
      console.error(err);
    }
  };

  // Computed
  const recurringCosts = costs.filter((c) => c.is_recurring);
  const oneTimeCosts = costs.filter((c) => !c.is_recurring);

  const methodTotals: Record<string, number> = {};
  costs
    .filter((c) => c.is_paid)
    .forEach((c) => {
      methodTotals[c.payment_method] =
        (methodTotals[c.payment_method] || 0) + Number(c.amount);
    });
  const pieData = Object.entries(methodTotals)
    .map(([name, value]) => ({ name, value }))
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

  // Reminder logic: check if each bill has been paid this month or is overdue from last month
  const reminderItems = REMINDER_BILLS.map((bill) => {
    // Check current month
    const currentMatch = costs.find(
      (c) =>
        c.name.toLowerCase().includes(bill.name.toLowerCase()) ||
        (bill.name === "UMB Credit Card" && c.name.toLowerCase().includes("umb"))
    );
    const isPaidThisMonth = currentMatch?.is_paid ?? false;
    const existsThisMonth = !!currentMatch;

    // Check previous month
    const prevMatch = prevCosts.find(
      (c) =>
        c.name.toLowerCase().includes(bill.name.toLowerCase()) ||
        (bill.name === "UMB Credit Card" && c.name.toLowerCase().includes("umb"))
    );
    const wasPaidLastMonth = prevMatch?.is_paid ?? false;
    const existedLastMonth = !!prevMatch;

    // Overdue: existed last month but wasn't paid, OR doesn't exist this month yet
    const isOverdue = (existedLastMonth && !wasPaidLastMonth) || (!existsThisMonth && now.getDate() > 5);

    return {
      ...bill,
      isPaidThisMonth,
      existsThisMonth,
      isOverdue,
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
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold text-foreground">Fixed Cost Reminder</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {reminderItems.filter((r) => r.isPaidThisMonth).length}/{reminderItems.length} paid
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {reminderItems.map((item) => {
            const isRed = item.isOverdue && !item.isPaidThisMonth;
            return (
              <div
                key={item.name}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
                  item.isPaidThisMonth
                    ? "border-emerald-200 bg-emerald-50/60"
                    : isRed
                    ? "border-red-300 bg-red-50/80"
                    : "border-border bg-background"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    item.isPaidThisMonth
                      ? "border-emerald-500 bg-emerald-500"
                      : isRed
                      ? "border-red-400 bg-transparent"
                      : "border-muted-foreground/30 bg-transparent"
                  }`}
                >
                  {item.isPaidThisMonth && (
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-semibold ${
                      item.isPaidThisMonth
                        ? "text-emerald-700 line-through"
                        : isRed
                        ? "text-red-600"
                        : "text-foreground"
                    }`}
                  >
                    {item.name}
                  </p>
                  {isRed && (
                    <p className="text-[9px] font-medium text-red-500">Overdue</p>
                  )}
                  {!item.isPaidThisMonth && !isRed && (
                    <p className="text-[9px] text-muted-foreground">Pending</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Add Cost Form ── */}
      {showForm && (
        <div className="mb-6 rounded-2xl border-2 border-violet-200 bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">
            Add Fixed Cost
          </h2>
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
                    ? "e.g. First Half, Second Half"
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
                    Save
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

      {/* ── Cost Lists ── */}
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
        <>
          {recurringCosts.length > 0 && (
            <CostSection
              title="Recurring Costs"
              subtitle="Every month"
              icon={<RotateCcw className="h-3.5 w-3.5 text-violet-500" />}
              costs={recurringCosts}
              togglePaid={togglePaid}
            />
          )}
          {oneTimeCosts.length > 0 && (
            <CostSection
              title="This Month Only"
              subtitle="One-time for this period"
              icon={<CalendarDays className="h-3.5 w-3.5 text-amber-500" />}
              costs={oneTimeCosts}
              togglePaid={togglePaid}
            />
          )}
        </>
      )}

      {/* ── Pie Chart ── */}
      {pieData.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-foreground">
            Payments by Method
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">Paid costs only</p>
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

/* ── Cost Section Component ── */
function CostSection({
  title,
  subtitle,
  icon,
  costs,
  togglePaid,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  costs: FixedCost[];
  togglePaid: (id: string, isPaid: boolean) => void;
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

      {/* Mobile cards */}
      <div className="flex flex-col divide-y divide-border/50 md:hidden">
        {costs.map((cost) => (
          <CostCardMobile key={cost.id} cost={cost} togglePaid={togglePaid} />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 w-16">Status</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((cost) => (
              <CostRowDesktop
                key={cost.id}
                cost={cost}
                togglePaid={togglePaid}
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
}: {
  cost: FixedCost;
  togglePaid: (id: string, isPaid: boolean) => void;
}) {
  return (
    <tr
      className={`border-b border-border/50 transition-all duration-300 last:border-0 ${
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
        className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${
          cost.is_paid ? "text-emerald-600" : "text-foreground"
        }`}
      >
        {formatBaht(Number(cost.amount))}
      </td>
    </tr>
  );
}

/* ── Mobile Card ── */
function CostCardMobile({
  cost,
  togglePaid,
}: {
  cost: FixedCost;
  togglePaid: (id: string, isPaid: boolean) => void;
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
          {cost.payment_method}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-semibold ${
          cost.is_paid ? "text-emerald-600" : "text-foreground"
        }`}
      >
        {formatBaht(Number(cost.amount))}
      </p>
    </div>
  );
}
