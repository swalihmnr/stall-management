import { useState } from "react";
import type { useStore } from "../hooks/useStore";
import type { Expense } from "../types";
import { Plus, Trash2, Check, AlertCircle, AlertTriangle } from "lucide-react";

type StoreType = ReturnType<typeof useStore>;
interface Props { store: StoreType; }

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EXPENSE_CATEGORIES = [
  "🍗 Live Chicken Purchase",
  "🧊 Ice Blocks",
  "🚚 Transport / Tempo",
  "🛍️ Plastic Bags & Paper",
  "⚡ Electricity & Gas",
  "👥 Helper / Labor",
  "🧹 Cleaning / Disinfectant",
  "🏷️ Stall Rent",
];

export function Expenses({ store }: Props) {
  const { todayExpenses, totalExpensesToday, addExpense, deleteExpense } = store;
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!description.trim()) {
      setError("Please select or enter an expense description.");
      return;
    }
    if (!a || a <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }
    setError("");

    addExpense({ description: description.trim(), amount: a });
    setDescription("");
    setAmount("");
    setToastMsg(`✓ Expense added: ${fmt(a)}`);
    setTimeout(() => setToastMsg(""), 2500);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);
    setToastMsg(`✓ Expense '${expenseToDelete.description}' deleted`);
    setExpenseToDelete(null);
    setTimeout(() => setToastMsg(""), 2500);
  };

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Expenses</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track daily shop costs</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Today's Total</span>
          <span className="text-base font-black text-red-600 dark:text-red-400">{fmt(totalExpensesToday)}</span>
        </div>
      </div>

      {/* Add Expense Card */}
      <div className="card space-y-3.5 border-slate-200 dark:border-slate-700/80">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Quick Category Chips */}
          <div className="space-y-1.5">
            <label className="label">Quick Expense Category</label>
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDescription(cat)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition active:scale-95 text-left ${
                    description === cat
                      ? "bg-orange-100 dark:bg-orange-500/20 border-orange-400 dark:border-orange-500 text-orange-700 dark:text-orange-300 font-bold"
                      : "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="expense-desc">
              Description / Note <span className="text-orange-500">*</span>
            </label>
            <input
              id="expense-desc"
              type="text"
              placeholder="e.g. 50 kg live bird purchase"
              className="input text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="expense-amount">
              Amount (₹) <span className="text-orange-500">*</span>
            </label>
            <input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="e.g. 500"
              className="input text-lg font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-800/50 flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>{error}</span>
            </p>
          )}

          <button
            id="add-expense-btn"
            type="submit"
            className="btn-primary"
          >
            <Plus size={18} />
            <span>Record Expense</span>
          </button>
        </form>
      </div>

      {/* Delete Confirmation Alert Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 border border-red-300 dark:border-red-500/50 rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <AlertTriangle size={22} />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Delete Expense?</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete expense <strong>"{expenseToDelete.description}"</strong> for <strong>{fmt(expenseToDelete.amount)}</strong>?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="btn-secondary text-xs py-2.5 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExpense}
                className="btn-danger text-xs py-2.5 text-center"
              >
                Yes, Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Expense List */}
      <div className="card space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Today's Expenses ({todayExpenses.length})
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Total: {fmt(totalExpensesToday)}</span>
        </div>

        {todayExpenses.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-xs text-center py-6">No expenses recorded today</p>
        ) : (
          <div className="space-y-2">
            {todayExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{expense.description}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(expense.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(expense.amount)}</span>
                  <button
                    onClick={() => setExpenseToDelete(expense)}
                    className="w-8 h-8 rounded-lg bg-slate-200/80 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-500 hover:text-red-500 flex items-center justify-center active:scale-95 transition"
                    title="Delete Expense"
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
