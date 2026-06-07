import React, { useState } from "react";
import { User } from "../types";
import {
  LayoutDashboard,
  Users,
  BadgeCent,
  UserCheck,
  BrainCircuit,
  Settings,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  Building,
  Pin,
  PinOff
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  companyPlan?: 'BASICO' | 'PRO' | 'PREMIUM';
  companyLogo?: string;
  isPinned: boolean;
  setIsPinned: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  isDark,
  setIsDark,
  companyPlan = 'BASICO',
  companyLogo,
  isPinned,
  setIsPinned,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getRoleBadgeColor = () => {
    switch (currentUser.role) {
      case "SUPER_ADMIN":
        return "bg-rose-500/10 text-rose-500 border-rose-500/10";
      case "MASTER_USER":
        return "bg-amber-500/10 text-amber-500 border-amber-500/10";
      case "SECONDARY_USER":
        return "bg-sky-500/10 text-sky-500 border-sky-500/10";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/10";
    }
  };

  const getRoleLabel = () => {
    switch (currentUser.role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "MASTER_USER":
        return "Master";
      case "SECONDARY_USER":
        return "Assis. Secundário";
      default:
        return "Utilizador";
    }
  };

  // Package permissions checks
  const showUsersAndSettings = currentUser.role === "SUPER_ADMIN" || (
    currentUser.role === "MASTER_USER" &&
    (companyPlan === "PRO" || companyPlan === "PREMIUM")
  );

  const showAI = currentUser.role === "SUPER_ADMIN" || companyPlan === "PREMIUM";

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clients", label: "Gestão de Clientes", icon: Users },
    { id: "loans", label: "Empréstimos", icon: BadgeCent },
    ...(showAI ? [{ id: "ai-analyst", label: "Analista Inteligente", icon: BrainCircuit }] : []),
    ...(currentUser.role === "SUPER_ADMIN"
      ? [{ id: "companies", label: "Empresas", icon: Building }]
      : []),
    ...(showUsersAndSettings
      ? [
          { id: "users", label: "Utilizadores", icon: UserCheck },
          { id: "settings", label: "Definições", icon: Settings }
        ]
      : []),
  ];

  // Derive final expansion state
  const isExpanded = isPinned || isHovered || isMobileOpen;

  const handleItemClick = (id: string) => {
    setCurrentTab(id);
    setIsMobileOpen(false); // Close on mobile immediately for better UX
  };

  return (
    <>
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen overflow-hidden text-slate-300 no-print z-40 transition-all duration-300 ease-in-out select-none
          /* Mobile Overlap Drawer state */
          ${isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} lg:translate-x-0
          /* Desktop Responsive dimensions based on state */
          lg:fixed lg:top-0 lg:left-0
          ${isPinned 
            ? "lg:w-72" 
            : isHovered 
              ? "lg:w-72 lg:shadow-2xl lg:shadow-black/70 lg:z-50" 
              : "lg:w-20"
          }
        `}
      >
        {/* Brand Header */}
        <div className="p-4 py-5 border-b border-slate-800 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden">
            {companyLogo ? (
              <img
                referrerPolicy="no-referrer"
                src={companyLogo}
                alt="Logo"
                className="w-9 h-9 object-contain rounded-xl border border-slate-800 bg-white flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-505 text-white flex items-center justify-center font-display font-bold text-lg shadow-lg shadow-indigo-500/25 select-none flex-shrink-0">
                C
              </div>
            )}
            
            {isExpanded && (
              <div className="animate-fade-in whitespace-nowrap overflow-hidden">
                <span className="font-display font-bold text-base tracking-tight text-white block">
                  CredFlow
                </span>
                <span className="text-[9px] tracking-wider font-mono text-indigo-300 font-bold block bg-indigo-500/10 px-1.5 py-0.5 rounded leading-none w-max mt-0.5 uppercase">
                  {companyPlan}
                </span>
              </div>
            )}
          </div>

          {/* Pin/Unpin Toggle Button (Desktop only) */}
          {isExpanded && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              type="button"
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 hover:text-white transition cursor-pointer text-slate-400"
              title={isPinned ? "Recolher Sidebar automaticamente" : "Fixar Sidebar"}
            >
              {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
        </div>

        {/* Brand Header small toggle in collapsed sidebar state */}
        {!isExpanded && (
          <div className="hidden lg:flex items-center justify-center py-3 border-b border-slate-800/40">
            <button
              onClick={() => setIsPinned(true)}
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Fixar Sidebar"
            >
              <Pin size={12} />
            </button>
          </div>
        )}

        {/* Logged in User widget */}
        {isExpanded ? (
          <div className="p-5 border-b border-slate-800 bg-slate-950/45 animate-fade-in overflow-hidden">
            <div className="flex items-center gap-3 mb-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-750 border-2 border-indigo-505 flex items-center justify-center font-semibold text-white text-xs flex-shrink-0">
                {currentUser.fullName ? currentUser.fullName[0] : "A"}
              </div>
              <div className="overflow-hidden whitespace-nowrap">
                <h4 className="font-sans font-bold text-xs text-white truncate">
                  {currentUser.fullName}
                </h4>
                <span className="text-[10px] font-mono text-slate-400 block truncate">{currentUser.phone}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1 overflow-hidden">
              <span
                className={`px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider uppercase border truncate ${getRoleBadgeColor()}`}
              >
                {getRoleLabel()}
              </span>

              {/* Theme switcher */}
              <button
                onClick={() => setIsDark(!isDark)}
                type="button"
                className="p-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 cursor-pointer border border-slate-700/50 flex items-center gap-1.5 transition text-[9px] font-mono text-slate-400"
                title="Alternar Tema"
              >
                {isDark ? (
                  <>
                    <Sun size={10} className="text-amber-400" />
                    <span>Claro</span>
                  </>
                ) : (
                  <>
                    <Moon size={10} className="text-indigo-400" />
                    <span>Escuro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-slate-800 bg-slate-950/45 flex flex-col items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full bg-slate-700 border border-indigo-500 flex items-center justify-center font-semibold text-xs text-white"
              title={`${currentUser.fullName} (${getRoleLabel()})`}
            >
              {currentUser.fullName ? currentUser.fullName[0] : "A"}
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              type="button"
              className="p-1.5 rounded-lg bg-slate-805 hover:bg-slate-750 border border-slate-750/50 flex items-center justify-center transition"
              title="Alternar Tema"
            >
              {isDark ? <Sun size={12} className="text-amber-400" /> : <Moon size={12} className="text-indigo-400" />}
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className={`flex-1 overflow-y-auto space-y-1.5 ${isExpanded ? "p-4 py-5" : "p-2 py-5 flex flex-col items-center"}`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            if (isExpanded) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  type="button"
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium text-xs transition duration-150 cursor-pointer text-left whitespace-nowrap overflow-hidden ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-slate-450 group-hover:text-white"} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            } else {
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  type="button"
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition duration-150 cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                  title={item.label}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-slate-450"} />
                </button>
              );
            }
          })}
        </nav>

        {/* Bottom Footer */}
        {isExpanded ? (
          <div className="p-4 border-t border-slate-800 bg-slate-950/20 animate-fade-in overflow-hidden whitespace-nowrap flex-shrink-0">
            <button
              onClick={onLogout}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-xs text-rose-455 hover:text-white hover:bg-rose-500/10 transition cursor-pointer text-left whitespace-nowrap"
            >
              <LogOut size={16} />
              <span>Terminar Sessão</span>
            </button>

            <div className="mt-3.5 flex items-center gap-2 px-4 justify-between select-none">
              <span className="text-[8px] font-mono text-slate-600">
                Registo MZN Oficial
              </span>
              <div className="flex items-center gap-1" title="Sistema Seguro (SSL Ativo)">
                <ShieldCheck size={11} className="text-teal-500" />
                <span className="text-[8px] text-slate-500 font-semibold uppercase">SSL Ativo</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-800 bg-slate-950/20 flex flex-col items-center gap-4 flex-shrink-0">
            <button
              onClick={onLogout}
              type="button"
              title="Terminar Sessão"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut size={16} />
            </button>
            <div className="text-teal-500 animate-pulse" title="Sistema Seguro (SSL Ativo)">
              <ShieldCheck size={12} />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
