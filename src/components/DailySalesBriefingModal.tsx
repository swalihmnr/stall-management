import { useState, useEffect } from "react";
import type { useStore } from "../hooks/useStore";
import type { Tab } from "../types";
import { TrendingUp, Package, X, Check, ArrowRight, Plus, Minus } from "lucide-react";

interface Props {
  store: ReturnType<typeof useStore>;
  onNavigate?: (tab: Tab) => void;
  isOpenManual?: boolean;
  onCloseManual?: () => void;
}

export function DailySalesBriefingModal({ store, onNavigate, isOpenManual, onCloseManual }: Props) {
  const {
    today,
    todayPricePerKg,
    priceHistory,
    remainingStock,
    remainingQty,
    upsertStock,
    todayStock
  } = store;

  // Determine initial rate: today's existing rate, or yesterday's last rate, or default 220
  const defaultRate = todayPricePerKg > 0 
    ? todayPricePerKg 
    : (priceHistory[0]?.price ?? 220);

  const [isOpen, setIsOpen] = useState(false);
  const [rateInput, setRateInput] = useState(defaultRate.toString());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Check if morning price popup was already shown today on first opening
    const storageKey = `morning_price_popup_seen_${today}`;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setIsOpen(true);
    }
  }, [today]);

  useEffect(() => {
    if (isOpenManual !== undefined) {
      setIsOpen(isOpenManual);
    }
  }, [isOpenManual]);

  useEffect(() => {
    if (todayPricePerKg > 0) {
      setRateInput(todayPricePerKg.toString());
    } else if (priceHistory.length > 0 && priceHistory[0].price > 0) {
      setRateInput(priceHistory[0].price.toString());
    }
  }, [todayPricePerKg, priceHistory]);

  const handleClose = () => {
    const storageKey = `morning_price_popup_seen_${today}`;
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
    if (onCloseManual) onCloseManual();
  };

  const saveRate = (priceVal: number) => {
    if (priceVal > 0) {
      upsertStock({
        date: today,
        openingStock: todayStock?.openingStock ?? 0,
        openingQty: todayStock?.openingQty ?? 0,
        purchased: todayStock?.purchased ?? 0,
        purchasedQty: todayStock?.purchasedQty ?? 0,
        pricePerKg: priceVal,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleConfirmAndGoToSales = () => {
    const p = parseFloat(rateInput);
    if (p > 0) {
      saveRate(p);
    }
    handleClose();
    // Directly open sales counter and persist for zero redundant clicks
    if (onNavigate) {
      onNavigate("sales");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("chicken_stall_active_tab", "sales");
    }
  };

  const handleKeepRateAndContinue = () => {
    const p = parseFloat(rateInput);
    if (p > 0 && p !== todayPricePerKg) {
      saveRate(p);
    }
    handleClose();
  };

  const adjustRate = (delta: number) => {
    const current = parseFloat(rateInput || "0");
    const next = Math.max(10, current + delta);
    setRateInput(next.toString());
  };

  if (!isOpen) return null;

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const parsedRate = parseFloat(rateInput || "0");

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 dark:text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
          title="Dismiss"
        >
          <X size={18} />
        </button>

        {/* Morning Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl flex-shrink-0 shadow-md shadow-orange-500/20">
            🌅
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Good Morning!
              </h2>
              <span className="text-[10px] bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold px-1.5 py-0.5 rounded-md">
                1st Opening
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {todayFormatted} • Set today's chicken rate
            </p>
          </div>
        </div>

        {/* Price Input & Quick Adjusters */}
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} />
              <span>Today's Selling Rate (₹/kg)</span>
            </span>
            {todayPricePerKg > 0 && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Current: ₹{todayPricePerKg}/kg
              </span>
            )}
          </div>

          {/* Big Touch-Friendly Rate Display & Steppers */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => adjustRate(-5)}
              className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold active:scale-90 transition shadow-sm text-base"
              title="Decrease by ₹5"
            >
              <Minus size={18} />
            </button>

            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 text-orange-500 font-bold text-xl">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="10"
                placeholder="220"
                className="w-full text-center font-black text-2xl py-2 pl-7 pr-3 bg-white dark:bg-slate-800 border-2 border-orange-400 dark:border-orange-500 rounded-xl text-slate-900 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                autoFocus
              />
            </div>

            <button
              type="button"
              onClick={() => adjustRate(5)}
              className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold active:scale-90 transition shadow-sm text-base"
              title="Increase by ₹5"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[180, 200, 220, 240].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRateInput(preset.toString())}
                className={`py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                  parsedRate === preset
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800/80 border border-orange-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>

          {isSaved && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold text-center animate-in fade-in">
              ✓ Rate updated successfully!
            </p>
          )}
        </div>

        {/* Current Stock Glance */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Package size={15} />
            </span>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Available Stock</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">~{remainingQty} birds in stall</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-slate-900 dark:text-slate-100">
              {remainingStock.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">kg</span>
            </span>
          </div>
        </div>

        {/* Action Buttons: Save & Start Sales (zero extra clicks) */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleConfirmAndGoToSales}
            className="btn-primary flex items-center justify-center gap-2 text-sm w-full py-3"
          >
            <span>✓ Confirm Rate & Open Sales Counter</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={handleKeepRateAndContinue}
            className="btn-secondary w-full text-xs py-2.5 text-center flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            <span>Keep ₹{rateInput || todayPricePerKg || '0'}/kg & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
