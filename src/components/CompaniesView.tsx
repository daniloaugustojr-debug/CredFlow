import React, { useState } from "react";
import { Company, User } from "../types";
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  User as UserIcon,
  Phone,
  Lock,
  MapPin,
  ClipboardList,
  Mail,
  Search,
  CheckCircle,
  X,
  FileText
} from "lucide-react";

interface CompaniesViewProps {
  companies: Company[];
  onSaveCompany: (companyData: any) => Promise<boolean>;
  onDeleteCompany: (id: string) => Promise<void>;
  onUpdateCompany: (id: string, updatedFields: any) => Promise<void>;
  currentUser: User;
}

export default function CompaniesView({
  companies,
  onSaveCompany,
  onDeleteCompany,
  onUpdateCompany,
  currentUser,
}: CompaniesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Company | null>(null);

  // Form states for creation
  const [companyName, setCompanyName] = useState("");
  const [companyNuit, setCompanyNuit] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companyPlan, setCompanyPlan] = useState<"BASICO" | "PRO" | "PREMIUM">("BASICO");
  
  // Form states for the initial Master User (Manager)
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("+258 ");
  const [managerPassword, setManagerPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered companies list
  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nuit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setCompanyName("");
    setCompanyNuit("");
    setCompanyAddress("");
    setCompanyLogoUrl("");
    setCompanyPlan("BASICO");
    setManagerName("");
    setManagerPhone("+258 ");
    setManagerPassword("");
    setErrorMsg("");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      alert("Por favor carregue apenas imagens no formato PNG.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isEditMode && showEditModal) {
        setShowEditModal({ ...showEditModal, logoUrl: base64 });
      } else {
        setCompanyLogoUrl(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!companyName.trim() || !companyNuit.trim() || !companyAddress.trim()) {
      setErrorMsg("Por favor, preencha todos os dados da empresa.");
      return;
    }
    if (!managerName.trim() || !managerPhone.trim() || !managerPassword.trim()) {
      setErrorMsg("O preenchimento do administrador/gestor da empresa é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: companyName.trim(),
        nuit: companyNuit.trim(),
        address: companyAddress.trim(),
        logoUrl: companyLogoUrl.trim(),
        plan: companyPlan,
        managerName: managerName.trim(),
        managerPhone: managerPhone.trim(),
        managerPassword: managerPassword.trim(),
      };

      const success = await onSaveCompany(payload);
      if (success) {
        resetForm();
        setShowAddModal(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro no processamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    setIsSubmitting(true);
    try {
      await onUpdateCompany(showEditModal.id, {
        name: showEditModal.name,
        nuit: showEditModal.nuit,
        address: showEditModal.address,
        logoUrl: showEditModal.logoUrl,
        plan: showEditModal.plan,
      });
      setShowEditModal(null);
    } catch (err) {
      setErrorMsg("Erro ao atualizar empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Summaries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">
              Total de Empresas Cadastradas
            </span>
            <span className="text-3xl font-display font-medium text-slate-900 dark:text-white block">
              {companies.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
            <Building size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">
              Empresas Secundárias
            </span>
            <span className="text-3xl font-display font-medium text-slate-900 dark:text-white block">
              {Math.max(0, companies.length - 1)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">
              Regulado NUIT Moçambique
            </span>
            <span className="text-3xl font-display font-medium text-slate-900 dark:text-white block">
              100%
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
        </div>
      </div>

      {/* Main Table section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Registo de Empresas Multitenant
            </h3>
            <p className="text-[11px] text-slate-400">
              Crie empresas isoladas com as suas próprias contas de utilizadores, taxas e taxas de mora.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search inputs */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Pesquisar NUIT ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-60 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-2 px-3.5 rounded-xl cursor-pointer transition flex items-center gap-2"
            >
              <Plus size={13} />
              Nova Empresa
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-850 text-slate-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                <th className="py-3 px-6">Empresa & Nuit</th>
                <th className="py-3 px-6">Endereço Secundário</th>
                <th className="py-3 px-6">Taxa Padrão (Mola/Mora)</th>
                <th className="py-3 px-6">Criado em</th>
                <th className="py-3 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((comp) => {
                  const isMainCompany = comp.id === "com-1";
                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/10">
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          {comp.logoUrl ? (
                            <img
                              referrerPolicy="no-referrer"
                              src={comp.logoUrl}
                              alt="Logo"
                              className="w-9 h-9 object-cover rounded-lg border dark:border-slate-800 bg-white"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-500 flex items-center justify-center font-display font-bold text-sm">
                              {comp.name[0]}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-250 block font-display flex items-center gap-2 flex-wrap">
                              {comp.name} {isMainCompany && <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-mono font-bold font-semibold uppercase">Matriz</span>}
                              {comp.plan && (
                                <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-extrabold uppercase border ${
                                  comp.plan === 'PREMIUM' 
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' 
                                    : comp.plan === 'PRO' 
                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/10' 
                                    : 'bg-slate-500/10 text-slate-450 border-slate-500/10'
                                }`}>
                                  {comp.plan}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 block font-bold">
                              {comp.nuit}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4.5 px-6 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{comp.address}</span>
                        </div>
                      </td>

                      <td className="py-4.5 px-6 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        {comp.settings?.defaultInterestRate}% juro / {comp.settings?.defaultPenaltyRate}% mora
                      </td>

                      <td className="py-4.5 px-6 text-[10px] font-mono text-slate-450">
                        {new Date(comp.createdAt).toLocaleDateString("pt-MZ")}
                      </td>

                      <td className="py-4.5 px-6 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button
                            onClick={() => setShowEditModal(comp)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Editar Dados"
                          >
                            <Edit2 size={12} />
                          </button>
                          
                          {!isMainCompany && (
                            <button
                              onClick={() => onDeleteCompany(comp.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                              title="Remover Empresa"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[11px] text-slate-400 italic">
                    Nenhuma empresa encontrada de momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW COMPANY + MASTER USER WIZARD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
            
            {/* Modal Head */}
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <Building size={16} className="text-indigo-500" />
                <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Registrar Nova Empresa & Gestor
                </span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 text-[11px] rounded-xl border border-rose-100 dark:border-rose-950">
                  {errorMsg}
                </div>
              )}

              {/* SECTION A: COMPANY DETAILS */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-indigo-500 font-bold border-b pb-1 dark:border-slate-800">
                  1. Detalhes da Empresa
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                      Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maputo Cred, Limitada"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                      Número de Identificação Tributária (NUIT) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NUIT 40024419"
                      value={companyNuit}
                      onChange={(e) => setCompanyNuit(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                    Endereço Completo da Sede *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Av. 24 de Julho, No. 1204, Maputo, Moçambique"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                    Logótipo da Empresa (PNG)
                  </label>
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/60 text-center transition relative">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => handleLogoUpload(e, false)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {companyLogoUrl ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <img 
                          src={companyLogoUrl} 
                          alt="Logo Preview" 
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 object-contain bg-white rounded border border-slate-200 p-0.5" 
                        />
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Logótipo Carregado</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setCompanyLogoUrl(""); }} className="text-[8px] text-rose-500 hover:underline">Remover</button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Arraste ou clique para carregar imagem PNG</p>
                        <p className="text-[8px] text-slate-450 mt-0.5">Apenas PNG é suportado</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ou insira um link direto para o PNG (Opcional)"
                    value={companyLogoUrl}
                    onChange={(e) => setCompanyLogoUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                    Pacote / Plano de Subscrição *
                  </label>
                  <select
                    value={companyPlan}
                    onChange={(e) => setCompanyPlan(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200 font-sans font-bold cursor-pointer"
                  >
                    <option value="BASICO">Básico (Dashboard, Clientes, Empréstimos)</option>
                    <option value="PRO">Profissional Pro (+ Utilizadores, Definições)</option>
                    <option value="PREMIUM">Premium (+ Analista Inteligente IA)</option>
                  </select>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    Define quais as abas de navegação do CredFlow estarão liberadas e ativadas para esta instituição.
                  </p>
                </div>
              </div>

              {/* SECTION B: FIRST MANAGER DETAILS */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-indigo-500 font-bold border-b pb-1 dark:border-slate-800">
                  2. Conta do Administrador/Gestor Principal (Tenant Master)
                </h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                    Nome Completo do Gestor *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 text-slate-400" size={12} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anastácio Matsinhe"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                      Telefone do Gestor (Para login) *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-400" size={12} />
                      <input
                        type="text"
                        required
                        placeholder="+258 84 123 4567"
                        value={managerPhone}
                        onChange={(e) => setManagerPhone(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                      Palavra-passe Inicial de Acesso *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-slate-400" size={12} />
                      <input
                        type="password"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={managerPassword}
                        onChange={(e) => setManagerPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 pl-9 pr-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-850 mt-6 md:mt-10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold text-[11px] py-2 px-4 rounded-xl cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[11px] py-2 px-4 rounded-xl cursor-pointer transition flex items-center gap-1.5"
                >
                  {isSubmitting ? "Registrando..." : "Registrar Empresa"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Editar Empresa
              </span>
              <button
                onClick={() => setShowEditModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  required
                  value={showEditModal.name}
                  onChange={(e) => setShowEditModal({ ...showEditModal, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                  NUIT
                </label>
                <input
                  type="text"
                  required
                  value={showEditModal.nuit}
                  onChange={(e) => setShowEditModal({ ...showEditModal, nuit: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                  Endereço
                </label>
                <input
                  type="text"
                  required
                  value={showEditModal.address}
                  onChange={(e) => setShowEditModal({ ...showEditModal, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                  Logótipo da Empresa (PNG)
                </label>
                <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/60 text-center transition relative">
                  <input
                    type="file"
                    accept="image/png"
                    onChange={(e) => handleLogoUpload(e, true)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {showEditModal.logoUrl ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <img 
                        src={showEditModal.logoUrl} 
                        alt="Logo Edit" 
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-contain bg-white rounded border border-slate-200 p-0.5" 
                      />
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Logótipo Carregado</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowEditModal({ ...showEditModal, logoUrl: "" }); }} className="text-[8px] text-rose-500 hover:underline">Remover</button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Arraste ou clique para carregar imagem PNG</p>
                      <p className="text-[8px] text-slate-450 mt-0.5">Apenas PNG é suportado</p>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ou link direto para o PNG"
                  value={showEditModal.logoUrl || ""}
                  onChange={(e) => setShowEditModal({ ...showEditModal, logoUrl: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-400 font-mono font-bold block">
                  Plano / Pacote de Subscrição
                </label>
                <select
                  value={showEditModal.plan || "BASICO"}
                  onChange={(e) => setShowEditModal({ ...showEditModal, plan: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:border-indigo-600 text-slate-800 dark:text-slate-200 font-sans font-bold cursor-pointer"
                >
                  <option value="BASICO">Básico (Dashboard, Clientes, Empréstimos)</option>
                  <option value="PRO">Profissional Pro (+ Utilizadores, Definições)</option>
                  <option value="PREMIUM">Premium (+ Analista Inteligente IA)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold text-[11px] py-1.5 px-3 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
