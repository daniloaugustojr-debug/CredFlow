import React, { useState } from "react";
import { Loan, Client, ActivityLog, SystemSettings, User } from "../types";
import {
  TrendingUp,
  Coins,
  ArrowUpRight,
  ShieldAlert,
  Users2,
  BookmarkCheck,
  Zap,
  Clock,
  Wallet,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  Calendar,
  Activity
} from "lucide-react";

interface DashboardViewProps {
  loans: Loan[];
  clients: Client[];
  logs: ActivityLog[];
  settings: SystemSettings;
  onQuickReport: (type: "DAILY_REPORT" | "MONTHLY_REPORT" | "OVERDUE_CLIENTS") => void;
  onGrantLoan: () => void;
  capital?: {
    initialBalance: number;
    currentBalance: number;
    capitalHistory: Array<{
      id: string;
      date: string;
      type: "INITIAL" | "REINFORCEMENT" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT";
      amount: number;
      description: string;
      userFullName: string;
    }>;
  };
  onUpdateCapital?: (amount: number, type: "INITIAL" | "REINFORCEMENT", description: string) => Promise<boolean>;
  onEditCapital?: (id: string, amount: number, type: "INITIAL" | "REINFORCEMENT", description: string) => Promise<boolean>;
  onDeleteCapital?: (id: string) => Promise<boolean>;
  currentUser: User;
}

type Timeframe = "DIARIO" | "SEMANAL" | "MENSAL" | "ANUAL" | "SEMPRE";

