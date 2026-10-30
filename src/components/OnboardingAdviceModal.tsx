import { useState } from 'react';
import type { useStore } from '../hooks/useStore';
import { FolderPlus, Check, X } from 'lucide-react';

interface Props {
  store: ReturnType<typeof useStore>;
}

const LOGO_OPTIONS = ['🐓', '🐔', '🍗', '🥩', '🏪', '🏬', '🔪', '🍳'];

export function OnboardingAdviceModal({ store }: Props) {
  const {
    shopName,
    shopLogo,
    storageFolderName,
    dismissedSetupAdvice,
    stallDetailsConfigured,
    updateShopProfile,
    dismissSetupAdvice,
    pickStorageFolder,
  } = store;

  const [nameInput, setNameInput] = useState(shopName);
  const [logoInput, setLogoInput] = useState(shopLogo);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [folderMsg, setFolderMsg] = useState('');

  // Never show popup if stall details are already configured or user dismissed it
  const isAlreadySetup =
    dismissedSetupAdvice ||
    stallDetailsConfigured ||
    (typeof window !== 'undefined' && localStorage.getItem('stall_details_configured') === 'true') ||
    (shopName && shopName !== 'Chicken Stall') ||
    Boolean(storageFolderName);

  if (isAlreadySetup) {
    return null;
  }

  const handlePickFolder = async () => {
    setIsPickingFolder(true);
    const res = await pickStorageFolder();
    setIsPickingFolder(false);
    if (res.success && res.folderName) {
      setFolderMsg(`✓ Selected: ${res.folderName}`);
    } else if (res.error) {
      setFolderMsg(`Note: ${res.error}`);
    }
  };

  const handleSaveAndStart = async () => {
    await updateShopProfile(nameInput.trim() || 'Chicken Stall', logoInput, storageFolderName);
    await dismissSetupAdvice();
  };

  const handleSkip = async () => {
    await dismissSetupAdvice();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl p-1 bg-orange-100 dark:bg-slate-700/50 rounded-xl border border-orange-200 dark:border-slate-600/50">
              {logoInput}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">Welcome to Your Shop Manager</h2>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">Quick Setup Advice (Optional)</span>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            title="Skip"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Customize your stall branding and choose a device folder for storing data backups. <strong>This is completely optional and not mandatory.</strong>
        </p>

        {/* 1. Shop Name */}
        <div className="space-y-1.5">
          <label className="label mb-1">Stall / Shop Name</label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="e.g. Al-Madina Chicken Stall"
            className="input text-sm"
          />
        </div>

        {/* 2. Shop Logo / Icon */}
        <div className="space-y-1.5">
          <label className="label mb-1">Shop Logo / Icon</label>
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

        {/* 3. Storage Folder Selection */}
        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Backup Storage Space</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Local-First</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Choose a folder on your phone/PC (e.g. <em>Documents/ChickenStall</em>) to store automatic file exports.
          </p>
          <button
            type="button"
            onClick={handlePickFolder}
            disabled={isPickingFolder}
            className="w-full mt-1 btn-secondary text-xs py-2 flex items-center justify-center gap-2"
          >
            <FolderPlus size={15} />
            <span>
              {storageFolderName ? `Selected: ${storageFolderName}` : 'Choose Storage Folder (Optional)'}
            </span>
          </button>
          {folderMsg && (
            <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">{folderMsg}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleSkip}
            className="btn-secondary text-xs py-2.5 text-center"
          >
            Skip for Now
          </button>
          <button
            type="button"
            onClick={handleSaveAndStart}
            className="btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
          >
            <Check size={15} />
            <span>Save & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
