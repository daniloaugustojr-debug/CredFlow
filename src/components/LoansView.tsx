import React, { useState, useEffect } from "react";
import { Loan, Client, User, LoanPayment, SystemSettings } from "../types";
import {
  FileCheck,
  Check,
  BadgeCent,
  Calculator,
  History,
  Coins,
  ArrowRight,
  UserCheck,
  X,
  Plus,
  HelpCircle,
  Clock,
  Printer,
  Ban,
  MoreVertical
} from "lucide-react";

interface LoansViewProps {
  loans: Loan[];
  clients: Client[];
  currentUser: User;
  settings: SystemSettings;
  onCreateLoan: (loanData: Partial<Loan>) => void;
  onRecordPayment: (loanId: string, paymentData: { amount: number; penaltyPaid: number; paymentMethod: string }) => void;
  onUpdateLoanStatus: (loanId: string, status: Loan["status"]) => void;
  onDeleteLoan: (loanId: string) => void;
  onShowReceipt: (loan: Loan, payment: LoanPayment) => void;
  onShowContract: (loan: Loan, client: Client) => void;
  onPreviewAttachment?: (url: string, title: string) => void;
}

export default function LoansView({
  loans,
  clients,
  currentUser,
  settings,
  onCreateLoan,
  onRecordPayment,
  onUpdateLoanStatus,
  onDeleteLoan,
  onShowReceipt,
  onShowContract,
  onPreviewAttachment,
}: LoansViewProps) {
  const [activeTab, setActiveTab] = useState<"LIST" | "CALCULATOR">("LIST");
  const [loanSearch, setLoanSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [openActionMenuLoanId, setOpenActionMenuLoanId] = useState<string | null>(null);

  // Calculator State
  const [selectedClientId, setSelectedClientId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState(100000); // Default 100K meticais
  const [interestRate, setInterestRate] = useState(settings.defaultInterestRate); // Monthly interest in %
  const [termMonths, setTermMonths] = useState(6); // Default 6 Months
  const [penaltyRate, setPenaltyRate] = useState(settings.defaultPenaltyRate); // Default penalty in %
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentFrequency, setPaymentFrequency] = useState(settings.availablePaymentFrequencies?.[0] || "Mensais");

  // New Client Registration on-the-fly fields
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientPassport, setNewClientPassport] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientFinancialStatus, setNewClientFinancialStatus] = useState<"EXCELLENT" | "STABLE" | "RISKY" | "BAD">("STABLE");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [newClientBirthDate, setNewClientBirthDate] = useState("");
  const [newClientIdExpiryDate, setNewClientIdExpiryDate] = useState("");
  const [newClientBiAttachment, setNewClientBiAttachment] = useState("");
  const [newClientGuaranteeAttachment, setNewClientGuaranteeAttachment] = useState("");

  // New specific optional inputs for custom date and documents attachments
  const [customDueDate, setCustomDueDate] = useState("");
  const [isDueDateOverridden, setIsDueDateOverridden] = useState(false);
  const [biAttachment, setBiAttachment] = useState("");
  const [guaranteeAttachment, setGuaranteeAttachment] = useState("");

  // Determine standard precalculated Due Date on param adjustments
  useEffect(() => {
    if (isDueDateOverridden) return;
    let daysToAdd = termMonths * 30; // standard fallback
    if (paymentFrequency === "Diárias") {
      daysToAdd = termMonths;
    } else if (paymentFrequency === "Semanais") {
      daysToAdd = termMonths * 7;
    }
    
    if (startDate) {
      const calcDate = new Date(new Date(startDate).getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setCustomDueDate(calcDate);
    }
  }, [startDate, termMonths, paymentFrequency, isDueDateOverridden]);

  // Payment Modal State
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [penaltyPaid, setPenaltyPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("M-Pesa");

  // Calculations for current simulator states
  const simInterest = Math.round(principalAmount * (interestRate / 100) * termMonths);
  const simTotal = principalAmount + simInterest;
  const simInstallment = Math.round(simTotal / termMonths);

  const handleOpenPayment = (loan: Loan) => {
    setPayingLoan(loan);
    setPaymentAmount(loan.installmentAmount > loan.outstandingBalance ? loan.outstandingBalance : loan.installmentAmount);
    setPenaltyPaid(0);
  };

  const handleApplyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLoan) return;

    if (paymentAmount <= 0) {
      alert("Por favor registe um valor de pagamento válido superior a zero.");
      return;
    }

    onRecordPayment(payingLoan.id, {
      amount: paymentAmount,
      penaltyPaid: penaltyPaid,
      paymentMethod,
    });
    setPayingLoan(null);
  };

  const handleSaveLoan = () => {
    if (isNewClient) {
      if (!newClientName.trim()) {
        alert("Por favor indique o nome completo do novo cliente.");
        return;
      }
      if (!newClientPhone.trim()) {
        alert("Por favor indique o telefone do novo cliente.");
        return;
      }
      if (!newClientPassport.trim()) {
        alert("Por favor indique o número do BI / Passaporte do novo cliente.");
        return;
      }
      if (!newClientAddress.trim()) {
        alert("Por favor indique a residência/endereço do novo cliente.");
        return;
      }
      if (!newClientBirthDate) {
        alert("Por favor indique a data de nascimento do novo cliente.");
        return;
      }
      if (!newClientIdExpiryDate) {
        alert("Por favor indique a data de validade do documento do novo cliente.");
        return;
      }
    } else {
      if (!selectedClientId) {
        alert("Selecione um cliente válido para emitir o empréstimo.");
        return;
      }
    }

    const loanPayload: any = {
      principalAmount,
      interestRate,
      termMonths,
      penaltyRate,
      startDate,
      dueDate: customDueDate,
      paymentFrequency,
      biAttachment: isNewClient ? newClientBiAttachment : biAttachment,
      guaranteeAttachment: isNewClient ? newClientGuaranteeAttachment : guaranteeAttachment,
    };

    if (isNewClient) {
      loanPayload.newClientData = {
        fullName: newClientName,
        phone: newClientPhone,
        idPassport: newClientPassport,
        address: newClientAddress,
        financialStatus: newClientFinancialStatus,
        notes: newClientNotes,
        birthDate: newClientBirthDate,
        idExpiryDate: newClientIdExpiryDate,
        biAttachment: newClientBiAttachment,
        guaranteeAttachment: newClientGuaranteeAttachment,
      };
    } else {
      loanPayload.clientId = selectedClientId;
    }

    onCreateLoan(loanPayload);

    // Reset attachments & fields
    setBiAttachment("");
    setGuaranteeAttachment("");
    setIsNewClient(false);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientPassport("");
    setNewClientAddress("");
    setNewClientFinancialStatus("STABLE");
    setNewClientNotes("");
    setNewClientBirthDate("");
    setNewClientIdExpiryDate("");
    setNewClientBiAttachment("");
    setNewClientGuaranteeAttachment("");
    setIsDueDateOverridden(false);
    setActiveTab("LIST");
  };

  // Filter conditions
  const filteredLoans = loans.filter((l) => {
    const matchesClient = l.clientName.toLowerCase().includes(loanSearch.toLowerCase()) || l.id.includes(loanSearch);
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchesClient && matchesStatus;
  });

  const getStatusBadge = (status: Loan["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "bg-blue-500/15 text-blue-500 border-blue-500/30";
      case "PENDING":
        return "bg-amber-500/15 text-amber-500 border-amber-500/30 animate-pulse";
      case "PAID":
        return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
      case "OVERDUE":
        return "bg-rose-500/15 text-rose-500 border-rose-500/30";
      case "CANCELLED":
        return "bg-slate-500/15 text-slate-500 border-slate-500/30";
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-slate-900 dark:text-white">
            Carteira de Empréstimos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crie novos empréstimos, acompanhe vencimentos ou emita contratos fiscais em {settings.currencySymbol}.
          </p>
        </div>

        {/* Local views filter tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("LIST")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition ${
              activeTab === "LIST"
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Lista de Créditos
          </button>
          {currentUser.permissions.insertData && (
            <button
              onClick={() => setActiveTab("CALCULATOR")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === "CALCULATOR"
                  ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Calculator size={13} />
              Calculadora e Emissão
            </button>
          )}
        </div>
      </div>

      {activeTab === "LIST" && (
        <>
          {/* SEÇÃO DE EMPRÉSTIMOS PENDENTES POR APROVAÇÃO */}
          {(() => {
            const pendingLoans = loans.filter((l) => l.status === "PENDING");
            const isMaster = currentUser.role === "MASTER_USER" || currentUser.role === "SUPER_ADMIN";
            return (
              <div className="bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/10 dark:border-amber-500/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      Empréstimos Pendentes por Aprovação
                      <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                        {pendingLoans.length}
                      </span>
                    </h3>
                  </div>
                  <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Todos os utilizadores podem visualizar, aprovação exclusiva por Master
                  </span>
                </div>

                {pendingLoans.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 font-mono text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60">
                          <th className="pb-2">Ref Contrato / Mutuário</th>
                          <th className="pb-2">Capital Solicitado</th>
                          <th className="pb-2">Juros / Prazo</th>
                          <th className="pb-2">Total Devido</th>
                          <th className="pb-2 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {pendingLoans.map((pLoan) => (
                          <tr key={pLoan.id} className="hover:bg-amber-500/5 transition">
                            <td className="py-3 font-mono">
                              <span className="font-bold text-slate-800 dark:text-white block">{pLoan.id}</span>
                              <span className="text-[11px] text-slate-500 font-sans font-semibold">{pLoan.clientName}</span>
                            </td>
                            <td className="py-3 font-semibold font-mono text-slate-900 dark:text-white">
                              {pLoan.principalAmount.toLocaleString("pt-MZ")} MZN
                            </td>
                            <td className="py-3 text-slate-500">
                              <span className="block font-medium font-mono text-xs">{pLoan.interestRate}% de Juros</span>
                              <span className="text-[10px] font-sans">{pLoan.termMonths} Meses ({pLoan.paymentFrequency || "Mensais"})</span>
                            </td>
                            <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {pLoan.totalDue.toLocaleString("pt-MZ")} MZN
                            </td>
                            <td className="py-3 text-right">
                              {isMaster ? (
                                <div className="inline-flex gap-1.5">
                                  <button
                                    onClick={() => onUpdateLoanStatus(pLoan.id, "ACTIVE")}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition shadow-sm cursor-pointer"
                                  >
                                    Aprovar Crédito
                                  </button>
                                  <button
                                    onClick={() => onUpdateLoanStatus(pLoan.id, "CANCELLED")}
                                    className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-600 hover:text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                                  >
                                    Recusar
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-500 italic bg-amber-500/10 px-2 py-1 rounded font-bold">
                                  Aguardando Master...
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl text-center text-slate-400 text-xs italic font-medium">
                    Não existem solicitações de crédito pendentes de aprovação no momento.
                  </div>
                )}
              </div>
            );
          })()}

          {/* List Toolbar / Search Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-xl shadow-lg">
            <input
              type="text"
              placeholder="Pesquisar por Código ou Mutuário..."
              value={loanSearch}
              onChange={(e) => setLoanSearch(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-3 rounded-lg border border-slate-200/50 dark:border-slate-800 outline-none placeholder-slate-400 focus:border-indigo-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-white px-3 py-3 rounded-lg border border-slate-200/50 dark:border-slate-800 outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Todos os Empréstimos</option>
                <option value="PENDING">Pendente por Aprovar</option>
                <option value="ACTIVE">Ativo</option>
                <option value="PAID">Liquidado (Pago)</option>
                <option value="OVERDUE">Fora do Prazo (Atrasado)</option>
                <option value="CANCELLED">Cancelado / Suspenso</option>
              </select>
            </div>
          </div>

          {/* Credits Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-slate-500">
                    <th className="p-4 pl-6">Ref Crédito / Mutuário</th>
                    <th className="p-4">Capital Solicitado</th>
                    <th className="p-4">Dívida / Taxas</th>
                    <th className="p-4">Amortização Pendente</th>
                    <th className="p-4">Parcela Mensal</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4 text-center">Estado/Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredLoans.length > 0 ? (
                    filteredLoans.map((loan) => {
                      const associatedClient = clients.find(c => c.id === loan.clientId);
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition">
                          <td className="p-4 pl-6">
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">
                              {loan.id}
                            </span>
                            <span className="text-xs text-slate-505 font-semibold">{loan.clientName}</span>
                            {(loan.biAttachment || loan.guaranteeAttachment || associatedClient?.biAttachment || associatedClient?.guaranteeAttachment) && (
                              <div className="flex items-center gap-1.5 mt-1.5 no-print">
                                {(loan.biAttachment || associatedClient?.biAttachment) && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewAttachment?.(loan.biAttachment || associatedClient?.biAttachment!, `BI - ${loan.clientName}`)}
                                    className="inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100/50 dark:hover:bg-slate-755 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-slate-700/65 cursor-pointer transition select-none"
                                    title="Visualizar Cópia de BI Anexado"
                                  >
                                    📄 BI
                                  </button>
                                )}
                                {(loan.guaranteeAttachment || associatedClient?.guaranteeAttachment) && (
                                  <button
                                    type="button"
                                    onClick={() => onPreviewAttachment?.(loan.guaranteeAttachment || associatedClient?.guaranteeAttachment!, `Garantia - ${loan.clientName}`)}
                                    className="inline-flex items-center gap-1 text-[9px] font-mono font-black uppercase bg-amber-50 dark:bg-slate-800 hover:bg-amber-105/50 dark:hover:bg-slate-755 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-100 dark:border-slate-700/65 cursor-pointer transition select-none"
                                    title="Visualizar Foto de Garantia / Colateral"
                                  >
                                    📸 Garantia
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                            {loan.principalAmount.toLocaleString("pt-MZ")}
                          </td>
                          <td className="p-4 text-slate-500">
                            <span className="font-mono text-slate-800 dark:text-slate-350 block font-semibold">
                              {loan.totalDue.toLocaleString("pt-MZ")}{" "}
                              <span className="text-[10px] text-slate-400 font-normal">MZN</span>
                            </span>
                            <span className="text-[10px] text-indigo-500 font-semibold font-sans">
                              Taxa: {loan.interestRate}% ({loan.termMonths} parcelas - {loan.paymentFrequency || "Mensais"})
                            </span>
                          </td>
                          <td className="p-4 font-mono text-emerald-600 dark:text-emerald-450 font-bold">
                            {loan.outstandingBalance.toLocaleString("pt-MZ")}
                            {loan.lateFeePenaltyApplied > 0 && (
                              <span className="block text-[9px] text-amber-500 font-semibold font-sans">
                                + {loan.lateFeePenaltyApplied.toLocaleString()} Multa Inclusa
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold block text-slate-900 dark:text-white">
                            {loan.installmentAmount.toLocaleString("pt-MZ")}
                          </td>
                          <td className="p-4 font-mono text-slate-500">
                            {loan.dueDate}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col items-center justify-center gap-1 text-center font-sans">
                              {/* Status badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(
                                  loan.status
                                )}`}
                              >
                                {loan.status}
                              </span>

                              {/* Direct visible action icons side by side on the row line */}
                              <div className="flex items-center gap-1.5 mt-1.5 no-print">
                                {loan.status === "PENDING" && (currentUser.role === "MASTER_USER" || currentUser.role === "SUPER_ADMIN") && (
                                  <button
                                    onClick={() => onUpdateLoanStatus(loan.id, "ACTIVE")}
                                    className="p-1.5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg cursor-pointer transition active:scale-90 border border-emerald-100 dark:border-emerald-900/40"
                                    title="Aprovar Crédito Pendente"
                                  >
                                    <Check size={13} className="stroke-[3]" />
                                  </button>
                                )}

                                {(loan.status === "ACTIVE" || loan.status === "OVERDUE") && (
                                  <button
                                    onClick={() => handleOpenPayment(loan)}
                                    className="p-1.5 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-55/10 dark:hover:bg-indigo-950/30 rounded-lg cursor-pointer transition active:scale-90 border border-indigo-100 dark:border-indigo-900/40"
                                    title="Registar Recebimento de Parcela"
                                  >
                                    <BadgeCent size={13} className="stroke-[2.5]" />
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    if (associatedClient) onShowContract(loan, associatedClient);
                                  }}
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition active:scale-90 border border-slate-200/50 dark:border-slate-700/50"
                                  title="Visualizar e Imprimir Contrato"
                                >
                                  <Printer size={13} />
                                </button>

                                {currentUser.role === "SUPER_ADMIN" && (
                                  <button
                                    onClick={() => {
                                      if (confirm("Tem certeza que deseja excluir este empréstimo permanentemente? Esta ação reverterá o capital desembolsado se o crédito tiver sido aprovado.")) {
                                        onDeleteLoan(loan.id);
                                      }
                                    }}
                                    className="p-1.5 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition active:scale-90 border border-rose-100 dark:border-rose-900/40"
                                    title="Excluir Empréstimo do Sistema"
                                  >
                                    <Ban size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-405">
                        Não existem créditos registados sob os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historic of payments logs nested table */}
          {loans.some((l) => l.payments.length > 0) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-5 shadow-lg mt-6">
              <h4 className="font-display font-semibold text-sm mb-4 text-slate-900 dark:text-white">
                Fluxo Log de Recebimentos e Recibos Emitidos
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-100 dark:border-slate-850">
                      <th className="p-3">Recibo / Tipo</th>
                      <th className="p-3">Mutuário</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Montante Recebido</th>
                      <th className="p-3">Meio de Transação</th>
                      <th className="p-3">Recebido Por</th>
                      <th className="p-3 text-center">Exportar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans
                      .flatMap((l) => l.payments.map((p) => ({ l, p })))
                      .sort((a, b) => new Date(b.p.paymentDate).getTime() - new Date(a.p.paymentDate).getTime())
                      .slice(0, 10)
                      .map(({ l, p }) => (
                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-950/20">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {p.receiptNumber}
                          </td>
                          <td className="p-3 font-semibold">{l.clientName}</td>
                          <td className="p-3 font-mono text-slate-500">
                            {new Date(p.paymentDate).toLocaleDateString("pt-MZ")}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-600">
                            {(p.amount + p.penaltyPaid).toLocaleString("pt-MZ")} MZN
                          </td>
                          <td className="p-3 text-slate-600 font-semibold">{p.paymentMethod}</td>
                          <td className="p-3 text-slate-500">{p.receivedBy}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onShowReceipt(l, p)}
                              className="px-2 py-0.5 bg-slate-100 text-[10px] text-slate-700 hover:bg-slate-200 rounded font-medium cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <Printer size={10} /> Recibo
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* CALCULATOR / LOAN ISSUER STATE */}
      {activeTab === "CALCULATOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Settings / Slide selectors */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calculator className="text-indigo-500" size={17} />
                <h4 className="font-display font-semibold text-slate-900 dark:text-white">
                  Emissão e Amortização de Crédito
                </h4>
              </div>

              {/* Client select or Register Client */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">
                    👥 Beneficiário / Mutuário
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewClient(!isNewClient);
                      if (!isNewClient) {
                        setSelectedClientId("");
                      }
                    }}
                    className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 transition"
                  >
                    {isNewClient ? "← Selecionar Cadastrado" : "+ Registar Novo Mutuário"}
                  </button>
                </div>

                {!isNewClient ? (
                  <div>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 font-medium text-xs text-slate-850 dark:text-slate-200 px-3 py-2.5 rounded-lg border border-slate-250 dark:border-slate-800 outline-none cursor-pointer"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.idPassport} - {c.financialStatus})
                        </option>
                      ))}
                    </select>
                    {selectedClient && (
                      <span className={`inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        selectedClient.financialStatus === "EXCELLENT" || selectedClient.financialStatus === "STABLE"
                          ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                          : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                      }`}>
                        Perfil Financeiro: {selectedClient.financialStatus}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-md block font-semibold leading-relaxed">
                      ✍️ Registando novo cliente em simultâneo com a emissão do microcrédito.
                    </span>

                    {/* New client fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="Ex: Danilo Augusto Jr"
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Telefone</label>
                        <input
                          type="text"
                          value={newClientPhone}
                          onChange={(e) => setNewClientPhone(e.target.value)}
                          placeholder="Ex: +258 84 000 0000"
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">BI / Passaporte / ID *</label>
                        <input
                          type="text"
                          value={newClientPassport}
                          onChange={(e) => setNewClientPassport(e.target.value)}
                          placeholder="Número do documento"
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Residência / Endereço</label>
                        <input
                          type="text"
                          value={newClientAddress}
                          onChange={(e) => setNewClientAddress(e.target.value)}
                          placeholder="Ex: Maputo, Moçambique"
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Data de Nascimento *</label>
                        <input
                          type="date"
                          value={newClientBirthDate}
                          onChange={(e) => setNewClientBirthDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Validade do BI / ID *</label>
                        <input
                          type="date"
                          value={newClientIdExpiryDate}
                          onChange={(e) => setNewClientIdExpiryDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Perfil de Crédito Inicial</label>
                        <select
                          value={newClientFinancialStatus}
                          onChange={(e) => setNewClientFinancialStatus(e.target.value as any)}
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-250 outline-none"
                        >
                          <option value="EXCELLENT">Excelente (Sombra verde)</option>
                          <option value="STABLE">Estável (Sombra cinza)</option>
                          <option value="RISKY">Risco Alto (Sombra laranja)</option>
                          <option value="BAD">Inadimplente / Negativo</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Notas Adicionais</label>
                        <input
                          type="text"
                          value={newClientNotes}
                          onChange={(e) => setNewClientNotes(e.target.value)}
                          placeholder="Observações importantes..."
                          className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Documentation attachments directly under loan selection for new client */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                      {/* BI Attachment */}
                      <div className="p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                          Cópia do BI / Passaporte
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = () => setNewClientBiAttachment(r.result as string);
                              r.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/40 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        {newClientBiAttachment && (
                          <div className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                            <span>✓ Carregado</span>
                            <button
                              type="button"
                              onClick={() => setNewClientBiAttachment("")}
                              className="text-slate-400 hover:text-rose-500 font-normal ml-auto text-[9px] cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Guarantee Attachment */}
                      <div className="p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                          Foto da Garantia / Colateral
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = () => setNewClientGuaranteeAttachment(r.result as string);
                              r.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/40 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        {newClientGuaranteeAttachment && (
                          <div className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                            <span>✓ Carregado</span>
                            <button
                              type="button"
                              onClick={() => setNewClientGuaranteeAttachment("")}
                              className="text-slate-400 hover:text-rose-500 font-normal ml-auto text-[9px] cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Slide controls Capital */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 block">Capital Capital Financiado</span>
                  <strong className="font-mono text-indigo-600 text-sm">
                    {principalAmount.toLocaleString("pt-MZ")} MZN
                  </strong>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="1000000"
                  step="5000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 bg-slate-100 rounded-lg cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>5.000 MZN</span>
                  <span>1.000.000 MZN (1 Milhão)</span>
                </div>
              </div>

              {/* Interest and period grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Interest Rate */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-slate-600">Juros Mensais (%)</span>
                    <strong className="font-mono text-indigo-500 font-bold">{interestRate}%</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                    className="w-full accent-indigo-650 h-1.5"
                  />
                </div>

                {/* Term Months */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-slate-600">Período de Contrato</span>
                    <strong className="font-mono text-indigo-505 font-bold">{termMonths} Meses</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="36"
                    step="1"
                    value={termMonths}
                    onChange={(e) => setTermMonths(parseInt(e.target.value))}
                    className="w-full accent-indigo-650 h-1.5"
                  />
                </div>
              </div>

              {/* Start Date & Frequency grid */}
              {(() => {
                const canEditDates = currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER_USER";
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Start Date */}
                    <div>
                      <label className="text-xs font-semibold text-slate-655 dark:text-slate-300 block mb-1 font-sans">
                        Início do Contrato {!canEditDates && "🔒"}
                      </label>
                      <input
                        type="date"
                        disabled={!canEditDates}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 outline-none disabled:opacity-60 text-slate-800 dark:text-slate-200 font-semibold"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="text-xs font-semibold text-slate-655 dark:text-slate-300 block mb-1 font-sans">
                        Vencimento do Contrato {!canEditDates && "🔒"}
                      </label>
                      <input
                        type="date"
                        disabled={!canEditDates}
                        value={customDueDate}
                        onChange={(e) => {
                          setCustomDueDate(e.target.value);
                          setIsDueDateOverridden(true);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 outline-none disabled:opacity-60 text-slate-800 dark:text-slate-200 font-semibold"
                      />
                      {canEditDates && isDueDateOverridden && (
                        <button
                          type="button"
                          onClick={() => setIsDueDateOverridden(false)}
                          className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1 hover:underline cursor-pointer"
                        >
                          ↺ Restaurar data automática
                        </button>
                      )}
                    </div>

                    {/* Cadência (Frequência) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-650 block mb-1">
                        Esquema de Prestações
                      </label>
                      <select
                        value={paymentFrequency}
                        onChange={(e) => setPaymentFrequency(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none font-semibold"
                      >
                        {(settings.availablePaymentFrequencies || ["Mensais", "Semanais", "Diárias"]).map((freq) => (
                          <option key={freq} value={freq}>
                            Prestações {freq}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 mt-5">
              <button
                onClick={() => setActiveTab("LIST")}
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-xl font-medium text-xs cursor-pointer"
              >
                Voltar à Lista
              </button>
              <button
                onClick={handleSaveLoan}
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl font-semibold text-xs cursor-pointer shadow-md"
              >
                Ativar Contrato Operativo
              </button>
            </div>
          </div>

          {/* Interactive Live Preview Calculations right section */}
          <div className="lg:col-span-2 bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
                <span className="text-[10px] tracking-widest font-mono text-indigo-400 font-semibold uppercase">
                  SIMULAÇÃO SINALIZADA
                </span>
                <span className="text-xs bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-500/10">
                  MZN Taxa Fixa
                </span>
              </div>

              <div className="text-center py-6 border-b border-slate-800">
                <span className="text-xs text-slate-400">Prestação Mensal Planeada</span>
                <h1 className="font-mono text-3xl font-bold text-white mt-1">
                  {simInstallment.toLocaleString("pt-MZ")}{" "}
                  <span className="text-lg font-normal text-slate-400">MZN</span>
                </h1>
                <p className="text-[10px] text-slate-500 mt-1">Estimativa de {termMonths} prestações fixas</p>
              </div>

              <div className="py-5 space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Desembolso Solicitado (Capital):</span>
                  <span className="font-mono font-bold">{principalAmount.toLocaleString("pt-MZ")} MZN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rendimento de Juros (Geral):</span>
                  <span className="font-mono font-bold text-indigo-400">
                    +{simInterest.toLocaleString("pt-MZ")} MZN
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxa Penal por Mora Vencida:</span>
                  <span className="font-mono text-rose-400 font-bold">{penaltyRate}% / Ciclo</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-3 text-sm font-semibold">
                  <span>Valor Total Contratual:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {simTotal.toLocaleString("pt-MZ")} MZN
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-[10.5px] text-slate-400 leading-relaxed">
              <span className="text-amber-500 font-bold">Aviso CredFlow:</span> Os juros de microcrédito são
              amortizados de forma nominal de acordo com os marcos contratuais e regulamentos fiscais vigentes em
              Moçambique.
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT/RECEIVING DESK */}
      {payingLoan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
                Balcão de Caixa: Receber Pagamento
              </h3>
              <button
                onClick={() => setPayingLoan(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyPayment} className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Contrato</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                  {payingLoan.id}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs mt-3 border-t border-slate-200 dark:border-slate-800 pt-2.5">
                  <div>
                    <span className="text-slate-400 block">Devedor</span>
                    <strong className="text-slate-700 dark:text-slate-350">{payingLoan.clientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Saldo Exigido</span>
                    <strong className="text-emerald-600">
                      {payingLoan.outstandingBalance.toLocaleString("pt-MZ")} MZN
                    </strong>
                  </div>
                </div>
              </div>

              {/* Amount to pay */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Valor da Amortização *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs text-slate-400 font-bold font-mono">MZN</span>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-xs font-semibold font-mono pl-12 pr-4 py-3 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <span className="inline-block text-[10px] text-slate-400 mt-1">
                  Prestação Est: {payingLoan.installmentAmount.toLocaleString()} MZN
                </span>
              </div>

              {/* Late fees penalties */}
              {payingLoan.status === "OVERDUE" && (
                <div>
                  <label className="text-xs font-semibold text-rose-500 block mb-1">
                    Multas do Vencimento Vencido (Opcional)
                  </label>
                  <input
                    type="number"
                    value={penaltyPaid}
                    onChange={(e) => setPenaltyPaid(parseFloat(e.target.value) || 0)}
                    className="w-full bg-rose-50 dark:bg-rose-950/20 text-rose-700 font-mono text-xs px-3.5 py-2.5 rounded-lg border border-rose-200 outline-none"
                    placeholder="Adicionar Juros de Mora pagos"
                  />
                </div>
              )}

              {/* Method selector */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Canal de Recebimento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="M-Pesa">Vodacom M-Pesa</option>
                  <option value="e-Mola">Movitel e-Mola</option>
                  <option value="mKesh">mKesh Moçambique</option>
                  <option value="Transferência BIM">Transferência BCI / BIM</option>
                  <option value="Ponto 24">Ponto 24</option>
                  <option value="Dinheiro Físico">Numerário (Dinheiro Vivo)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingLoan(null)}
                  className="bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-705 dark:text-white font-medium text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md"
                >
                  Registrar e Autenticar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