export default function DashboardView({
  loans,
  clients,
  logs,
  settings,
  onQuickReport,
  onGrantLoan,
  capital = { initialBalance: 0, currentBalance: 0, capitalHistory: [] },
  onUpdateCapital,
  onEditCapital,
  onDeleteCapital,
  currentUser,
}: DashboardViewProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("SEMPRE");

  // State for treasury forms
  const [fundingAmount, setFundingAmount] = useState<string>("");
  const [fundingDesc, setFundingDesc] = useState<string>("");
  const [fundingType, setFundingType] = useState<"INITIAL" | "REINFORCEMENT">("REINFORCEMENT");
  const [isSubmittingFunding, setIsSubmittingFunding] = useState(false);

  // Edit capital state
  const [editingCapitalItem, setEditingCapitalItem] = useState<{
    id: string;
    amount: number;
    type: "INITIAL" | "REINFORCEMENT";
    description: string;
  } | null>(null);

  // Trend plot hover state
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // Filter helper matching current date context (Anchor: May 25, 2026)
  const filterByTimeframe = <T extends { startDate?: string; date?: string; timestamp?: string; createdAt?: string }>(items: T[]) => {
    const anchorDate = new Date("2026-05-25T19:36:27Z");
    return items.filter(item => {
      const rawDateStr = item.startDate || item.date || item.timestamp || item.createdAt;
      if (!rawDateStr) return true;
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return true;

      if (timeframe === "DIARIO") {
        return d.getDate() === anchorDate.getDate() &&
               d.getMonth() === anchorDate.getMonth() &&
               d.getFullYear() === anchorDate.getFullYear();
      }
      if (timeframe === "SEMANAL") {
        const diffTime = Math.abs(anchorDate.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (timeframe === "MENSAL") {
        return d.getMonth() === anchorDate.getMonth() &&
               d.getFullYear() === anchorDate.getFullYear();
      }
      if (timeframe === "ANUAL") {
        return d.getFullYear() === anchorDate.getFullYear();
      }
      return true; // SEMPRE
    });
  };

  // Filter loans and compute stats
  const filteredLoans = filterByTimeframe(loans);
  const approvedLoans = filteredLoans.filter((l) => l.status !== "PENDING" && l.status !== "CANCELLED");

  const totalAmountLoaned = approvedLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);

  const totalRecovered = approvedLoans.reduce((acc, loan) => {
    const totalPayments = loan.payments.reduce((sum, p) => sum + p.amount, 0);
    return acc + totalPayments;
  }, 0);

  const activeClientsCount = clients.filter(c =>
    filteredLoans.some(l => l.clientId === c.id && l.status === "ACTIVE")
  ).length;

  const overdueLoans = filteredLoans.filter((l) => l.status === "OVERDUE");
  const overdueLoansCount = overdueLoans.length;
  const totalAmountOverdue = overdueLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  const estimatedProfit = approvedLoans.reduce((acc, loan) => acc + loan.totalInterest, 0);

  // 1. Dynamic grouping for Monthly metrics (Since the month with operations only)
  // No mock data - purely from actual operations!
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  const getDynamicMonthlyData = () => {
    const activeMonthsMap: Record<string, { loanVal: number; recVal: number; year: number; monthVal: number }> = {};

    // Only process actual approved loans of this view
    approvedLoans.forEach(loan => {
      if (loan.startDate) {
        const date = new Date(loan.startDate);
        if (!isNaN(date.getTime())) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          if (!activeMonthsMap[key]) {
            activeMonthsMap[key] = { loanVal: 0, recVal: 0, year: date.getFullYear(), monthVal: date.getMonth() };
          }
          activeMonthsMap[key].loanVal += loan.principalAmount;
        }
      }

      loan.payments.forEach(p => {
        if (p.paymentDate) {
          const date = new Date(p.paymentDate);
          if (!isNaN(date.getTime())) {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            if (!activeMonthsMap[key]) {
              activeMonthsMap[key] = { loanVal: 0, recVal: 0, year: date.getFullYear(), monthVal: date.getMonth() };
            }
            activeMonthsMap[key].recVal += p.amount;
          }
        }
      });
    });

    const sortedKeys = Object.keys(activeMonthsMap).sort();

    const result = sortedKeys.map(key => {
      const detail = activeMonthsMap[key];
      return {
        month: `${monthNames[detail.monthVal]} ${String(detail.year).slice(2)}`,
        emprestado: detail.loanVal,
        recuperado: detail.recVal,
      };
    });

    // Fallback if zero operations so chart isn't empty: show current month
    if (result.length === 0) {
      const now = new Date("2026-05-25T19:36:27Z");
      return [{
        month: monthNames[now.getMonth()],
        emprestado: 0,
        recuperado: 0
      }];
    }

    return result;
  };

  const monthlyMetrics = getDynamicMonthlyData();
  const maxVal = Math.max(...monthlyMetrics.map(m => Math.max(m.emprestado, m.recuperado)), 1000);

  // 2. Compute Pie Chart info (Mutuado vs Disponível)
  // "Mutuado" is outstanding balance of all currently active/overdue loans
  const outstandingLentCapital = loans.filter(l => l.status === "ACTIVE" || l.status === "OVERDUE").reduce((sum, l) => sum + l.outstandingBalance, 0);
  const companyAvailableCapital = capital.currentBalance !== undefined ? capital.currentBalance : (capital.initialBalance || 0);

  const totalCapitalCombined = outstandingLentCapital + companyAvailableCapital;
  const percentageMutuado = totalCapitalCombined > 0 ? Math.round((outstandingLentCapital / totalCapitalCombined) * 100) : 0;
  const percentageDisponivel = totalCapitalCombined > 0 ? Math.round((companyAvailableCapital / totalCapitalCombined) * 100) : 0;

  // Pie chart stroke calculations (circumference for radius 32 is 201)
  const r = 32;
  const circ = 2 * Math.PI * r;
  const mutuadoStrokeOffset = circ - (percentageMutuado / 100) * circ;

  // Handle funding submits
  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCapital) return;
    const value = parseFloat(fundingAmount);
    if (isNaN(value) || value <= 0) {
      alert("Por favor insira um montante válido.");
      return;
    }
    setIsSubmittingFunding(true);
    const success = await onUpdateCapital(value, fundingType, fundingDesc);
    setIsSubmittingFunding(false);
    if (success) {
      setFundingAmount("");
      setFundingDesc("");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Intro Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-gradient-to-r from-slate-50/50 via-transparent to-transparent dark:from-slate-900/30 p-4 rounded-3xl border border-slate-100/30 dark:border-slate-800/10">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-slate-900 dark:text-white">
            Painel Geral
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestão de microfinanças para a empresa <span className="font-semibold text-indigo-600 dark:text-indigo-400">{settings.companyName}</span>
          </p>
        </div>

        {/* Timeframe Filter Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          {(["DIARIO", "SEMANAL", "MENSAL", "ANUAL", "SEMPRE"] as Timeframe[]).map((tf) => {
            const labelsMap: Record<Timeframe, string> = {
              DIARIO: "Diário",
              SEMANAL: "Semanal",
              MENSAL: "Mensal",
              ANUAL: "Anual",
              SEMPRE: "Sempre",
            };
            const active = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition select-none ${
                  active
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-md border border-slate-200/20 dark:border-slate-800/60"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {labelsMap[tf]}
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onGrantLoan}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition shadow-sm hover:translate-y-[-1px] active:translate-y-0"
          >
            <Coins size={13} className="text-white" />
            Conceder Novo Empréstimo
          </button>
          <button
            onClick={() => onQuickReport("DAILY_REPORT")}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition shadow-sm border border-slate-200/40 dark:border-slate-700/50"
          >
            <Clock size={13} className="text-indigo-500" />
            Balancete Diário
          </button>
          <button
            onClick={() => onQuickReport("MONTHLY_REPORT")}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition shadow-sm border border-slate-200/40 dark:border-slate-700/50"
          >
            <TrendingUp size={13} className="text-emerald-500" />
            Análise Mensal
          </button>
          {overdueLoansCount > 0 && (
            <button
              onClick={() => onQuickReport("OVERDUE_CLIENTS")}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/35 text-rose-700 dark:text-rose-400 font-medium text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition shadow-sm border border-rose-200/40 dark:border-rose-900/30"
            >
              <ShieldAlert size={13} />
              Inadimplência ({overdueLoansCount})
            </button>
          )}
        </div>
      </div>

      {/* Pending Loans Alert Banner */}
      {(() => {
        const pendingCount = filteredLoans.filter((l) => l.status === "PENDING").length;
        if (pendingCount === 0) return null;
        return (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-xs text-amber-950 dark:text-amber-300">
                  Atenção: Existem {pendingCount} {pendingCount === 1 ? "crédito pendente" : "créditos pendentes"} de aprovação nesta empresa
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Apenas o Master User ou Administrador pode aprovar estes créditos pendentes.
                </p>
              </div>
            </div>
            <span className="text-[10px] select-none font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/10">
              AGUARDA DECISÃO
            </span>
          </div>
        );
      })()}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Loaned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xl hover:shadow-2xl transition duration-240 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Mutuado
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Coins size={16} />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-xl md:text-2xl font-bold text-slate-950 dark:text-white">
              {totalAmountLoaned.toLocaleString("pt-MZ")}
              <span className="text-xs ml-1 text-slate-400 font-normal">{settings.currencySymbol}</span>
            </h3>
            <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-0.5 mt-2">
              <ArrowUpRight size={10} /> {timeframe === "SEMPRE" ? "No período global" : "No filtro ativo"}
            </span>
          </div>
        </div>

        {/* Recovered */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xl hover:shadow-2xl transition duration-240 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Recuperado
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-xl md:text-2xl font-bold text-slate-950 dark:text-white">
              {totalRecovered.toLocaleString("pt-MZ")}
              <span className="text-xs ml-1 text-slate-400 font-normal">{settings.currencySymbol}</span>
            </h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-2">
              <ArrowUpRight size={10} /> Amortização: {Math.round((totalRecovered / (totalAmountLoaned || 1)) * 100)}%
            </span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xl hover:shadow-2xl transition duration-240 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Clientes Ativos
            </span>
            <div className="p-2 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded-xl">
              <Users2 size={16} />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-xl md:text-2xl font-bold text-slate-950 dark:text-white">
              {activeClientsCount}
              <span className="text-xs ml-1 text-slate-400 font-normal">Membros</span>
            </h3>
            <span className="text-[10px] text-slate-400 block mt-2">
              No filtro selecionado
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xl hover:shadow-2xl transition duration-240 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Crédito em Atraso
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-xl md:text-2xl font-bold text-slate-950 dark:text-white">
              {totalAmountOverdue.toLocaleString("pt-MZ")}
              <span className="text-xs ml-1 text-slate-400 font-normal">{settings.currencySymbol}</span>
            </h3>
            <span className="text-[10px] text-rose-500 font-bold block mt-2">
              {overdueLoansCount} contratos vencidos
            </span>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xl hover:shadow-2xl transition duration-240 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Lucro Estimado
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <BookmarkCheck size={16} />
            </div>
          </div>
          <div>
            <h3 className="font-mono text-xl md:text-2xl font-bold text-slate-950 dark:text-white">
              {estimatedProfit.toLocaleString("pt-MZ")}
              <span className="text-xs ml-1 text-slate-400 font-normal">{settings.currencySymbol}</span>
            </h3>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-2">
              Com base nos juros ativos
            </span>
          </div>
        </div>
      </div>

      {/* Main Dynamic Charts layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Vector Chart Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-display font-bold text-md text-slate-900 dark:text-white">
                Fluxo Financeiro Analítico
              </h4>
              <p className="text-xs text-slate-400">Total Concedido vs. Recuperação Amortização por mês (desde o primeiro mês de operações)</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span className="text-slate-500 dark:text-slate-400">Concedido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-500 dark:text-slate-400">Recuperado</span>
              </div>
            </div>
          </div>

          {/* Clean responsive SVG bar comparison chart */}
          <div className="h-48 w-full flex items-end justify-between px-2 pt-6 pb-2 border-b border-slate-150 dark:border-slate-800">
            {monthlyMetrics.map((elem, idx) => {
              const h_loan = Math.round((elem.emprestado / maxVal) * 100);
              const h_rec = Math.round((elem.recuperado / maxVal) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group max-w-[80px]">
                  <div className="w-full flex justify-center items-end gap-1.5 h-36 relative">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-950 text-white text-[10px] font-mono px-2.5 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition duration-150 z-20 pointer-events-none whitespace-nowrap leading-relaxed">
                      Concedido: {elem.emprestado.toLocaleString()} MZN
                      <br />
                      Recebido: {elem.recuperado.toLocaleString()} MZN
                    </div>

                    <div
                      style={{ height: `${Math.max(h_loan, 4)}%` }}
                      className="w-3.5 sm:w-5 bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t shadow-sm shadow-indigo-500/10 hover:brightness-110 transition-all duration-300"
                    ></div>
                    <div
                      style={{ height: `${Math.max(h_rec, 4)}%` }}
                      className="w-3.5 sm:w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t shadow-sm shadow-emerald-500/10 hover:brightness-110 transition-all duration-300"
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 font-display mt-1">
                    {elem.month}
                  </span>
                </div>
              );
            })}
          </div>

          {/* NEW LINE CHART: Seasonality Trend Analysis */}
          <div className="mt-8 select-none">
            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
              Análise de Tendência e Sazonalidade (Linha Mensal)
            </h5>
            <div className="h-28 w-full bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 relative overflow-visible">
              {/* Value on Hover Container */}
              {hoveredTrendIndex !== null && monthlyMetrics[hoveredTrendIndex] && (
                <div 
                  style={{
                    left: `${(hoveredTrendIndex / (monthlyMetrics.length - 1)) * 90 + 5}%`,
                    top: `-15px`
                  }}
                  className="absolute -translate-x-1/2 -translate-y-full bg-slate-950 text-white text-[10px] font-mono p-2.5 rounded-lg shadow-xl z-30 pointer-events-none whitespace-nowrap leading-relaxed animate-fade-in border border-slate-800"
                >
                  <p className="font-bold border-b border-white/10 pb-0.5 mb-1 text-indigo-400 text-center uppercase tracking-wider text-[9px]">
                    {monthlyMetrics[hoveredTrendIndex].month}
                  </p>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1"></span>
                    Concedido: <strong className="text-slate-100">{monthlyMetrics[hoveredTrendIndex].emprestado.toLocaleString("pt-MZ")} MZN</strong>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
                    Recuperado: <strong className="text-slate-100">{monthlyMetrics[hoveredTrendIndex].recuperado.toLocaleString("pt-MZ")} MZN</strong>
                  </div>
                </div>
              )}

              {monthlyMetrics.length > 1 ? (
                (() => {
                  const pointsStr = monthlyMetrics.map((elem, idx) => {
                    const x = (idx / (monthlyMetrics.length - 1)) * 90 + 5; // 5% border padding
                    const y = 85 - (elem.emprestado / maxVal) * 70; // 15% to 85% height
                    return `${x},${y}`;
                  }).join(" ");

                  return (
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path
                        d={`M ${pointsStr}`}
                        fill="none"
                        stroke="rgba(99, 102, 241, 0.85)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {monthlyMetrics.map((elem, idx) => {
                        const x = (idx / (monthlyMetrics.length - 1)) * 90 + 5;
                        const y = 85 - (elem.emprestado / maxVal) * 70;
                        return (
                          <g key={idx} className="group/dot">
                            <circle
                              cx={x}
                              cy={y}
                              r={hoveredTrendIndex === idx ? "3.5" : "2"}
                              className="fill-indigo-600 hover:fill-indigo-400 cursor-pointer transition-all duration-150"
                            />
                            {/* Larger hover target area for excellent touch & hover interaction */}
                            <circle
                              cx={x}
                              cy={y}
                              r="10"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredTrendIndex(idx)}
                              onMouseLeave={() => setHoveredTrendIndex(null)}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()
              ) : (
                <div className="h-full flex items-center justify-center text-slate-450 text-[11px]">
                  Faltam mais meses de operação para analisar sazonalidade.
                </div>
              )}
            </div>

            {/* Months aligned precisely below the chart lines */}
            {monthlyMetrics.length > 1 ? (
              <div className="relative h-5 mt-2 overflow-visible">
                {monthlyMetrics.map((elem, idx) => {
                  const pct = (idx / (monthlyMetrics.length - 1)) * 90 + 5;
                  return (
                    <span
                      key={idx}
                      style={{ left: `${pct}%` }}
                      className={`absolute -translate-x-1/2 text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono tracking-tight transition duration-150 ${
                        hoveredTrendIndex === idx ? "text-indigo-600 dark:text-indigo-400 scale-105 font-extrabold" : ""
                      }`}
                    >
                      {elem.month}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono px-1">
                <span>Fator de Sazonalidade</span>
                <span>Tendência Recorrente Positiva</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Pie Chart (Mutuado vs Disponível) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-auto">
          <div>
            <h4 className="font-display font-bold text-md text-slate-900 dark:text-white mb-1">
              Alocação de Carteira
            </h4>
            <p className="text-xs text-slate-400 mb-6">Acompanhamento de liquidez: Ativos concedidos vs. Caixa disponível</p>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
            {totalCapitalCombined > 0 ? (
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Real interactive SVG Donut Pie chart */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  {/* Outer circle for available balance */}
                  <circle
                    cx="40"
                    cy="40"
                    r={r}
                    fill="transparent"
                    stroke="#10b981" // emerald-500
                    strokeWidth="8.5"
                  />
                  {/* Segment for Loaned outstanding */}
                  <circle
                    cx="40"
                    cy="40"
                    r={r}
                    fill="transparent"
                    stroke="#4f46e5" // indigo-600
                    strokeWidth="9"
                    strokeDasharray={circ}
                    strokeDashoffset={mutuadoStrokeOffset}
                  />
                </svg>

                {/* Inner center labels */}
                <div className="absolute text-center">
                  <span className="text-[10px] text-slate-450 uppercase tracking-widest block font-mono">Total</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {Math.round(totalCapitalCombined / 1000)}k <span className="text-[9px] text-slate-500 font-normal">{settings.currencySymbol}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                Falta capital inicial
              </div>
            )}

            {/* Legends */}
            <div className="w-full grid grid-cols-2 gap-3 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <div className="bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200/20 text-center">
                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 block"></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mutuado</span>
                </div>
                <p className="font-mono font-bold text-xs text-slate-900 dark:text-white leading-tight">
                  {outstandingLentCapital.toLocaleString("pt-MZ")}
                </p>
                <span className="text-[9px] font-mono text-indigo-500 font-bold">
                  {percentageMutuado}% da carteira
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200/20 text-center">
                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Disponível</span>
                </div>
                <p className="font-mono font-bold text-xs text-slate-900 dark:text-white leading-tight">
                  {companyAvailableCapital.toLocaleString("pt-MZ")}
                </p>
                <span className="text-[9px] font-mono text-emerald-500 font-bold">
                  {percentageDisponivel}% em Caixa
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capital Injections & History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Treasury Funding Form Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-indigo-600" />
            <h4 className="font-display font-bold text-md text-slate-900 dark:text-white">
              Gestão de Tesouraria
            </h4>
          </div>

          <form onSubmit={handleFundSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Ação Financeira
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <button
                  type="button"
                  disabled={currentUser?.role !== "MASTER_USER" && currentUser?.role !== "SUPER_ADMIN"}
                  onClick={() => setFundingType("INITIAL")}
                  className={`py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition disabled:opacity-40 ${
                    fundingType === "INITIAL"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  Definir Saldo Inicial
                </button>
                <button
                  type="button"
                  disabled={currentUser?.role !== "MASTER_USER" && currentUser?.role !== "SUPER_ADMIN"}
                  onClick={() => setFundingType("REINFORCEMENT")}
                  className={`py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition disabled:opacity-40 ${
                    fundingType === "REINFORCEMENT"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  Registar Reforço
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Montante de Capital ({settings.currencySymbol})
              </label>
              <input
                type="number"
                required
                disabled={currentUser?.role !== "MASTER_USER" && currentUser?.role !== "SUPER_ADMIN"}
                placeholder="Ex. 500000"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none font-mono disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Descrição Justificativa
              </label>
              <input
                type="text"
                required
                disabled={currentUser?.role !== "MASTER_USER" && currentUser?.role !== "SUPER_ADMIN"}
                placeholder="Ex. Aporte do investidor, capital de arranque..."
                value={fundingDesc}
                onChange={(e) => setFundingDesc(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingFunding || (currentUser?.role !== "MASTER_USER" && currentUser?.role !== "SUPER_ADMIN")}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="text-white" />
              {isSubmittingFunding
                ? "Processando..."
                : fundingType === "INITIAL"
                ? "Confirmar Saldo Inicial"
                : "Confirmar Reforço de Caixa"}
            </button>
          </form>
        </div>

        {/* Ledger logs container */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col h-[320px]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-indigo-600 animate-pulse" />
              <h4 className="font-display font-bold text-md text-slate-900 dark:text-white">
                Histórico Controlado de Caixa
              </h4>
            </div>
            <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded font-bold uppercase select-none">
              Auditoria Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
            {capital.capitalHistory && capital.capitalHistory.length > 0 ? (
              capital.capitalHistory
                .map((tx) => {
                  const labelMap: Record<string, string> = {
                    INITIAL: "Saldo Inicial",
                    REINFORCEMENT: "Reforço",
                    LOAN_DISBURSEMENT: "Desembolso",
                    LOAN_REPAYMENT: "Reembolso",
                  };
                  const colorsMap: Record<string, string> = {
                    INITIAL: "bg-blue-100 text-blue-800 border-blue-200/40 dark:bg-blue-950/20 dark:text-blue-400",
                    REINFORCEMENT: "bg-emerald-100 text-emerald-800 border-emerald-200/40 dark:bg-emerald-950/20 dark:text-emerald-400",
                    LOAN_DISBURSEMENT: "bg-rose-100 text-rose-800 border-rose-200/40 dark:bg-rose-950/20 dark:text-rose-400",
                    LOAN_REPAYMENT: "bg-indigo-100 text-indigo-800 border-indigo-200/40 dark:bg-indigo-950/20 dark:text-indigo-400",
                  };
                  const sign = tx.type === "INITIAL" || tx.type === "REINFORCEMENT" || tx.type === "LOAN_REPAYMENT" ? "+" : "-";
                  const valueColor = sign === "+" ? "text-emerald-600" : "text-rose-600";

                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100/60 dark:border-slate-800 flex items-center justify-between gap-4 hover:translate-x-0.5 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${tx.type === "LOAN_DISBURSEMENT" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"}`}>
                          {tx.type === "LOAN_DISBURSEMENT" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-slate-850 dark:text-slate-200">
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono text-slate-400">
                              {new Date(tx.date).toLocaleDateString("pt-MZ")} às {new Date(tx.date).toLocaleTimeString("pt-MZ")}
                            </span>
                            <span className="text-[9px] text-slate-400">•</span>
                            <span className="text-[9px] text-indigo-500 font-semibold uppercase">
                              Operado por: {tx.userFullName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`font-mono font-bold text-xs ${valueColor}`}>
                            {sign}{tx.amount.toLocaleString("pt-MZ")} MZN
                          </span>
                          <span className={`block mt-1 text-[8px] font-mono px-2 py-0.5 rounded border ${colorsMap[tx.type]}`}>
                            {labelMap[tx.type] || tx.type}
                          </span>
                        </div>

                        {(currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER_USER") && (tx.type === "INITIAL" || tx.type === "REINFORCEMENT") && (
                          <div className="flex flex-col gap-1 pl-2 border-l border-slate-200 dark:border-slate-800 text-right select-none">
                            <button
                              onClick={() => setEditingCapitalItem({ id: tx.id, amount: tx.amount, type: tx.type as any, description: tx.description })}
                              className="text-[9px] uppercase font-bold text-indigo-505 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-mono tracking-wider cursor-pointer"
                              title="Editar Registo de Caixa"
                            >
                              Editar
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Deseja realmente eliminar permanentemente o registo "${tx.description}"? Sendo um saldo ou reforço de capital, isso reajustará o balanço inicial e corrente!`)) {
                                  if (onDeleteCapital) {
                                    await onDeleteCapital(tx.id);
                                  }
                                }
                              }}
                              className="text-[9px] uppercase font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-350 font-mono tracking-wider cursor-pointer"
                              title="Eliminar Registo de Caixa"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
                .reverse() // show latest first
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-450 text-xs text-center border border-dashed border-slate-200 p-6 rounded-2xl">
                <Wallet size={32} className="text-slate-300 mb-2" />
                Nenhum histórico financeiro encontrado.
                <p className="text-[10px] text-slate-400 mt-1">Configure o saldo inicial para começar o rastreamento seguro.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Logs Box */}
      {currentUser.role === "SUPER_ADMIN" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col h-[380px]">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-amber-500 animate-pulse" />
            <h4 className="font-display font-bold text-md text-slate-900 dark:text-white">
              Atividades Recentes
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {logs.length > 0 ? (
              filterByTimeframe(logs).map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex gap-3"
                >
                  <div className="p-1 px-2 h-fit bg-slate-200/50 dark:bg-slate-800 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                    {log.action}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.userName}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {log.details}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 block mt-1">
                      {new Date(log.timestamp).toLocaleTimeString("pt-MZ")} -{" "}
                      {new Date(log.timestamp).toLocaleDateString("pt-MZ")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center">
                Nenhuma atividade recente registada no escopo temporal activo.
              </div>
            )}
          </div>
        </div>
      )}

      {editingCapitalItem && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900 dark:text-white">
                Editar Registo de Caixa
              </span>
              <button
                type="button"
                onClick={() => setEditingCapitalItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!onEditCapital) return;
              const success = await onEditCapital(
                editingCapitalItem.id,
                editingCapitalItem.amount,
                editingCapitalItem.type,
                editingCapitalItem.description
              );
              if (success) {
                setEditingCapitalItem(null);
              }
            }} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1 font-mono text-[9px] uppercase">Tipo de Registo</label>
                <select
                  value={editingCapitalItem.type}
                  onChange={(e) => setEditingCapitalItem({ ...editingCapitalItem, type: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg py-2 px-2.5 outline-none font-bold text-slate-850 dark:text-slate-100"
                >
                  <option value="INITIAL">Saldo Inicial</option>
                  <option value="REINFORCEMENT">Reforço</option>
                </select>
              </div>
              
              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1 font-mono text-[9px] uppercase">Montante (MZN)</label>
                <input
                  type="number"
                  required
                  value={editingCapitalItem.amount}
                  onChange={(e) => setEditingCapitalItem({ ...editingCapitalItem, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg py-2 px-2.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 font-bold block mb-1 font-mono text-[9px] uppercase">Descrição Justificativa</label>
                <input
                  type="text"
                  required
                  value={editingCapitalItem.description || ""}
                  onChange={(e) => setEditingCapitalItem({ ...editingCapitalItem, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg py-2 px-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setEditingCapitalItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Gravar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
