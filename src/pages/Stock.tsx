import { useState, useEffect } from "react";
import type { useStore } from "../hooks/useStore";
import { Package, Check, TrendingUp, TrendingDown, Save } from "lucide-react";

type StoreType = ReturnType<typeof useStore>;
interface Props { store: StoreType; }

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Stock({ store }: Props) {
  const {
    upsertStock, today,
    todayStock,
    openingStock, purchased, soldToday, remainingStock,
    openingQty, purchasedQty, soldQtyEst, remainingQty,
    todayPricePerKg, priceHistory, priceTrend,
  } = store;

  const toInputVal = (val?: number) => (val !== undefined && val > 0 ? val.toString() : "");

  const [opening, setOpening] = useState(toInputVal(todayStock?.openingStock));
  const [purchase, setPurchase] = useState(toInputVal(todayStock?.purchased));
  const [price, setPrice] = useState(
    todayStock?.pricePerKg && todayStock.pricePerKg > 0
      ? todayStock.pricePerKg.toString()
      : (todayPricePerKg > 0 ? todayPricePerKg.toString() : "")
  );
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    if (todayStock) {
      setOpening(toInputVal(todayStock.openingStock));
      setPurchase(toInputVal(todayStock.purchased));
      if (todayStock.pricePerKg && todayStock.pricePerKg > 0) {
        setPrice(todayStock.pricePerKg.toString());
      } else if (todayPricePerKg > 0) {
        setPrice(todayPricePerKg.toString());
      }
    }
  }, [todayStock, todayPricePerKg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opVal = parseFloat(opening || "0");
    const purVal = parseFloat(purchase || "0");
    upsertStock({
      date: today,
      openingStock: opVal,
      openingQty: opVal > 0 ? (todayStock?.openingQty || Math.round(opVal / 2)) : 0,
      purchased: purVal,
      purchasedQty: purVal > 0 ? (todayStock?.purchasedQty || Math.round(purVal / 2)) : 0,
      pricePerKg: parseFloat(price || "0"),
    });
    setToastMsg("✓ Stock & daily rate saved successfully!");
    setTimeout(() => setToastMsg(""), 2500);
  };

  const totalKg = openingStock + purchased;
  const isLowStock = remainingStock < 10 && totalKg > 0;
  const stockPercentage = totalKg > 0 ? Math.max(0, Math.min(100, (remainingStock / totalKg) * 100)) : 0;

  return (
    <div className="space-y-4 pb-2">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="flex items-center gap-1.5">
            <Check size={14} />
            <span>{toastMsg}</span>
          </span>
          <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded">Saved</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Chicken Stock</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Inventory balance & daily rate</p>
        </div>
        {todayPricePerKg > 0 && (
          <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-3 py-1.5 rounded-xl text-right shadow-sm">
            <span className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-semibold block">Today's Rate</span>
            <span className="text-base font-bold text-orange-600 dark:text-orange-300">{fmt(todayPricePerKg)}/kg</span>
          </div>
        )}
      </div>

      {/* 1. Hero Available Stock Card with Low Stock Indicator */}
      <div className={`card ${
        isLowStock
          ? "border-amber-400 dark:border-amber-500/60 bg-gradient-to-br from-amber-50 dark:from-amber-950/30 to-white dark:to-slate-900"
          : "bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900"
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Package size={14} className="text-orange-500" />
            <span>Available Stock Balance</span>
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            remainingStock <= 0
              ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
              : isLowStock
              ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-1"
              : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          }`}>
            {remainingStock <= 0 ? "Out of Stock" : isLowStock ? "⚠️ Low Stock" : "● In Stock"}
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div>
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {remainingStock.toFixed(2)}
            </span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">kg</span>
          </div>

          {remainingQty > 0 && (
            <div className="text-right">
              <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                ~{remainingQty}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">birds left</span>
            </div>
          )}
        </div>

        {/* Stock Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700/50">
            <div
              className={`h-full transition-all duration-300 ${
                stockPercentage < 20 ? "bg-red-500" : stockPercentage < 40 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 px-0.5">
            <span>Sold: {soldToday.toFixed(2)} kg (~{soldQtyEst} birds)</span>
            <span>Total: {totalKg.toFixed(2)} kg</span>
          </div>
        </div>
      </div>

      {/* 2. Stock Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="card py-2.5 px-2">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Opening</span>
          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{openingStock.toFixed(1)} kg</p>
          {openingQty > 0 && <span className="text-[10px] text-slate-400">~{openingQty} birds</span>}
        </div>

        <div className="card py-2.5 px-2">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Purchased</span>
          <p className="font-bold text-orange-600 dark:text-orange-400 mt-0.5">+{purchased.toFixed(1)} kg</p>
          {purchasedQty > 0 && <span className="text-[10px] text-slate-400">~{purchasedQty} birds</span>}
        </div>

        <div className="card py-2.5 px-2">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Sold Today</span>
          <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">-{soldToday.toFixed(1)} kg</p>
          {soldQtyEst > 0 && <span className="text-[10px] text-slate-400">~{soldQtyEst} birds</span>}
        </div>
      </div>

      {/* 3. Streamlined Stock & Daily Rate Form */}
      <div className="card space-y-3.5 border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Update Daily Stock & Price
          </h2>
          <span className="text-[11px] text-slate-400">{today}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Daily Selling Price */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 p-3 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="stock-price">
                Today's Selling Rate (₹ / kg) <span className="text-orange-500">*</span>
              </label>
              {priceTrend === "up" && (
                <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <TrendingUp size={11} />
                  <span>Rate Up</span>
                </span>
              )}
              {priceTrend === "down" && (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <TrendingDown size={11} />
                  <span>Rate Down</span>
                </span>
              )}
            </div>
            <input
              id="stock-price"
              type="number"
              step="0.5"
              min="0"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="e.g. 220"
              className="input text-lg font-bold"
              value={price}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This rate will automatically pre-fill when recording sales today.
            </p>
          </div>

          {/* Opening Stock (Morning) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="stock-opening">
                Morning Opening Stock (kg)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Weight in kg</span>
            </div>
            <div className="relative">
              <input
                id="stock-opening"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="Enter opening stock (e.g. 50 kg)"
                className="input text-base font-semibold pr-10"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                kg
              </span>
            </div>
          </div>

          {/* New Stock Received Today */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="label mb-0" htmlFor="stock-purchase">
                New Stock Purchased / Received (kg)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Add to inventory</span>
            </div>
            <div className="relative">
              <input
                id="stock-purchase"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="Enter new stock purchased (e.g. 100 kg)"
                className="input text-base font-semibold pr-10"
                value={purchase}
                onChange={(e) => setPurchase(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                kg
              </span>
            </div>
          </div>

          <button
            id="save-stock-btn"
            type="submit"
            className="btn-primary"
          >
            <Save size={18} />
            <span>Save Stock & Daily Price</span>
          </button>
        </form>
      </div>

      {/* 4. Price History Log (Last 7 Days) */}
      {priceHistory.length > 0 && (
        <div className="card space-y-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} />
            <span>Recent Rate History</span>
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {priceHistory.map((item) => (
              <div
                key={item.date}
                className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5 text-center min-w-[85px] flex-shrink-0 text-xs shadow-sm"
              >
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.date.slice(5)}</p>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-0.5">{fmt(item.price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
