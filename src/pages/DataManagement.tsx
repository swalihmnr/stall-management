import { useRef, useState, useEffect } from "react";
import type { useStore } from "../hooks/useStore";
import type { BackupHistoryItem } from "../types";
import { Settings, Download, Upload, Trash2, FolderPlus, Mail, AlertTriangle, ChevronDown, ChevronRight, Save, Check, Smartphone, Info } from "lucide-react";

type StoreType = ReturnType<typeof useStore>;
interface Props { store: StoreType; }

const LOGO_OPTIONS = ['🐓', '🐔', '🍗', '🥩', '🏪', '🏬', '🔪', '🍳'];

export function DataManagement({ store }: Props) {
  const {
    sales, expenses, stock, settings,
    shopName, shopLogo, storageFolderName,
    exportData, importData, clearAllData,
    updateBackupSettings, updateShopProfile, pickStorageFolder,
    triggerSync, isOnline
  } = store;

  const fileRef = useRef<HTMLInputElement>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState("");
  const [importStatus, setImportStatus] = useState<"" | "success" | "error">("");
  const [importMsg, setImportMsg] = useState("");

  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [pendingCounts, setPendingCounts] = useState<{ sales: number; expenses: number; stock: number } | null>(null);

  const [nameInput, setNameInput] = useState(shopName);
  const [logoInput, setLogoInput] = useState(shopLogo);
  const [profileSaveMsg, setProfileSaveMsg] = useState("");

  const [emailInput, setEmailInput] = useState(settings?.backupEmail || "");
  const [emailEnabled, setEmailEnabled] = useState(settings?.backupEmailEnabled ?? true);
  const [saveSettingsStatus, setSaveSettingsStatus] = useState("");
  const [isBackingUpNow, setIsBackingUpNow] = useState(false);
  const [backupNowResult, setBackupNowResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Detect mobile platform
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;

  useEffect(() => {
    setNameInput(shopName);
    setLogoInput(shopLogo);
  }, [shopName, shopLogo]);

  useEffect(() => {
    if (settings?.backupEmail) {
      setEmailInput(settings.backupEmail);
      setEmailEnabled(settings.backupEmailEnabled);
    }
  }, [settings]);

  const loadBackupHistory = async () => {
    try {
      const res = await fetch("/api/backup/history", {
        headers: { 'x-api-secret': import.meta.env.VITE_API_SECRET || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      // offline or server not running
    }
  };

  useEffect(() => {
    if (isOnline) {
      loadBackupHistory();
    }
  }, [isOnline]);

  const totalEntries = sales.length + expenses.length + stock.length;

  const handleSaveShopProfile = async () => {
    await updateShopProfile(nameInput.trim() || 'Chicken Stall', logoInput, storageFolderName);
    setProfileSaveMsg("Shop profile saved!");
    setTimeout(() => setProfileSaveMsg(""), 3000);
  };

  const handlePickFolder = async () => {
    if (isMobile) {
      // On mobile, folder picker doesn't exist — show export guidance instead
      setProfileSaveMsg(isIOS
        ? 'On iPhone/iPad: use Export Backup below to save JSON to Files app.'
        : 'On Android: use Export Backup below to save JSON to Downloads.');
      setTimeout(() => setProfileSaveMsg(""), 5000);
      return;
    }
    const res = await pickStorageFolder();
    if (res.success) {
      setProfileSaveMsg(`Folder updated: ${res.folderName}`);
      setTimeout(() => setProfileSaveMsg(""), 3000);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json || typeof json !== "object") throw new Error("File is not a valid JSON backup");
        const sCount = Array.isArray(json.sales) ? json.sales.length : 0;
        const eCount = Array.isArray(json.expenses) ? json.expenses.length : 0;
        const stCount = Array.isArray(json.stock) ? json.stock.length : 0;

        setPendingCounts({ sales: sCount, expenses: eCount, stock: stCount });
        setPendingImportFile(file);
      } catch (err: any) {
        setImportStatus("error");
        setImportMsg(err?.message || "Invalid JSON backup file");
        setTimeout(() => setImportStatus(""), 4000);
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!pendingImportFile) return;
    try {
      const result = await importData(pendingImportFile);
      setImportStatus("success");
      setImportMsg(`Restored ${result.salesCount} sales, ${result.expensesCount} expenses, and ${result.stockCount} stock records.`);
      setPendingImportFile(null);
      setPendingCounts(null);
      triggerSync();
    } catch (err: any) {
      setImportStatus("error");
      setImportMsg(err instanceof Error ? err.message : "Import failed");
      setPendingImportFile(null);
    }
    setTimeout(() => setImportStatus(""), 4000);
  };

  const handleSaveEmailSettings = async () => {
    await updateBackupSettings(emailInput.trim(), emailEnabled);
    setSaveSettingsStatus("Settings saved successfully!");
    setTimeout(() => setSaveSettingsStatus(""), 3000);
  };

  const handleBackupNow = async () => {
    setIsBackingUpNow(true);
    setBackupNowResult(null);

    await triggerSync();

    try {
      const res = await fetch("/api/backup/trigger", {
        method: "POST",
        headers: { 'x-api-secret': import.meta.env.VITE_API_SECRET || '' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBackupNowResult({ type: "success", msg: data.message || "Backup completed successfully!" });
        loadBackupHistory();
      } else {
        setBackupNowResult({
          type: "error",
          msg: data.message || "Backup failed on server. Local data remains safe.",
        });
      }
    } catch {
      setBackupNowResult({
        type: "error",
        msg: "Could not connect to backup service. Ensure backend server is running.",
      });
    } finally {
      setIsBackingUpNow(false);
    }
  };

  const handleExecuteClearAll = async () => {
    await clearAllData();
    setShowConfirmClear(false);
    setClearSuccessMsg("✓ All local data wiped successfully!");
    setTimeout(() => setClearSuccessMsg(""), 3000);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Toast Notification */}
      {clearSuccessMsg && (
        <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-in fade-in">
          <Check size={14} />
          <span>{clearSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Settings size={20} className="text-orange-500" />
            <span>Settings & Data</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure shop profile, backups & storage</p>
        </div>
      </div>

      {/* 1. Shop Identity & Device Folder Setup */}
      <div className="card space-y-3.5 border-orange-200 dark:border-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl p-1 bg-orange-100 dark:bg-orange-500/20 rounded-xl border border-orange-300 dark:border-orange-500/30">
              {logoInput}
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Shop Identity & Storage</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Stall name, emblem & backup location</p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <div>
            <label className="label mb-1">Stall / Shop Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Al-Madina Chicken Stall"
              className="input text-sm"
            />
          </div>

          <div>
            <label className="label mb-1">Logo / Emblem Emoji</label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {LOGO_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setLogoInput(emoji)}
                  className={`text-xl p-1.5 rounded-lg border transition ${
                    logoInput === emoji
                      ? 'bg-orange-100 dark:bg-orange-500/20 border-orange-500 scale-110 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700/60 hover:border-slate-400'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                {isMobile ? <Smartphone size={13} /> : null}
                Device Storage
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● Local-First</span>
            </div>

            {isMobile ? (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <Info size={13} />
                  <span className="text-[11px] font-bold">
                    {isIOS ? 'iPhone / iPad Storage' : 'Android Storage'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                  {isIOS
                    ? 'Your data is safely stored in Safari\'s IndexedDB (browser app storage). Folder picking is not available on iOS — use Export Backup below to save a JSON file to your Files app.'
                    : 'Your data is safely stored in Chrome\'s IndexedDB (browser app storage). Use Export Backup below to save a JSON file to your Downloads folder.'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {storageFolderName ? `Selected Folder: ${storageFolderName}` : "No device folder selected yet"}
                </p>
                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <FolderPlus size={15} />
                  <span>{storageFolderName ? "Change Device Folder" : "Select Device Storage Folder"}</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSaveShopProfile}
              className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-xs text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Save size={14} />
              <span>Save Shop Profile</span>
            </button>
            {profileSaveMsg && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ {profileSaveMsg}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Storage Summary */}
      <div className="card space-y-3">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          IndexedDB Local Storage Summary
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{sales.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sales</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-red-600 dark:text-red-400">{expenses.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Expenses</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{stock.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Stock Days</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
          <span>{totalEntries} records saved locally</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Offline Active</span>
        </div>
      </div>

      {/* 3. Automatic Daily Cloud Backup & Email */}
      <div className="card space-y-3.5 border-orange-200 dark:border-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Mail size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Daily Cloud & Email Backup</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Automated daily at 9:00 PM (Asia/Kolkata)</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 font-bold border border-orange-300 dark:border-orange-500/30">
            21:00 Daily
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <label className="label mb-0">Owner Email Address</label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="shopowner@gmail.com"
            className="input text-sm"
          />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
              <span>Enable 9:00 PM daily backup</span>
            </label>

            <button
              onClick={handleSaveEmailSettings}
              className="btn-secondary text-xs py-1.5 px-3 min-h-[34px]"
            >
              Save Email
            </button>
          </div>

          {saveSettingsStatus && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ {saveSettingsStatus}</p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 flex flex-col gap-2">
          <button
            onClick={handleBackupNow}
            disabled={isBackingUpNow}
            className="btn-primary text-sm py-2.5"
          >
            <Upload size={16} />
            <span>{isBackingUpNow ? "Sending Backup..." : "Backup Now (Manual Run)"}</span>
          </button>

          {backupNowResult && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium ${
                backupNowResult.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300"
              }`}
            >
              {backupNowResult.type === "success" ? "✓ " : "✗ "}
              {backupNowResult.msg}
            </div>
          )}

          {/* Backup History Toggle */}
          <div className="pt-1">
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadBackupHistory();
              }}
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-bold"
            >
              {showHistory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{showHistory ? "Hide Backup History" : "View Backup History & Logs"}</span>
            </button>

            {showHistory && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No backup runs recorded yet.</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {new Date(item.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            item.status === "success"
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {item.status} ({item.type})
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Manual JSON Export & Restore */}
      <div className="card space-y-3">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Download size={14} />
          <span>Offline File Backup & Restore</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Export full JSON backup to device storage or restore records safely.
        </p>

        <button
          id="export-btn"
          onClick={exportData}
          className="btn-secondary w-full text-xs py-2.5"
          disabled={totalEntries === 0}
        >
          <Download size={15} />
          <span>Export Local Backup (JSON)</span>
        </button>

        <div>
          <button
            id="import-btn"
            onClick={() => fileRef.current?.click()}
            className="btn-secondary w-full text-xs py-2.5"
          >
            <Upload size={15} />
            <span>Restore from Backup JSON</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            className="hidden"
            id="import-file-input"
          />
        </div>

        {importStatus === "success" && (
          <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓ {importMsg}</p>
        )}
        {importStatus === "error" && (
          <p className="text-red-600 dark:text-red-400 text-xs font-bold">✗ {importMsg}</p>
        )}
      </div>

      {/* Modal / Confirmation for Import */}
      {pendingImportFile && pendingCounts && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-orange-500">
              <AlertTriangle size={22} />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Confirm Backup Restore</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Found records in <strong>{pendingImportFile.name}</strong>:
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Sales:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{pendingCounts.sales}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Expenses:</span>
                <span className="font-bold text-red-600 dark:text-red-400">{pendingCounts.expenses}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Stock Days:</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">{pendingCounts.stock}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setPendingImportFile(null);
                  setPendingCounts(null);
                }}
                className="btn-secondary text-xs py-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="btn-primary text-xs py-2"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Danger Zone — Clean Dedicated Delete / Bin Section in Settings */}
      <div className="card space-y-3.5 border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 size={18} />
            <h2 className="text-xs font-bold uppercase tracking-wider">
              Delete All Data (Trash Bin)
            </h2>
          </div>
          <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50">
            {totalEntries} records
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          One-click bin to permanently wipe all stored sales, expenses, and stock records from your device.
        </p>

        {!showConfirmClear ? (
          <button
            id="clear-data-btn"
            onClick={() => setShowConfirmClear(true)}
            className="btn-danger w-full text-xs py-3 flex items-center justify-center gap-2"
            disabled={totalEntries === 0}
          >
            <Trash2 size={16} />
            <span>Clear All Local Data ({totalEntries} records)</span>
          </button>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-red-300 dark:border-red-500/50 rounded-2xl p-4 space-y-3 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={18} />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Are you sure? This will delete all {totalEntries} local records!
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              All transactions will be deleted. You cannot undo this unless you have an exported JSON backup.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="cancel-clear-btn"
                onClick={() => setShowConfirmClear(false)}
                className="btn-secondary text-xs py-2"
              >
                Cancel
              </button>
              <button
                id="confirm-clear-btn"
                onClick={handleExecuteClearAll}
                className="btn-danger text-xs py-2 font-bold"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
