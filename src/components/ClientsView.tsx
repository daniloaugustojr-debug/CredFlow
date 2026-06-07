import React, { useState } from "react";
import { Client, Loan, User } from "../types";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  BadgeAlert,
  X,
  History,
  Activity,
  UserPlus,
  Calendar,
  Eye,
  Paperclip
} from "lucide-react";

interface ClientsViewProps {
  clients: Client[];
  loans: Loan[];
  currentUser: User;
  onSaveClient: (clientData: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
  onTriggerAI: (client: Client, principal: number) => void;
  isCustomReportTrigger: (client: Client) => void;
  onShowStatement?: (client: Client, startDate: string, endDate: string) => void;
  onPreviewAttachment?: (url: string, title: string) => void;
}

export default function ClientsView({
  clients,
  loans,
  currentUser,
  onSaveClient,
  onDeleteClient,
  onTriggerAI,
  isCustomReportTrigger,
  onShowStatement,
  onPreviewAttachment,
}: ClientsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [idPassport, setIdPassport] = useState("");
  const [address, setAddress] = useState("");
  const [financialStatus, setFinancialStatus] = useState<Client["financialStatus"]>("STABLE");
  const [notes, setNotes] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [idExpiryDate, setIdExpiryDate] = useState("");
  const [biAttachment, setBiAttachment] = useState("");
  const [guaranteeAttachment, setGuaranteeAttachment] = useState("");

  // Detailed Modal for History View
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);

  // Statement Filtering State
  const [selectedClientForStatement, setSelectedClientForStatement] = useState<Client | null>(null);
  const [statementStartDate, setStatementStartDate] = useState("");
  const [statementEndDate, setStatementEndDate] = useState("");

  // Interactive statement viewer state
  const [interactiveStatement, setInteractiveStatement] = useState<{
    client: Client;
    startDate: string;
    endDate: string;
    movements: any[];
    loans: Loan[];
  } | null>(null);

  // Open Form for Create
  const handleNewClient = () => {
    setEditingClient(null);
    setFullName("");
    setPhone("+258 ");
    setIdPassport("");
    setAddress("");
    setFinancialStatus("STABLE");
    setNotes("");
    setBirthDate("");
    setIdExpiryDate("");
    setBiAttachment("");
    setGuaranteeAttachment("");
    setIsOpenForm(true);
  };

  // Open Form for Edit
  const handleEditClient = (c: Client) => {
    setEditingClient(c);
    setFullName(c.fullName);
    setPhone(c.phone);
    setIdPassport(c.idPassport);
    setAddress(c.address);
    setFinancialStatus(c.financialStatus);
    setNotes(c.notes || "");
    setBirthDate(c.birthDate || "");
    setIdExpiryDate(c.idExpiryDate || "");
    setBiAttachment(c.biAttachment || "");
    setGuaranteeAttachment(c.guaranteeAttachment || "");
    setIsOpenForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !idPassport || !address) {
      alert("Por favor preencha todos os campos obrigatórios.");
      return;
    }

