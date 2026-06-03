"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { BarChart3, CalendarDays, Download, Fuel, Plus, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { bookingApi, expenseApi, invoiceApi } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/labels";
import type { Booking, Expense, InvoiceTemplate } from "@/types";

const categories = [
  { value: "fuel", label: "Fuel", icon: Fuel },
  { value: "food", label: "Food", icon: ReceiptText },
  { value: "repair", label: "Repair", icon: WalletCards },
  { value: "salary", label: "Salary", icon: WalletCards },
  { value: "utility", label: "Utility", icon: WalletCards },
  { value: "other", label: "Other", icon: ReceiptText },
];

export default function RevenuePage() {
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "fuel",
    note: "",
  });
  const [invoiceTemplate, setInvoiceTemplate] = useState({
    title: "",
    businessName: "",
    phone: "",
    address: "",
    paymentInstructions: "",
    terms: "",
    footerNote: "",
  });
  const params = { from: from || undefined, to: to || undefined };

  const { data: reportData, isLoading: loadingReport } = useQuery({
    queryKey: ["finance-report", from, to],
    queryFn: () => expenseApi.report(params),
  });
  const { data: bookingData } = useQuery({
    queryKey: ["revenue-bookings", from, to],
    queryFn: () => bookingApi.list({ status: "confirmed", limit: 20, ...params }),
  });
  const { data: expenseData } = useQuery({
    queryKey: ["expenses-finance", from, to],
    queryFn: () => expenseApi.list({ ...params, limit: 20 }),
  });
  const { data: templateData } = useQuery({
    queryKey: ["invoice-template"],
    queryFn: () => invoiceApi.getTemplate(),
  });

  const report = reportData?.data?.data;
  const template: InvoiceTemplate | undefined = templateData?.data?.data?.template;
  const bookings: Booking[] = bookingData?.data?.data?.bookings || [];
  const expenses: Expense[] = expenseData?.data?.data?.expenses || [];
  const revenue = report?.totalRevenue || 0;
  const grossRevenue = report?.grossRevenue || revenue;
  const agentCommission = report?.agentCommission || 0;
  const expense = report?.totalExpense || 0;
  const profit = report?.netProfit || 0;
  const currentInvoiceTemplate = {
    title: invoiceTemplate.title || template?.title || "",
    businessName: invoiceTemplate.businessName || template?.businessName || "",
    phone: invoiceTemplate.phone || template?.phone || "",
    address: invoiceTemplate.address || template?.address || "",
    paymentInstructions: invoiceTemplate.paymentInstructions || template?.paymentInstructions || "",
    terms: invoiceTemplate.terms || template?.terms || "",
    footerNote: invoiceTemplate.footerNote || template?.footerNote || "",
  };

  const createExpense = useMutation({
    mutationFn: () => expenseApi.create({
      ...expenseForm,
      amount: Number(expenseForm.amount),
      date: new Date().toISOString(),
    }),
    onSuccess: () => {
      toast.success("Expense added.");
      setExpenseForm({ title: "", amount: "", category: "fuel", note: "" });
      qc.invalidateQueries({ queryKey: ["finance-report"] });
      qc.invalidateQueries({ queryKey: ["expenses-finance"] });
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not add expense"),
  });

  const updateTemplate = useMutation({
    mutationFn: () => invoiceApi.updateTemplate(currentInvoiceTemplate),
    onSuccess: () => {
      toast.success("Invoice template saved.");
      qc.invalidateQueries({ queryKey: ["invoice-template"] });
    },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not save invoice template"),
  });

  return (
    <div className="min-h-screen bg-[#fbf5ff] px-4 pb-28 pt-5 text-[#151020]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#563795]">Finance</p>
          <h1 className="mt-1 text-2xl font-bold">Revenue Control</h1>
        </div>
        <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#563795] text-white"><Download size={20} /></button>
      </div>

      <section className="mb-5 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold"><CalendarDays size={18} /> Reporting Period</p>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="input text-sm" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="input text-sm" />
        </div>
      </section>

      {loadingReport ? (
        <div className="py-16 text-center text-slate-500">Loading revenue...</div>
      ) : (
        <>
          <section className="grid gap-3">
            <MetricCard title="Gross Revenue" value={formatMoney(grossRevenue)} icon={<TrendingUp size={22} />} tone="bg-emerald-100 text-emerald-700" />
            <MetricCard title="Agent Commission" value={formatMoney(agentCommission)} icon={<WalletCards size={22} />} tone="bg-amber-100 text-amber-700" />
            <MetricCard title="Net Revenue" value={formatMoney(revenue)} icon={<TrendingUp size={22} />} tone="bg-emerald-100 text-emerald-700" />
            <MetricCard title="Expenses" value={formatMoney(expense)} icon={<WalletCards size={22} />} tone="bg-red-100 text-red-700" />
            <MetricCard title="Net Profit" value={formatMoney(profit)} icon={<BarChart3 size={22} />} tone="bg-[#dfd0ff] text-[#32157c]" />
          </section>

          <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Profit Chart</h2>
              <span className="text-xs font-bold text-[#32157c]">Revenue - Expenses</span>
            </div>
            <div className="space-y-4">
              <Progress label="Revenue" value={revenue} max={Math.max(revenue, expense, 1)} color="bg-emerald-500" />
              <Progress label="Expenses" value={expense} max={Math.max(revenue, expense, 1)} color="bg-red-500" />
              <Progress label="Profit" value={Math.max(profit, 0)} max={Math.max(revenue, expense, 1)} color="bg-[#563795]" />
            </div>
          </section>

          <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold">Daily Expense Entry</h2>
            <div className="grid gap-3">
              <input value={expenseForm.title} onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })} placeholder="Expense title" className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} type="number" placeholder="Amount" className="input" />
                <select value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} className="input">
                  {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
              </div>
              <textarea value={expenseForm.note} onChange={(event) => setExpenseForm({ ...expenseForm, note: event.target.value })} placeholder="Note" rows={2} className="input" />
              <button
                onClick={() => createExpense.mutate()}
                disabled={!expenseForm.title || !expenseForm.amount || createExpense.isPending}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#563795] py-3 font-bold text-white disabled:opacity-60"
              >
                <Plus size={18} /> {createExpense.isPending ? "Adding..." : "Add Expense"}
              </button>
            </div>
          </section>

          <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold">Invoice Template</h2>
            <div className="grid gap-3">
              <input value={currentInvoiceTemplate.title} onChange={(event) => setInvoiceTemplate({ ...currentInvoiceTemplate, title: event.target.value })} placeholder="Invoice title" className="input" />
              <input value={currentInvoiceTemplate.businessName} onChange={(event) => setInvoiceTemplate({ ...currentInvoiceTemplate, businessName: event.target.value })} placeholder="Business name" className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input value={currentInvoiceTemplate.phone} onChange={(event) => setInvoiceTemplate({ ...currentInvoiceTemplate, phone: event.target.value })} placeholder="Phone" className="input" />
                <input value={currentInvoiceTemplate.address} onChange={(event) => setInvoiceTemplate({ ...currentInvoiceTemplate, address: event.target.value })} placeholder="Address" className="input" />
              </div>
              <textarea value={currentInvoiceTemplate.paymentInstructions} onChange={(event) => setInvoiceTemplate({ ...currentInvoiceTemplate, paymentInstructions: event.target.value })} placeholder="Payment instructions" rows={2} className="input" />
              <textarea value={currentInvoiceTemplate.terms} onChange={(event) => setInvoiceTemplate({ ...currentInvoiceTemplate, terms: event.target.value })} placeholder="Terms" rows={2} className="input" />
              <textarea value={currentInvoiceTemplate.footerNote} onChange={(event) => setInvoiceTemplate({ ...currentInvoiceTemplate, footerNote: event.target.value })} placeholder="Footer note" rows={2} className="input" />
              <button
                onClick={() => updateTemplate.mutate()}
                disabled={updateTemplate.isPending}
                className="rounded-lg bg-[#563795] py-3 font-bold text-white disabled:opacity-60"
              >
                {updateTemplate.isPending ? "Saving..." : "Save Invoice Template"}
              </button>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-bold">Recent Revenue</h2>
            <div className="grid gap-2">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking._id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
                  <div>
                    <p className="font-semibold">{booking.customerName}</p>
                    <p className="text-xs text-slate-500">{formatDate(booking.checkIn)}</p>
                  </div>
                  <p className="font-bold text-emerald-600">{formatMoney(booking.totalPrice)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-bold">Recent Expenses</h2>
            <div className="grid gap-2">
              {expenses.slice(0, 5).map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-slate-500">{formatDate(item.date)} · {item.category}</p>
                  </div>
                  <p className="font-bold text-red-600">{formatMoney(item.amount)}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: string }) {
  return (
    <article className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
    </article>
  );
}

function Progress({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span>{formatMoney(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-[#eee7f4]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}
