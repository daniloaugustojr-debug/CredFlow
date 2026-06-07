import React, { useState } from "react";
import { SystemSettings, User } from "../types";
import {
  Settings,
  ShieldCheck,
  Percent,
  MapPin,
  Building,
  HardDriveUpload,
  Download,
  Database,
  RefreshCw,
  Clock,
  CheckCircle2
} from "lucide-react";

interface SettingsViewProps {
  settings: SystemSettings;
  currentUser: User;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onRestoreBackup: (backupJson: any) => Promise<boolean>;
}

export default function SettingsView({
  settings,
  currentUser,
  onUpdateSettings,
  onRestoreBackup,
}: SettingsViewProps) {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyNuit, setCompanyNuit] = useState(settings.companyNuit);
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings.companyLogoUrl || "");
  const [defaultInterestRate, setDefaultInterestRate] = useState(settings.defaultInterestRate);
  const [defaultPenaltyRate, setDefaultPenaltyRate] = useState(settings.defaultPenaltyRate);

  const [availableRates, setAvailableRates] = useState<number[]>(settings.availableRates || [5, 10, 15, 20, 25, 30]);
  const [availableTerms, setAvailableTerms] = useState<number[]>(settings.availableTerms || [1, 2, 3, 4, 6, 12]);
  const [availablePaymentFrequencies, setAvailablePaymentFrequencies] = useState<string[]>(settings.availablePaymentFrequencies || ["Mensais", "Semanais", "Diárias"]);

  const [newRate, setNewRate] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [newFreq, setNewFreq] = useState("");

  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const canManageRates = currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER_USER" || currentUser.permissions.manageRates;
  const isCompanyAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER_USER";
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  const handleAddRate = () => {
    const val = parseFloat(newRate);
    if (!isNaN(val) && val > 0 && !availableRates.includes(val)) {
      setAvailableRates([...availableRates, val].sort((a,b) => a - b));
      setNewRate("");
    }
  };

  const handleRemoveRate = (rate: number) => {
    setAvailableRates(availableRates.filter(r => r !== rate));
  };

  const handleAddTerm = () => {
    const val = parseInt(newTerm, 10);
    if (!isNaN(val) && val > 0 && !availableTerms.includes(val)) {
      setAvailableTerms([...availableTerms, val].sort((a,b) => a - b));
      setNewTerm("");
    }
  };

  const handleRemoveTerm = (term: number) => {
    setAvailableTerms(availableTerms.filter(t => t !== term));
  };

  const handleAddFreq = () => {
    const val = newFreq.trim();
    if (val && !availablePaymentFrequencies.includes(val)) {
      setAvailablePaymentFrequencies([...availablePaymentFrequencies, val]);
      setNewFreq("");
    }
  };

  const handleRemoveFreq = (freq: string) => {
    setAvailablePaymentFrequencies(availablePaymentFrequencies.filter(f => f !== freq));
  };

  const handleLogoUploadSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      alert("Por favor carregue apenas imagens no formato PNG.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompanyLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRates) {
      alert("Apenas administradores e utilizadores master podem atualizar os parâmetros e taxas de microcrédito.");
      return;
    }

    onUpdateSettings({
      companyName,
      companyNuit,
      companyAddress,
      companyLogoUrl,
      defaultInterestRate,
      defaultPenaltyRate,
      availableRates,
      availableTerms,
      availablePaymentFrequencies,
    });
    alert("Configurações atualizadas com sucesso e aplicadas globalmente.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.users || !parsed.clients || !parsed.loans) {
          throw new Error("Arquivo não reconhecido como um backup de dados válido.");
        }

        const success = await onRestoreBackup(parsed);
        if (success) {
          setRestoreFeedback("Base de dados restaurada com sucesso! Todas as informações foram sincronizadas.");
          setRestoreError(null);
        } else {
          setRestoreError("Erro na restauração. Verifique permissões do Super Admin.");
        }
      } catch (err: any) {
        setRestoreError("Erro no processamento do ficheiro JSON: " + err.message);
        setRestoreFeedback(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Intro section */}
      <div>
        <h2 className="font-display font-bold text-3xl tracking-tight text-slate-900 dark:text-white">
          Configurações do Sistema
        </h2>
        <p className="text-sm text-slate-500">
          Gerencie configurações institucionais, taxas de empréstimos, e cópias de segurança de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Config Form Column */}
        <div className={`${currentUser.role === "SUPER_ADMIN" ? "lg:col-span-2" : "lg:col-span-3"} bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xl`}>
          <div className="flex items-center gap-2 border-b border-indigo-50 dark:border-slate-850 pb-3 mb-5">
            <Building className="text-indigo-500" size={17} />
            <h4 className="font-display font-semibold text-slate-950 dark:text-white">
              Perfil da Instituição & Taxas do Mercado
            </h4>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs font-sans">
            {/* Company Name */}
            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">Nome da Instituição Financeira</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
              />
              {!isSuperAdmin && (
                <span className="text-[10px] text-red-500 font-mono mt-1 block">
                  Apenas o Administrador Geral ("SUPER_ADMIN") pode alterar o nome da empresa.
                </span>
              )}
            </div>

            {/* Tax NUIT */}
            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">Número de Identificação Fiscal (NUIT)</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={companyNuit}
                onChange={(e) => setCompanyNuit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
              />
              {!isSuperAdmin && (
                <span className="text-[10px] text-red-500 font-mono mt-1 block">
                  Apenas o Administrador Geral ("SUPER_ADMIN") pode alterar o NUIT da empresa.
                </span>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">Endereço de Faturação Sede</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
              />
              {!isSuperAdmin && (
                <span className="text-[10px] text-red-500 font-mono mt-1 block">
                  Apenas o Administrador Geral ("SUPER_ADMIN") pode alterar o endereço da empresa.
                </span>
              )}
            </div>

            {/* Company Logo PNG Upload */}
            <div className="space-y-2 pt-2">
              <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">Logótipo da Empresa (PNG)</label>
              <div className="border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/40 text-center transition relative">
                <input
                  type="file"
                  accept="image/png"
                  disabled={!isSuperAdmin}
                  onChange={handleLogoUploadSettings}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {companyLogoUrl ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <img 
                      src={companyLogoUrl} 
                      alt="Logo Brand" 
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-contain bg-white rounded border border-slate-200 p-1" 
                    />
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Logótipo Ativo</span>
                    {isSuperAdmin && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setCompanyLogoUrl(""); }} className="text-[8px] text-rose-500 hover:underline">Remover</button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Arraste ou clique para carregar logótipo da sua empresa em PNG</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Visível no cabeçalho e relatórios PDF</p>
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Ou link direto para o PNG em URL"
                disabled={!isSuperAdmin}
                value={companyLogoUrl}
                onChange={(e) => setCompanyLogoUrl(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
              />
              {!isSuperAdmin && (
                <span className="text-[10px] text-red-500 font-mono mt-1 block">
                  Apenas o Administrador Geral ("SUPER_ADMIN") pode alterar o logótipo da empresa.
                </span>
              )}
            </div>

            {/* Interest Controls */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-850">
              {/* Default Interest */}
              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Juros Padrão de Microcrédito (%)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold">%</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canManageRates}
                    value={defaultInterestRate}
                    onChange={(e) => setDefaultInterestRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-xs font-semibold pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Default Penalty */}
              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Multa de Mora Vencida (%)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold">%</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canManageRates}
                    value={defaultPenaltyRate}
                    onChange={(e) => setDefaultPenaltyRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-xs font-semibold pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Predefined configurations */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h5 className="font-display font-semibold text-slate-850 dark:text-slate-200 text-xs">
                Valores de Configuração Predefinidos (Juros, Prazos e Prestações)
              </h5>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">
                Adicione ou exclua opções recorrentes para microcrédito. Estas opções estarão disponíveis como escolhas rápidas ao conceder novos empréstimos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Predefined Rates */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3">
                  <label className="text-slate-700 dark:text-slate-300 block font-semibold text-[10.5px]">
                    Taxas de Juro (% ao mês)
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center">
                    {availableRates.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/40 text-indigo-700 dark:text-indigo-400 font-mono font-bold text-[10px] px-2 py-1 rounded">
                        {r}%
                        {canManageRates && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRate(r)}
                            className="text-rose-500 hover:text-rose-700 ml-1 text-xs font-bold leading-none cursor-pointer"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {canManageRates && (
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        placeholder="Nova Taxa"
                        step="0.1"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] px-2 py-1 outline-none rounded-lg focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddRate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 rounded-lg cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Predefined Terms */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3">
                  <label className="text-slate-700 dark:text-slate-300 block font-semibold text-[10.5px]">
                    Prazos (em Prestações)
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center">
                    {availableTerms.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100/40 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px] px-2 py-1 rounded">
                        {t} {t === 1 ? 'mês/prestação' : 'meses/prestações'}
                        {canManageRates && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTerm(t)}
                            className="text-rose-500 hover:text-rose-700 ml-1 text-xs font-bold leading-none cursor-pointer"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {canManageRates && (
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        placeholder="Ex: 5"
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] px-2 py-1 outline-none rounded-lg focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTerm}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 rounded-lg cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Predefined Frequencies */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3">
                  <label className="text-slate-700 dark:text-slate-300 block font-semibold text-[10.5px]">
                    Gama de Prestações (Cadência)
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center">
                    {availablePaymentFrequencies.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-100/40 text-amber-700 dark:text-amber-400 font-bold text-[10px] px-2 py-1 rounded">
                        {f}
                        {canManageRates && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFreq(f)}
                            className="text-rose-500 hover:text-rose-700 ml-1 text-xs font-bold leading-none cursor-pointer"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {canManageRates && (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Frequência"
                        value={newFreq}
                        onChange={(e) => setNewFreq(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] px-2 py-1 outline-none rounded-lg focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddFreq}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 rounded-lg cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canManageRates && (
              <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4.5 py-2.5 rounded-xl transition duration-150 shadow-md cursor-pointer text-xs"
                >
                  Confirmar Parâmetros & Opções Predefinidas
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Database backup restore right panel */}
        {currentUser.role === "SUPER_ADMIN" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-indigo-50 dark:border-slate-850 pb-3 mb-5">
                <Database className="text-indigo-500" size={17} />
                <h4 className="font-display font-semibold text-slate-950 dark:text-white">
                  Cópia de Segurança e Backup
                </h4>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
                Exporte todos os livros contábeis, mutuários, parcelas de reembolso, e logs operacionais. O arquivo JSON
                gerado pode ser usado para restaurar o estado inteiro da instituição a qualquer momento.
              </p>

              <div className="space-y-4">
                {/* Trigger export */}
                <a
                  href="/api/backup"
                  download
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-semibold text-xs py-3 px-4 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <Download size={15} />
                  Exportar Base de Dados de Meticais
                </a>

                {/* Restore Box */}
                {currentUser.role === "SUPER_ADMIN" ? (
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center mt-6 bg-slate-50/50 dark:bg-slate-950/20">
                    <HardDriveUpload className="text-slate-400 mx-auto mb-2" size={24} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 block mb-1">
                      Carregar Cópia de Segurança
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                      Selecione o arquivo de backup `.json` guardado.
                    </p>
                    <label className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition">
                      Procurar Ficheiro...
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="text-[10.5px] p-4 bg-slate-50 rounded-xl text-slate-400 italic text-center border">
                    Sendo um operador {currentUser.role}, a funcionalidade de restauração total é bloqueada por segurança.
                  </div>
                )}

                {/* Status metrics feedbacks */}
                {restoreFeedback && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 px-3 p-2 rounded-lg text-[10.5px] font-medium border border-emerald-200">
                    {restoreFeedback}
                  </div>
                )}
                {restoreError && (
                  <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 px-3 p-2 rounded-lg text-[10.5px] font-medium border border-rose-250">
                    {restoreError}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t pt-2">
              <span>MeticalCred Core Engine: 1.4.0</span>
              <span className="text-slate-500 flex items-center gap-0.5">
                <ShieldCheck size={11} className="text-teal-500" /> Cópia Segura
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
