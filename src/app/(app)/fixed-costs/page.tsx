"use client";

import { useState, useRef } from "react";
import { formatBaht } from "@/lib/utils";
import { Plus, Check, Upload, Camera, Trash2, RotateCcw, CalendarDays } from "lucide-react";
import useSWR, { mutate } from "swr";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const CATEGORIES = [
  "utilities",
  "employees",
  "advertising",
  "rent",
  "insurance",
  "other",
];
const PAYMENT_METHODS = ["Cash", "KBank", "SCB", "Bangkok Bank", "Krungsri"];
const PIE_COLORS = ["#22c55e", "#06b6d4", "#f59e0b", "#a78bfa", "#f43f5e"];

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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Reset inputs so same file can be re-selected
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Split costs by type
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fixed Costs</h1>
          <p className="text-xs text-muted-foreground">{thaiMonth}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            resetForm();
          }}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition-all hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Add Cost
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">
            Add Fixed Cost
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Recurring toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Electricity, Water"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-7 pr-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Receipt Image Upload */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  {/* Camera capture input (opens camera on mobile) */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                  {/* File picker input (opens gallery/files) */}
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
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

      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-50/80">
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
          <p className="text-xs font-medium uppercase tracking-wide text-amber-50/80">
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
              style={{ width: `${totalAll > 0 ? (totalPaid / totalAll) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0}% paid
          </p>
        </div>
      )}

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
          {/* Recurring Costs Section */}
          {recurringCosts.length > 0 && (
            <CostSection
              title="Recurring Costs"
              subtitle="Every month"
              icon={<RotateCcw className="h-3.5 w-3.5 text-violet-500" />}
              costs={recurringCosts}
              togglePaid={togglePaid}
            />
          )}

          {/* This Month Only Section */}
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

      {/* Pie Chart: Payments by Method */}
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
              <CostRowDesktop key={cost.id} cost={cost} togglePaid={togglePaid} />
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
      <td className={`px-5 py-3 font-medium ${cost.is_paid ? "text-muted-foreground line-through" : "text-foreground"}`}>
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
      <td className={`px-5 py-3 capitalize ${cost.is_paid ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
        {cost.category}
      </td>
      <td className={`px-5 py-3 ${cost.is_paid ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
        {cost.payment_method}
      </td>
      <td className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${cost.is_paid ? "text-emerald-600" : "text-foreground"}`}>
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
        <p className={`flex items-center gap-1.5 truncate text-sm font-medium ${cost.is_paid ? "text-muted-foreground line-through" : "text-foreground"}`}>
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
        <p className="text-xs capitalize text-muted-foreground">
          {cost.category} &middot; {cost.payment_method}
        </p>
      </div>
      <p className={`shrink-0 text-sm font-semibold ${cost.is_paid ? "text-emerald-600" : "text-foreground"}`}>
        {formatBaht(Number(cost.amount))}
      </p>
    </div>
  );
}
