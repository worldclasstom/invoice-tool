"use client";

import { useState } from "react";
import { formatBaht } from "@/lib/utils";
import { Plus, Check, Upload, Camera, Trash2 } from "lucide-react";
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
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
  };

  const resetForm = () => {
    setName("");
    setCategory("utilities");
    setAmount("");
    setPaymentMethod("Cash");
    setDueDay("");
    setNotes("");
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
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-6 py-6 transition-all hover:border-violet-400 hover:bg-violet-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100">
                      <Camera className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100">
                      <Upload className="h-4 w-4 text-violet-500" />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {uploading
                      ? "Uploading..."
                      : "Tap to upload receipt image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                </label>
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
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-500 p-4 shadow-lg shadow-emerald-500/20">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-50/80">
            Paid
          </p>
          <p className="text-lg font-bold text-white">
            {formatBaht(totalPaid)}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-500 p-4 shadow-lg shadow-amber-500/20">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-50/80">
            Unpaid
          </p>
          <p className="text-lg font-bold text-white">
            {formatBaht(totalUnpaid)}
          </p>
        </div>
      </div>

      {/* Cost Table */}
      <div className="mb-6 rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">
            Monthly Fixed Costs
          </h2>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : costs.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((cost) => (
                    <tr
                      key={cost.id}
                      className={`border-b border-border/50 transition-all last:border-0 ${
                        cost.is_paid ? "bg-emerald-50" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <button
                          onClick={() => togglePaid(cost.id, !cost.is_paid)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                            cost.is_paid
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-muted-foreground/30 bg-transparent hover:border-emerald-400"
                          }`}
                          aria-label={
                            cost.is_paid ? "Mark unpaid" : "Mark paid"
                          }
                        >
                          {cost.is_paid ? (
                            <Check className="h-4 w-4" />
                          ) : null}
                        </button>
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">
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
                      <td className="px-5 py-3 capitalize text-muted-foreground">
                        {cost.category}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {cost.payment_method}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-foreground">
                        {formatBaht(Number(cost.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col divide-y divide-border/50 md:hidden">
              {costs.map((cost) => (
                <div
                  key={cost.id}
                  className={`flex items-center gap-3 px-4 py-3 ${cost.is_paid ? "bg-emerald-50" : ""}`}
                >
                  <button
                    onClick={() => togglePaid(cost.id, !cost.is_paid)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      cost.is_paid
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/30 bg-transparent"
                    }`}
                    aria-label={cost.is_paid ? "Mark unpaid" : "Mark paid"}
                  >
                    {cost.is_paid ? <Check className="h-4 w-4" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
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
                  <p className="shrink-0 text-sm font-semibold text-foreground">
                    {formatBaht(Number(cost.amount))}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              No fixed costs for this month yet.
            </p>
          </div>
        )}
      </div>

      {/* Pie Chart: Payments by Method */}
      {pieData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
