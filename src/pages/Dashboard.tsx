import type { useStore } from "../hooks/useStore";
import type { Tab } from "../types";
import { PlusCircle, Receipt, Package, BarChart3, TrendingUp, AlertTriangle, ArrowRight, SunMedium } from "lucide-react";

type StoreType = ReturnType<typeof useStore>;

interface DashboardProps {
  store: StoreType;
  onNavigate?: (tab: Tab) => void;
  onOpenBriefing?: () => void;
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Dashboard({ store, onNavigate, onOpenBriefing }: DashboardProps) {
  const {
    totalSalesToday, totalExpensesToday, profitToday,
    todaySales, todayExpenses, remainingStock, soldToday,
    remainingQty, todayPricePerKg, todayStock
  } = store;

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const isLowStock = remainingStock < 10 && (todayStock?.openingStock || 0) > 0;

  return (
    <div className="space-y-4 pb-2">
      {/* 1. Header & Live Rate Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>Today's Overview</span>
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">{todayFormatted}</p>
            {onOpenBriefing && (
              <button
                onClick={onOpenBriefing}
                className="text-[10px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 hover:underline active:scale-95 transition"
              >
                <SunMedium size={10} />
                <span>Today's Price</span>
              </button>
            )}
          </div>
        </div>

        {todayPricePerKg > 0 ? (
          <button
            onClick={onOpenBriefing}
            className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-3 py-1.5 rounded-xl text-right shadow-sm active:scale-95 transition hover:border-orange-400"
            title="Click to update today's rate"
          >
            <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
              <span>Today's Rate</span>
              <span className="text-[9px] underline">Change</span>
            </p>
            <p className="text-sm font-black text-orange-600 dark:text-orange-300">
              {fmt(todayPricePerKg)}<span className="text-[11px] font-normal text-orange-600/70 dark:text-orange-400/80">/kg</span>
            </p>
          </button>
        ) : (
          <button
            onClick={onOpenBriefing || (() => onNavigate?.("stock"))}
            className="text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 border border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-xl active:scale-95 transition shadow-sm font-bold"
          >
            + Set Today's Rate
          </button>
        )}
      </div>

      {/* 2. Primary KPI: Net Profit Hero Card */}
      <div className="card bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/95 dark:to-slate-900 border-slate-200 dark:border-slate-700/80 p-4 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp size={14} className="text-orange-500" />
            <span>Today's Net Profit</span>
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
            profitToday >= 0
              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
          }`}>
            {profitToday >= 0 ? "▲ Profit" : "▼ Loss"}
          </span>
        </div>
        <p className={`text-3xl font-black tracking-tight ${
          profitToday >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}>
          {fmt(profitToday)}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Total Sales: </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{fmt(totalSalesToday)}</span>
            <span className="text-[11px] text-slate-400 ml-1">({todaySales.length})</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Expenses: </span>
            <span className="font-bold text-red-600 dark:text-red-400">{fmt(totalExpensesToday)}</span>
            <span className="text-[11px] text-slate-400 ml-1">({todayExpenses.length})</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Hub */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-0.5">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onNavigate?.("sales")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20 active:scale-95 transition min-h-[72px]"
          >
            <PlusCircle size={22} />
            <span className="text-[11px] font-bold mt-1.5 tracking-tight">Add Sale</span>
          </button>

          <button
            onClick={() => onNavigate?.("expenses")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition min-h-[72px] hover:bg-slate-50 dark:hover:bg-slate-700/80"
          >
            <Receipt size={22} className="text-red-500 dark:text-red-400" />
            <span className="text-[11px] font-semibold mt-1.5 tracking-tight">Expense</span>
          </button>

          <button
            onClick={() => onNavigate?.("stock")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition min-h-[72px] hover:bg-slate-50 dark:hover:bg-slate-700/80"
          >
            <Package size={22} className="text-orange-500 dark:text-orange-400" />
            <span className="text-[11px] font-semibold mt-1.5 tracking-tight">Stock</span>
          </button>

          <button
            onClick={() => onNavigate?.("reports")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition min-h-[72px] hover:bg-slate-50 dark:hover:bg-slate-700/80"
          >
            <BarChart3 size={22} className="text-blue-500 dark:text-blue-400" />
            <span className="text-[11px] font-semibold mt-1.5 tracking-tight">Reports</span>
          </button>
        </div>
      </div>

      {/* 4. Chicken Stock Status Glance */}
      <div className={`card ${isLowStock ? "border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-950/20" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Package size={18} />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Available Stock</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sold today: {soldToday.toFixed(2)} kg</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">
              {remainingStock.toFixed(2)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">kg</span>
            </p>
            {remainingQty > 0 && (
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400">~{remainingQty} birds left</p>
            )}
          </div>
        </div>

        {isLowStock && (
          <div className="mt-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Low stock alert! Less than 10 kg remaining.</span>
          </div>
        )}
      </div>

      {/* 5. Recent Sales Activity */}
      <div className="card space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>Recent Sales</span>
          </h3>
          {todaySales.length > 0 && (
            <button
              onClick={() => onNavigate?.("sales")}
              className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-500 font-bold flex items-center gap-1"
            >
              <span>View All ({todaySales.length})</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {todaySales.length === 0 ? (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 space-y-1">
            <p className="text-3xl">🐔</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No sales recorded yet today</p>
            <button
              onClick={() => onNavigate?.("sales")}
              className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-3 py-1.5 rounded-lg active:scale-95"
            >
              + Record First Sale
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {todaySales.slice(0, 4).map((sale, idx) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {sale.weight} kg @ ₹{sale.pricePerKg}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {sale.paymentMethod === "cash" ? "💵 Cash" : "📲 UPI"} • #{todaySales.length - idx}
                  </p>
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {fmt(sale.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