    onSaveClient({
      ...(editingClient && { id: editingClient.id }),
      fullName,
      phone,
      idPassport,
      address,
      financialStatus,
      notes,
      birthDate,
      idExpiryDate,
      biAttachment,
      guaranteeAttachment,
    });
    setIsOpenForm(false);
  };

  // Filtering
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.idPassport.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.financialStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Client["financialStatus"]) => {
    switch (status) {
      case "EXCELLENT":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "STABLE":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "RISKY":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "DELINQUENT":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Intro section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-slate-900 dark:text-white">
            Clientes Cadastrados
          </h2>
          <p className="text-sm text-slate-500">
            Ficheiro completo de mutuários, estatutos financeiros e históricos operacionais.
          </p>
        </div>

        {currentUser.permissions.insertData && (
          <button
            onClick={handleNewClient}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl cursor-pointer transition shadow-md shadow-indigo-600/15"
          >
            <UserPlus size={16} />
            Cadastrar Cliente
          </button>
        )}
      </div>

      {/* Filter and Smart Search bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex-1 relative flex items-center">
          <Search size={15} className="absolute left-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por Nome, Telefone ou BI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white pl-10 pr-4 py-3 rounded-lg border border-slate-200/50 dark:border-slate-800 outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Classificação:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-white px-3 py-3 rounded-lg border border-slate-200/50 dark:border-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">Todos os Perfis</option>
            <option value="EXCELLENT">Excelente</option>
            <option value="STABLE">Estável</option>
            <option value="RISKY">Alto Risco</option>
            <option value="DELINQUENT">Inadimplente</option>
          </select>
        </div>
      </div>

      {/* Main clients list table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-slate-500">
                <th className="p-4 pl-6">Cliente / Mutuário</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">BI / ID</th>
                <th className="p-4">Endereço Residencial</th>
                <th className="p-4">Estatuto de Risco</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredClients.length > 0 ? (
                filteredClients.map((c) => {
                  const clientLoans = loans.filter((l) => l.clientId === c.id);
                  const activeLoans = clientLoans.filter((l) => l.status === "ACTIVE" || l.status === "OVERDUE");

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                      {/* Name Card */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-350">
                            {c.fullName[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-sm block">
                              {c.fullName}
                            </span>
                            <span className="text-[10px] text-indigo-500 font-mono">ID: {c.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Phone size={11} className="text-slate-400" />
                          {c.phone}
                        </div>
                      </td>

                      {/* BI */}
                      <td className="p-4 font-mono font-semibold text-slate-700 dark:text-slate-350">
                        <div>{c.idPassport}</div>
                        {(c.birthDate || c.idExpiryDate) && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-sans mt-0.5 space-y-0.5">
                            {c.birthDate && (
                              <div>Nasc: {new Date(c.birthDate).toLocaleDateString("pt-MZ")}</div>
                            )}
                            {c.idExpiryDate && (
                              <div className={new Date(c.idExpiryDate) < new Date() ? "text-rose-500" : ""}>
                                Val: {new Date(c.idExpiryDate).toLocaleDateString("pt-MZ")}
                              </div>
                            )}
                          </div>
                        )}
                        {(c.biAttachment || c.guaranteeAttachment) && (
                          <div className="flex items-center gap-1 mt-1.5 font-sans no-print">
                            {c.biAttachment && (
                              <button
                                type="button"
                                onClick={() => onPreviewAttachment?.(c.biAttachment!, `BI / Passaporte - ${c.fullName}`)}
                                className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-indigo-50 dark:bg-slate-850 hover:bg-indigo-100 dark:hover:bg-slate-755 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-slate-800 cursor-pointer transition select-none"
                                title="Visualizar BI"
                              >
                                📄 BI
                              </button>
                            )}
                            {c.guaranteeAttachment && (
                              <button
                                type="button"
                                onClick={() => onPreviewAttachment?.(c.guaranteeAttachment!, `Garantia / Colateral - ${c.fullName}`)}
                                className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-amber-50 dark:bg-slate-850 hover:bg-amber-100 dark:hover:bg-slate-755 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-100 dark:border-slate-800 cursor-pointer transition select-none"
                                title="Visualizar Garantia"
                              >
                                📸 Garantia
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Address */}
                      <td className="p-4 text-slate-500 max-w-[200px] truncate" title={c.address}>
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" />
                          {c.address}
                        </div>
                      </td>

                      {/* Financial Badging */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                            c.financialStatus
                          )}`}
                        >
                          {c.financialStatus === "EXCELLENT"
                            ? "Excelente"
                            : c.financialStatus === "STABLE"
                              ? "Estável"
                              : c.financialStatus === "RISKY"
                                ? "Em Risco"
                                : "Devedor"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedClientHistory(c)}
                            className="p-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 dark:text-indigo-400 rounded transition cursor-pointer flex items-center gap-1"
                            title="Histórico Completo"
                          >
                            <History size={13} />
                            Historial
                          </button>

                          <button
                            onClick={() => {
                              setSelectedClientForStatement(c);
                              setStatementStartDate("");
                              setStatementEndDate("");
                            }}
                            className="p-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded transition cursor-pointer flex items-center gap-1"
                            title="Gerar Extrato com Datas Personalizadas"
                          >
                            <FileText size={13} />
                            Extrato
                          </button>

                          {currentUser.permissions.editData && (
                            <button
                              onClick={() => handleEditClient(c)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500 dark:text-amber-400 rounded transition cursor-pointer"
                              title="Editar Informações"
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {currentUser.permissions.deleteData && (
                            <button
                              onClick={() => onDeleteClient(c.id)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 dark:text-rose-450 rounded transition cursor-pointer"
                              title="Eliminar Cliente"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    Nenhum cliente correspondente encontrado nesta pesquisa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT CLIENT */}
      {isOpenForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
                {editingClient ? "Editar dados do Cliente" : "Cadastrar Novo Cliente"}
              </h3>
              <button
                onClick={() => setIsOpenForm(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Full name */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Danilo Augusto Júnior"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Contact */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Telefone Móvel *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: +258 841234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs font-mono px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* ID Passport */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Bilhete de Identidade (BI) / Passaporte *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Número de Identificação"
                  value={idPassport}
                  onChange={(e) => setIdPassport(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs font-mono px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Endereço Residencial Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bairro Central, Av. Karl Marx 12, Maputo"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Financial Profile */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Classificação / Estatuto do Cliente
                </label>
                <select
                  value={financialStatus}
                  onChange={(e) => setFinancialStatus(e.target.value as Client["financialStatus"])}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="EXCELLENT">Excelente (Crédito imediato)</option>
                  <option value="STABLE">Estável (Análise de rotina)</option>
                  <option value="RISKY">Alto Risco (Precisa garantias)</option>
                  <option value="DELINQUENT">Devedor (Atrasado ou Incumprimento)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Notas de Perfil / Negócio do Cliente
                </label>
                <textarea
                  placeholder="Descreva a atividade comercial ou garantias secundárias..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-850 text-slate-900 dark:text-white outline-none h-20 resize-none focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Datas Personalizadas (Custom Dates Section) */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  📅 Datas Personalizadas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Validade do BI / Passaporte
                    </label>
                    <input
                      type="date"
                      value={idExpiryDate}
                      onChange={(e) => setIdExpiryDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Anexos de Documentação (Attachments Section) */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  📎 Documentação e Anexos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BI Copy */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
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
                          r.onload = () => setBiAttachment(r.result as string);
                          r.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/40 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {biAttachment && (
                      <div className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1.5 font-semibold">
                        <span>✓ Carregado</span>
                        <button
                          type="button"
                          onClick={() => onPreviewAttachment?.(biAttachment, `BI Rascunho / Temp - ${fullName || "Novo Cliente"}`)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[8.5px] cursor-pointer font-bold select-none"
                        >
                          Visualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => setBiAttachment("")}
                          className="text-slate-400 hover:text-rose-500 font-normal ml-auto text-[9px] cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Guarantee Document */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
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
                          r.onload = () => setGuaranteeAttachment(r.result as string);
                          r.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/40 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {guaranteeAttachment && (
                      <div className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1.5 font-semibold">
                        <span>✓ Carregado</span>
                        <button
                          type="button"
                          onClick={() => onPreviewAttachment?.(guaranteeAttachment, `Garantia Rascunho / Temp - ${fullName || "Novo Cliente"}`)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[8.5px] cursor-pointer font-bold select-none"
                        >
                          Visualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => setGuaranteeAttachment("")}
                          className="text-slate-400 hover:text-rose-500 font-normal ml-auto text-[9px] cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpenForm(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-white font-medium text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Confirmar Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED MODAL: CLIENT OPERATIONS HISTORY & AUDIT */}
      {selectedClientHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-lg">
                  {selectedClientHistory.fullName[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Historial Operativo: {selectedClientHistory.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID Bilhete: <span className="font-mono">{selectedClientHistory.idPassport}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Primary Profile Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                <div>
                  <span className="text-slate-400 block mb-0.5">Contacto de Telefone:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedClientHistory.phone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Endereço Residencial:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedClientHistory.address}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Perfil de Risco Financeiro:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                    {selectedClientHistory.financialStatus}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Notas do Sistema:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-400 italic">
                    {selectedClientHistory.notes || "Sem notas adicionais."}
                  </span>
                </div>
              </div>

              {/* Documentação e ID Digital */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                <h4 className="font-display font-medium text-xs uppercase text-slate-500 block">
                  🛡️ Documentação, Datas e Provas Digitais do Mutuário
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Data de Nascimento:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedClientHistory.birthDate ? new Date(selectedClientHistory.birthDate).toLocaleDateString("pt-MZ") : "Não parametrizado / Sem informação"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Validade do BI / Passaporte:</span>
                    <span className={`font-semibold ${selectedClientHistory.idExpiryDate && new Date(selectedClientHistory.idExpiryDate) < new Date() ? "text-rose-500 font-bold" : "text-slate-800 dark:text-slate-200"}`}>
                      {selectedClientHistory.idExpiryDate ? new Date(selectedClientHistory.idExpiryDate).toLocaleDateString("pt-MZ") : "Não parametrizado / Sem informação"}
                      {selectedClientHistory.idExpiryDate && new Date(selectedClientHistory.idExpiryDate) < new Date() && " (VENCIDO / EXPIRADO)"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-3 border-t border-slate-200/55 dark:border-slate-800">
                  {/* BI Link */}
                  {selectedClientHistory.biAttachment ? (
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Paperclip size={12} className="text-indigo-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">Cópia de BI</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPreviewAttachment?.(selectedClientHistory.biAttachment!, `BI - ${selectedClientHistory.fullName}`)}
                        className="p-1 px-2 text-indigo-650 hover:text-indigo-805 bg-indigo-50 dark:bg-indigo-950/40 rounded text-[9px] font-bold shrink-0 cursor-pointer flex items-center gap-0.5 transition hover:brightness-95 select-none"
                      >
                        <Eye size={10} /> Consultar
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 bg-white/40 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-850 text-center text-[10px] text-slate-400 italic">
                      BI não anexado
                    </div>
                  )}

                  {/* Guarantee Link */}
                  {selectedClientHistory.guaranteeAttachment ? (
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Paperclip size={12} className="text-amber-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">Foto Garantia</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPreviewAttachment?.(selectedClientHistory.guaranteeAttachment!, `Garantia - ${selectedClientHistory.fullName}`)}
                        className="p-1 px-2 text-amber-650 hover:text-amber-805 bg-amber-50 dark:bg-slate-950/40 rounded text-[9px] font-bold shrink-0 cursor-pointer flex items-center gap-0.5 transition hover:brightness-95 select-none"
                      >
                        <Eye size={10} /> Consultar
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 bg-white/40 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-850 text-center text-[10px] text-slate-400 italic">
                      Garantia não anexada
                    </div>
                  )}
                </div>
              </div>

              {/* AI Risk & Credit Check Trigger */}
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-xl">
                <h4 className="font-display font-bold text-xs uppercase text-indigo-300 block mb-1">
                  ⚙️ Auditor Financeiro de Crédito Inteligente
                </h4>
                <p className="text-[11px] text-slate-200 mb-3">
                  Gerar parecer automatizado da IA para empréstimos futuros, integrando NUIT e histórico do mutuário.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onTriggerAI(selectedClientHistory, 100000); // Trigger standard 100K meticais review
                      setSelectedClientHistory(null);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] py-1.5 px-3 rounded-lg transition"
                  >
                    Auditar 100.000 MZN
                  </button>
                  <button
                    onClick={() => {
                      onTriggerAI(selectedClientHistory, 250000); // 250K MZN
                      setSelectedClientHistory(null);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] py-1.5 px-3 rounded-lg transition"
                  >
                    Auditar 250.000 MZN
                  </button>
                </div>
              </div>

              {/* Loans details folder */}
              <div>
                <h4 className="font-display font-semibold text-xs uppercase text-slate-400 mb-2">
                  Empréstimos Associados
                </h4>
                <div className="space-y-3">
                  {loans.filter((l) => l.clientId === selectedClientHistory.id).length > 0 ? (
                    loans
                      .filter((l) => l.clientId === selectedClientHistory.id)
                      .map((l) => (
                        <div
                          key={l.id}
                          className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl"
                        >
                          <div className="flex justify-between items-center mb-2 text-xs">
                            <div>
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                                {l.id}
                              </span>
                              <span className="text-slate-400 ml-2">Prazo: {l.termMonths} Meses</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                l.status === "ACTIVE"
                                  ? "bg-blue-100 text-blue-800"
                                  : l.status === "PAID"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {l.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs mt-3 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Capital Desembolsado:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {l.principalAmount.toLocaleString("pt-MZ")} MZN
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Prestação Est:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {l.installmentAmount.toLocaleString("pt-MZ")} MZN
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Saldo Restante:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {l.outstandingBalance.toLocaleString("pt-MZ")} MZN
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center p-6 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200">
                      Nenhum empréstimo ativo ou liquidado correspondente.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM STATEMENT DATE CRITERIA SELECTOR */}
      {selectedClientForStatement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="text-emerald-500" size={18} />
                Emitir Extrato de Conta
              </h3>
              <button
                onClick={() => setSelectedClientForStatement(null)}
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Defina o período para o extrato de conta corrente de <strong>{selectedClientForStatement.fullName}</strong>. Deixe em branco para tirar o histórico de conta completo.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Data de Início (Opcional)
                </label>
                <input
                  type="date"
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Data de Fim (Opcional)
                </label>
                <input
                  type="date"
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSelectedClientForStatement(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedClientForStatement) return;
                  const clientLoans = loans.filter(l => l.clientId === selectedClientForStatement.id);
                  const movements: Array<{
                    date: string;
                    description: string;
                    reference: string;
                    debito: number;
                    credito: number;
                    balance: number;
                  }> = [];

                  clientLoans.forEach(l => {
                    movements.push({
                      date: l.startDate,
                      description: `Microcrédito Concedido (${l.interestRate}% Juros, ${l.termMonths} Meses)`,
                      reference: l.id,
                      debito: l.totalDue,
                      credito: 0,
                      balance: 0
                    });

                    l.payments.forEach(p => {
                      movements.push({
                        date: p.paymentDate,
                        description: `Amortização de Prestação - Recibo ${p.receiptNumber} (${p.paymentMethod})`,
                        reference: p.receiptNumber,
                        debito: 0,
                        credito: p.amount,
                        balance: 0
                      });
                    });
                  });

                  // Sort chronologically
                  movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                  // Accumulate running balance
                  let currentBalance = 0;
                  const movementsWithBalances = movements.map(m => {
                    if (m.debito > 0) {
                      currentBalance += m.debito;
                    } else {
                      currentBalance -= m.credito;
                    }
                    return { ...m, balance: currentBalance };
                  });

                  // Define boundaries
                  const startLimit = statementStartDate ? new Date(statementStartDate).getTime() : -Infinity;
                  const endLimit = statementEndDate ? new Date(statementEndDate + "T23:59:59").getTime() : Infinity;

                  const filteredMovements = movementsWithBalances.filter(m => {
                    const t = new Date(m.date).getTime();
                    return t >= startLimit && t <= endLimit;
                  });

                  setInteractiveStatement({
                    client: selectedClientForStatement,
                    startDate: statementStartDate,
                    endDate: statementEndDate,
                    movements: filteredMovements,
                    loans: clientLoans
                  });

                  setSelectedClientForStatement(null);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/10 text-center"
              >
                Abrir Extrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INTERACTIVE STATEMENT VIEW ("ENTRAR NO EXTRATO") */}
      {interactiveStatement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-205 dark:border-slate-800 overflow-hidden animate-fade-in no-print">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-md flex items-center gap-2">
                  <FileText className="text-indigo-650" size={18} />
                  Extrato e Histórico de Conta Corrente
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Cliente: <strong className="text-slate-800 dark:text-slate-205">{interactiveStatement.client.fullName}</strong> ({interactiveStatement.client.idPassport})
                </span>
              </div>
              <button
                onClick={() => setInteractiveStatement(null)}
                className="p-1.5 focus:bg-slate-100 dark:focus:bg-slate-805 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Financial Summaries cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">Total Debitado</span>
                  <strong className="text-sm font-mono text-rose-500 block mt-1">
                    {interactiveStatement.movements.reduce((sum, m) => sum + m.debito, 0).toLocaleString("pt-MZ")} MZN
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">Total Creditado</span>
                  <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-450 block mt-1">
                    {interactiveStatement.movements.reduce((sum, m) => sum + m.credito, 0).toLocaleString("pt-MZ")} MZN
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">Saldo Devedor</span>
                  <strong className="text-sm font-mono text-indigo-500 block mt-1 font-bold">
                    {(
                      interactiveStatement.movements.reduce((sum, m) => sum + m.debito, 0) -
                      interactiveStatement.movements.reduce((sum, m) => sum + m.credito, 0)
                    ).toLocaleString("pt-MZ")} MZN
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">Lançamentos</span>
                  <strong className="text-sm font-mono text-slate-800 dark:text-slate-300 block mt-1">
                    {interactiveStatement.movements.length} transações
                  </strong>
                </div>
              </div>

              {/* Transactions table */}
              <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/40">
                <table className="w-full text-left text-xs text-slate-800 dark:text-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[9px] font-black">
                      <th className="p-3">Data</th>
                      <th className="p-3">Descrição / Lançamento</th>
                      <th className="p-3 font-mono">Referência</th>
                      <th className="p-3 text-right">Débito (+)</th>
                      <th className="p-3 text-right">Crédito (-)</th>
                      <th className="p-3 text-right text-slate-900 dark:text-white">Saldo Corrente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {interactiveStatement.movements.length > 0 ? (
                      interactiveStatement.movements.map((move: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                          <td className="p-3 text-[11px] font-mono text-slate-500">
                            {new Date(move.date).toLocaleDateString("pt-MZ")}
                          </td>
                          <td className="p-3 font-semibold text-slate-850 dark:text-slate-200 leading-snug">
                            {move.description}
                          </td>
                          <td className="p-3 font-mono text-slate-500 font-bold">
                            {move.reference}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-650 dark:text-rose-400 font-semibold">
                            {move.debito > 0 ? `${move.debito.toLocaleString("pt-MZ")} MZN` : "-"}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-450 font-semibold">
                            {move.credito > 0 ? `${move.credito.toLocaleString("pt-MZ")} MZN` : "-"}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-900 dark:text-white font-bold">
                            {move.balance.toLocaleString("pt-MZ")} MZN
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          Nenhum movimento registrado no período consultado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Footer containing Export and PDF */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const client = interactiveStatement.client;
                  const movements = interactiveStatement.movements;
                  
                  // Construct CSV
                  const headers = ["Data", "Descricao/Lancamento", "Referencia", "Debito (MZN)", "Credito (MZN)", "Saldo (MZN)"];
                  const rows = movements.map(m => [
                    new Date(m.date).toLocaleDateString("pt-MZ"),
                    m.description,
                    m.reference,
                    m.debito || 0,
                    m.credito || 0,
                    m.balance
                  ]);

                  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM
                  csvContent += headers.join(",") + "\n";
                  rows.forEach(row => {
                    csvContent += row.map(val => {
                      const strVal = String(val).replace(/"/g, '""');
                      return `"${strVal}"`;
                    }).join(",") + "\n";
                  });

                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `Extrato_${client.fullName.replace(/\s+/g, "_")}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition select-none"
              >
                📥 Exportar em Excel (.csv)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onShowStatement) {
                    onShowStatement(interactiveStatement.client, interactiveStatement.startDate, interactiveStatement.endDate);
                  }
                  setInteractiveStatement(null);
                }}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition shadow-md select-none"
              >
                📄 Visualizar e Guardar em PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
