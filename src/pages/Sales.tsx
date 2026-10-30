import { useState, useEffect } from "react";
import type { useStore } from "../hooks/useStore";
import type { PaymentMethod, Sale } from "../types";
import { Banknote, QrCode, Check, Trash2, FolderPlus, AlertCircle, AlertTriangle } from "lucide-react";

type StoreType = ReturnType<typeof useStore>;
interface Props { store: StoreType; }

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const QUICK_WEIGHTS = [0.5, 1.0, 1.5, 2.0, 2.5];

export function Sales({ store }: Props) {
  const {
    todaySales, totalSalesToday, todayPricePerKg,
    addSale, deleteSale, storageFolderName, pickStorageFolder
  } = store;

  const [weight, setWeight] = useState("");
  const [pricePerKg, setPricePerKg] = useState(todayPricePerKg > 0 ? todayPricePerKg.toString() : "");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const [showNoFolderAlert, setShowNoFolderAlert] = useState(false);
  const [hasAcknowledgedAlert, setHasAcknowledgedAlert] = useState(false);
  const [pendingSale, setPendingSale] = useState<{ weight: number; pricePerKg: number; totalAmount: number; paymentMethod: PaymentMethod } | null>(null);

  // Delete confirmation alert state
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  // Keep user on Sales tab across page refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chicken_stall_active_tab", "sales");
    }
  }, []);

  useEffect(() => {
    if (todayPricePerKg > 0 && !pricePerKg) {
      setPricePerKg(todayPricePerKg.toString());
    }
  }, [todayPricePerKg]);

  const parsedWeight = parseFloat(weight || "0");
  const parsedPrice = parseFloat(pricePerKg || "0");
  const totalAmount = parsedWeight * parsedPrice;

  const handleQuickWeight = (val: number) => {
    const current = parseFloat(weight || "0");
    const next = (current + val).toFixed(2).replace(/\.00$/, "");
    setWeight(next);
  };

  const commitSale = (saleData: { weight: number; pricePerKg: number; totalAmount: number; paymentMethod: PaymentMethod }) => {
    addSale(saleData);
    if (typeof window !== "undefined") {
      localStorage.setItem("chicken_stall_active_tab", "sales");
    }
    setWeight("");
    setShowNoFolderAlert(false);
    setPendingSale(null);
    setToastMsg(`✓ Recorded ${saleData.weight} kg (${fmt(saleData.totalAmount)})`);
    setTimeout(() => setToastMsg(""), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedWeight || parsedWeight <= 0) {
      setError("Please enter a valid chicken weight (e.g. 1.5)");
      return;
    }
    if (!parsedPrice || parsedPrice <= 0) {
      setError("Please enter a valid price per kg");
      return;
    }
    setError("");

    const salePayload = {
      weight: parsedWeight,
      pricePerKg: parsedPrice,
      totalAmount,
      paymentMethod: payment,
    };

    if (!storageFolderName && !hasAcknowledgedAlert) {
      setPendingSale(salePayload);
      setShowNoFolderAlert(true);
      return;
    }

    commitSale(salePayload);
  };

  const handlePickFolderAndSave = async () => {
    await pickStorageFolder();
    if (pendingSale) {
      commitSale(pendingSale);
    }
  };

  const handleSaveAnyway = () => {
    setHasAcknowledgedAlert(true);
    if (pendingSale) {
      commitSale(pendingSale);
    }
  };

  const confirmDeleteSale = () => {
    if (!saleToDelete) return;
    deleteSale(saleToDelete.id);
    setToastMsg(`✓ Sale of ${saleToDelete.weight} kg removed & stock restored`);
    setSaleToDelete(null);
    setTimeout(() => setToastMsg(""), 2500);
  };

  const cashTotal = todaySales.filter(s => s.paymentMethod === "cash").reduce((sum, s) => sum + s.totalAmount, 0);
  const upiTotal = todaySales.filter(s => s.paymentMethod === "upi").reduce((sum, s) => sum + s.totalAmount, 0);
  const totalKgSold = todaySales.reduce((sum, s) => sum + s.weight, 0);

  return (
    <div className="space-y-4 pb-2">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="flex items-center gap-1.5">
            <Check size={14} />
            <span>{toastMsg}</span>
          </span>
          <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded">Done</span>
        </div>
      )}

      {/* Header with Today's Live Sales Total */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Record Sale</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Fast sales entry for customers</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Today's Sales</span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmt(totalSalesToday)}</span>
        </div>
      </div>

      {/* Main Sales Entry Card */}
      <div className="card space-y-3.5 border-orange-200 dark:border-orange-500/30">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Inputs Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label" htmlFor="sale-weight">
                Weight (kg) <span className="text-orange-500">*</span>
              </label>
              <input
                id="sale-weight"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="0.00"
                className="input text-lg font-bold"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="sale-price">
                Rate / kg (₹) <span className="text-orange-500">*</span>
              </label>
              <input
                id="sale-price"
                type="number"
                step="0.5"
                min="1"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="e.g. 220"
                className="input text-lg font-bold"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Weight Chips */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Quick Weight Buttons:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {QUICK_WEIGHTS.map((qw) => (
                <button
                  key={qw}
                  type="button"
                  onClick={() => handleQuickWeight(qw)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 transition flex-shrink-0"
                >
                  +{qw} kg
                </button>
              ))}
              {weight && (
                <button
                  type="button"
                  onClick={() => setWeight("")}
                  className="bg-slate-100 dark:bg-slate-800 text-red-500 text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 flex-shrink-0 active:scale-95"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="label">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="payment-cash"
                type="button"
                onClick={() => setPayment("cash")}
                className={`py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] active:scale-95 ${
                  payment === "cash"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/60"
                }`}
              >
                <Banknote size={17} />
                <span>CASH</span>
                {payment === "cash" && <Check size={14} />}
              </button>

              <button
                id="payment-upi"
                type="button"
                onClick={() => setPayment("upi")}
                className={`py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px] active:scale-95 ${
                  payment === "upi"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/60"
                }`}
              >
                <QrCode size={17} />
                <span>UPI / QR</span>
                {payment === "upi" && <Check size={14} />}
              </button>
            </div>
          </div>

          {/* Dynamic Total Amount Banner */}
          <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 border border-slate-300 dark:border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold block">Total Payable</span>
              <span className="text-xs text-slate-500 font-mono">
                {parsedWeight > 0 ? `${parsedWeight} kg × ₹${parsedPrice || 0}` : "Enter weight above"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {fmt(totalAmount)}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-800/50 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>{error}</span>
            </p>
          )}

          {/* Big Thumb Save Button */}
          <button
            id="add-sale-btn"
            type="submit"
            className="btn-primary text-base py-3.5"
          >
            <Check size={18} />
            <span>Record Sale ({fmt(totalAmount)})</span>
          </button>
        </form>
      </div>

      {/* Storage Alert Modal */}
      {showNoFolderAlert && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-amber-400 dark:border-amber-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertCircle size={22} />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Storage Space Notice</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              No device backup folder has been selected yet.
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Your sale will still be saved safely in IndexedDB.</p>
              <p className="text-slate-500 dark:text-slate-400">Selecting a device folder gives you an additional layer of backup.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePickFolderAndSave}
                className="bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs py-2.5 px-2 rounded-xl text-center active:scale-95 flex items-center justify-center gap-1.5"
              >
                <FolderPlus size={15} />
                <span>Select Folder</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAnyway}
                className="btn-secondary text-xs py-2.5 text-center"
              >
                Save Sale Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 border border-red-300 dark:border-red-500/50 rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <AlertTriangle size={22} />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Delete Sale Record?</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete this sale of <strong>{saleToDelete.weight} kg</strong> for <strong>{fmt(saleToDelete.totalAmount)}</strong>?
            </p>

            <div className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-[11px] text-red-700 dark:text-red-300">
              ℹ️ Deleting this sale will restore <strong>{saleToDelete.weight} kg</strong> back to your available stock.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="btn-secondary text-xs py-2.5 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSale}
                className="btn-danger text-xs py-2.5 text-center"
              >
                Yes, Delete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Sales Metric Cards */}
      {todaySales.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card py-2 px-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Weight</p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">{totalKgSold.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kg</span></p>
          </div>
          <div className="card py-2 px-3 text-center">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Cash</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{fmt(cashTotal)}</p>
          </div>
          <div className="card py-2 px-3 text-center">
            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold">UPI</p>
            <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">{fmt(upiTotal)}</p>
          </div>
        </div>
      )}

      {/* Today's Sales History List */}
      <div className="card space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Today's Log ({todaySales.length})
          </h2>
          <span className="text-[11px] text-slate-400">Tap trash to remove</span>
        </div>

        {todaySales.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-xs text-center py-6">No sales recorded yet today</p>
        ) : (
          <div className="space-y-2">
            {todaySales.map((sale, idx) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    #{todaySales.length - idx}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sale.weight} kg @ ₹{sale.pricePerKg}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      {sale.paymentMethod === "cash" ? <Banknote size={11} className="text-emerald-600" /> : <QrCode size={11} className="text-blue-500" />}
                      <span>{sale.paymentMethod === "cash" ? "Cash" : "UPI"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {fmt(sale.totalAmount)}
                  </span>
                  <button
                    onClick={() => setSaleToDelete(sale)}
                    className="w-8 h-8 rounded-lg bg-slate-200/80 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-500 hover:text-red-500 flex items-center justify-center active:scale-95 transition"
                    title="Delete Sale"
                    style={{ minWidth: "36px", minHeight: "36px" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
