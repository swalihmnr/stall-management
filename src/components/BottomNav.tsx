import type { Tab } from "../types";
import { LayoutDashboard, ShoppingCart, Receipt, Package, BarChart3, Settings } from "lucide-react";

import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: Tab;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "stock", label: "Stock", icon: Package },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "data", label: "Settings", icon: Settings },
];

interface BottomNavProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/80 shadow-2xl safe-pb transition-colors">
      <div className="max-w-md mx-auto flex items-stretch justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onChange(item.id)}
              className={`tab-item flex-1 relative ${isActive ? "tab-item-active" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
              style={{ minHeight: "56px" }}
            >
              <span className={`p-1 rounded-xl transition-all duration-200 ${isActive ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 scale-110" : ""}`}>
                <Icon size={20} />
              </span>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? "text-orange-600 dark:text-orange-400 font-bold" : "font-medium"}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5 shadow-sm shadow-orange-500/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
