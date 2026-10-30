import { useState, useMemo } from "react";
import type { useStore } from "../hooks/useStore";
import type { Sale, Expense } from "../types";
import { BarChart3, Banknote, QrCode, Calendar, TrendingUp } from "lucide-react";

type StoreType = ReturnType<typeof useStore>;
interface Props { store: StoreType; }

type FilterPeriod = "today" | "yesterday" | "7days" | "30days" | "custom";

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Reports({ store }: Props) {
  const { sales, expenses, today } = store;
  const [period, setPeriod] = useState<FilterPeriod>("today");
  const [customDate, setCustomDate] = useState(today);

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, []);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, []);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  }, []);

  const { filteredSales, filteredExpenses, periodLabel } = useMemo(() => {
    let sList: Sale[] = [];
    let eList: Expense[] = [];
    let label = "Today";

    if (period === "today") {
      sList = sales.filter((s) => s.date === today);
      eList = expenses.filter((e) => e.date === today);
      label = "Today";
    } else if (period === "yesterday") {
      sList = sales.filter((s) => s.date === yesterday);
      eList = expenses.filter((e) => e.date === yesterday);
      label = `Yesterday (${yesterday})`;
    } else if (period === "7days") {
      sList = sales.filter((s) => s.date >= sevenDaysAgo && s.date <= today);
      eList = expenses.filter((e) => e.date >= sevenDaysAgo && e.date <= today);
      label = "Last 7 Days";
    } else if (period === "30days") {
      sList = sales.filter((s) => s.date >= thirtyDaysAgo && s.date <= today);
      eList = expenses.filter((e) => e.date >= thirtyDaysAgo && e.date <= today);
      label = "Last 30 Days";
    } else if (period === "custom") {
      sList = sales.filter((s) => s.date === customDate);
      eList = expenses.filter((e) => e.date === customDate);
      label = `Date: ${customDate}`;
    }

    return { filteredSales: sList, filteredExpenses: eList, periodLabel: label };
  }, [sales, expenses, period, customDate, today, yesterday, sevenDaysAgo, thirtyDaysAgo]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCost = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalCost;
  const totalWeight = filteredSales.reduce((sum, s) => sum + s.weight, 0);

  const cashSales = filteredSales.filter((s) => s.paymentMethod === "cash").reduce((sum, s) => sum + s.totalAmount, 0);
  const upiSales = filteredSales.filter((s) => s.paymentMethod === "upi").reduce((sum, s) => sum + s.totalAmount, 0);
  const cashPercent = totalRevenue > 0 ? Math.round((cashSales / totalRevenue) * 100) : 0;
  const upiPercent = totalRevenue > 0 ? 100 - cashPercent : 0;

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <BarChart3 size={20} className="text-orange-500" />
            <span>Business Reports</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{periodLabel}</p>
        </div>
      </div>

      {/* Filter Period Chips */}
      <div className="card p-2.5 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setPeriod("today")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 active:scale-95 ${
              period === "today"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            Today
          </button>

          <button
            onClick={() => setPeriod("yesterday")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 active:scale-95 ${
              period === "yesterday"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            Yesterday
          </button>

          <button
            onClick={() => setPeriod("7days")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 active:scale-95 ${
              period === "7days"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            7 Days
          </button>

          <button
            onClick={() => setPeriod("30days")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 active:scale-95 ${
              period === "30days"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            30 Days
          </button>

          <button
            onClick={() => setPeriod("custom")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 active:scale-95 flex items-center gap-1 ${
              period === "custom"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Calendar size={13} />
            <span>Custom</span>
          </button>
        </div>

        {period === "custom" && (
          <div className="pt-1.5 flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">Date:</label>
            <input
              type="date"
              max={today}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
            />
          </div>
        )}
      </div>

      {/* Primary KPI Hero Card */}
      <div className="card bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} className="text-orange-500" />
            <span>Net Estimated Profit</span>
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              netProfit >= 0
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
            }`}
          >
            {netProfit >= 0 ? "▲ Profit" : "▼ Loss"}
          </span>
        </div>

        <p className={`text-3xl font-black ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {fmt(netProfit)}
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Total Sales: </span>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100">{fmt(totalRevenue)}</p>
            <span className="text-[10px] text-slate-400">
              {filteredSales.length} sales ({totalWeight.toFixed(1)} kg)
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Total Expenses: </span>
            <p className="text-base font-bold text-red-600 dark:text-red-400">{fmt(totalCost)}</p>
            <span className="text-[10px] text-slate-400">
              {filteredExpenses.length} expense items
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method Split Card */}
      <div className="card space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <span>Payment Breakdown</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Cash vs UPI Split</span>
        </div>

        <div className="h-3 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden flex border border-slate-300 dark:border-slate-700/50">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${cashPercent}%` }}
          />
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${upiPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Banknote size={13} className="text-emerald-600" />
                <span>Cash: {fmt(cashSales)}</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{cashPercent}% of sales</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right justify-end">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 justify-end">
                <QrCode size={13} className="text-blue-500" />
                <span>UPI: {fmt(upiSales)}</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{upiPercent}% of sales</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Transaction Log for Period */}
      <div className="card space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Sales History ({filteredSales.length})
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {totalWeight.toFixed(2)} kg total
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-xs text-center py-6">No sales found for this period</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {filteredSales.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {s.weight} kg @ ₹{s.pricePerKg}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {s.date} • {s.paymentMethod === "cash" ? "Cash" : "UPI"}
                  </p>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{fmt(s.totalAmount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
