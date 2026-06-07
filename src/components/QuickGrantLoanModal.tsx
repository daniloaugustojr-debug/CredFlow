import React, { useState, useEffect } from "react";
import { SystemSettings, Client } from "../types";
import { 
  X, 
  UserPlus, 
  Coins, 
  Percent, 
  Clock, 
  Calendar, 
  CheckSquare, 
  FileText, 
  UploadCloud, 
  Camera, 
  Trash2, 
  Paperclip, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  FileCheck,
  ShieldCheck
} from "lucide-react";

interface QuickGrantLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings | null;
  clients?: Client[];
  onConfirm: (
    clientData: {
      fullName: string;
      phone: string;
      idPassport: string;
      address: string;
      financialStatus: Client["financialStatus"];
      notes?: string;
      existingClientId?: string;
      biAttachment?: string;
      guaranteeAttachment?: string;
      guaranteeDescription?: string;
      guaranteeEstimatedValue?: number;
      guaranteePhotos?: string[];
    },
    loanData: {
      principalAmount: number;
      interestRate: number;
      termMonths: number;
      paymentFrequency: string;
      dueDate?: string;
      biAttachment?: string;
      guaranteeAttachment?: string;
      guaranteeDescription?: string;
      guaranteeEstimatedValue?: number;
      guaranteePhotos?: string[];
    }
  ) => Promise<void>;
}

export default function QuickGrantLoanModal({
  isOpen,
  onClose,
  settings,
  clients = [],
  onConfirm,
}: QuickGrantLoanModalProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1: Cliet/Customer States
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+258 ");
  const [idPassport, setIdPassport] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  // STEP 2: Documentos e Penhora States
  const [biStatus, setBiStatus] = useState<"idle" | "uploading" | "loaded" | "invalid">("idle");
  const [biFileName, setBiFileName] = useState("");
  const [biBase64, setBiBase64] = useState("");
  const [biProgress, setBiProgress] = useState(0);

  const [guaranteePhotos, setGuaranteePhotos] = useState<string[]>([]);
  const [guaranteeStatus, setGuaranteeStatus] = useState<"idle" | "uploading" | "loaded" | "invalid">("idle");
  const [guaranteeProgress, setGuaranteeProgress] = useState(0);
  const [guaranteeDescription, setGuaranteeDescription] = useState("");
  const [guaranteeEstimatedValue, setGuaranteeEstimatedValue] = useState("");

  // Drag and drop hover indicators
  const [biDragOver, setBiDragOver] = useState(false);
  const [gDragOver, setGDragOver] = useState(false);

  // STEP 3: Loan States
  const interestOptions = settings?.availableRates && settings.availableRates.length > 0 
    ? settings.availableRates 
    : [5, 10, 15, 20, 25, 30];
  
  const frequencyOptions = settings?.availablePaymentFrequencies && settings.availablePaymentFrequencies.length > 0
    ? settings.availablePaymentFrequencies
    : ["Mensais", "Semanais", "Diárias"];

  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState(settings?.defaultInterestRate?.toString() || interestOptions[0]?.toString() || "15");
  const [paymentFrequency, setPaymentFrequency] = useState(frequencyOptions[0] || "Mensais");

  // Prazo de Resgate custom option logic
  const [termOption, setTermOption] = useState<"7" | "15" | "30" | "60" | "90" | "180" | "custom">("90");
  const [customDueDate, setCustomDueDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState("");

  // Pre-fill fields if settings load
  useEffect(() => {
    if (settings) {
      if (settings.defaultInterestRate) setInterestRate(settings.defaultInterestRate.toString());
      if (settings.availablePaymentFrequencies && settings.availablePaymentFrequencies.length > 0) {
        setPaymentFrequency(settings.availablePaymentFrequencies[0]);
      }
    }
  }, [settings]);

  if (!isOpen) return null;

  // Active dates & term calculations
  let activeDays = 90;
  if (termOption === "7") activeDays = 7;
  else if (termOption === "15") activeDays = 15;
  else if (termOption === "30") activeDays = 30;
  else if (termOption === "60") activeDays = 60;
  else if (termOption === "90") activeDays = 90;
  else if (termOption === "180") activeDays = 180;
  else if (termOption === "custom" && customDueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(customDueDate + "T00:00:00");
    const diff = chosen.getTime() - today.getTime();
    const computedDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    activeDays = computedDays > 0 ? computedDays : 0;
  }

  const activeMonths = parseFloat((activeDays / 30).toFixed(2));

  // Determine standard contract final due date
  const contractDueDateObj = new Date();
  contractDueDateObj.setDate(contractDueDateObj.getDate() + activeDays);
  const standardDueDateISO = contractDueDateObj.toISOString().split("T")[0];

  // Output string for displaying Date: DD/MM/AAAA
  let displayDueDateStr = "";
  if (termOption === "custom" && customDueDate) {
    const parts = customDueDate.split("-");
    if (parts.length === 3) {
      displayDueDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } else {
    const d = String(contractDueDateObj.getDate()).padStart(2, "0");
    const m = String(contractDueDateObj.getMonth() + 1).padStart(2, "0");
    const y = contractDueDateObj.getFullYear();
    displayDueDateStr = `${d}/${m}/${y}`;
  }

  // Financial Calculations
  const parsedPrincipal = parseFloat(principalAmount) || 0;
  const parsedRate = parseFloat(interestRate) || 0;
  const totalInterest = Math.round(parsedPrincipal * (parsedRate / 100) * activeMonths);
  const totalDue = Math.round(parsedPrincipal + totalInterest);
  
  // Installment distribution (by months)
  const parsedTermMonthsForInstallment = activeMonths < 1 ? 1 : Math.round(activeMonths);
  const installmentAmount = Math.round(totalDue / parsedTermMonthsForInstallment);

  // Auto-format currency handler
  const handleCurrencyInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setGuaranteeEstimatedValue("");
      return;
    }
    setGuaranteeEstimatedValue(digits);
  };

  const getFormattedMZN = (val: string) => {
    if (!val) return "";
    return parseInt(val, 10).toLocaleString("pt-MZ") + " MZN";
  };

  // Convert File to Base64 standard promise
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  // Drag and Drop implementation for BI
  const handleBiDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setBiDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBiFileChosen(e.dataTransfer.files[0]);
    }
  };

  const handleBiFileSelector = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleBiFileChosen(e.target.files[0]);
    }
  };

  const handleBiFileChosen = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setBiStatus("invalid");
      setBiFileName("");
      setBiBase64("");
      setInputError("Cópia de BI excede o limite máximo de 5MB.");
      return;
    }

    const permitted = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!permitted.includes(file.type)) {
      setBiStatus("invalid");
      setBiFileName("");
      setBiBase64("");
      setInputError("Formato de arquivo inválido. Insira apenas PDF, JPG, JPEG ou PNG.");
      return;
    }

    setInputError("");
    setBiStatus("uploading");
    setBiFileName(file.name);
    setBiProgress(20);

    // Dynamic progress bar increments
    let progress = 20;
    const interval = setInterval(async () => {
      progress += 25;
      if (progress >= 100) {
        setBiProgress(100);
        clearInterval(interval);
        try {
          const b64 = await fileToBase64(file);
          setBiBase64(b64);
          setBiStatus("loaded");
        } catch (err) {
          setBiStatus("invalid");
          setInputError("Ocorreu um erro ao processar o arquivo.");
        }
      } else {
        setBiProgress(progress);
      }
    }, 120);
  };

  const removeBiFile = () => {
    setBiStatus("idle");
    setBiFileName("");
    setBiBase64("");
    setBiProgress(0);
  };

  // Drag and Drop / Photo Multiples for pledge
  const handleGuaranteeDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setGDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleGuaranteeFilesChosen(e.dataTransfer.files);
    }
  };

  const handleGuaranteeFileSelector = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleGuaranteeFilesChosen(e.target.files);
    }
  };

  const handleGuaranteeFilesChosen = async (files: FileList) => {
    setGuaranteeStatus("uploading");
    setGuaranteeProgress(10);
    setInputError("");

    const permitted = ["image/png", "image/jpeg", "image/jpg"];
    const base64List: string[] = [];
    let isErr = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!permitted.includes(file.type)) {
        setInputError("Apenas arquivos de imagem JPG, JPEG e PNG são aceites para a garantia.");
        isErr = true;
        break;
      }
      if (file.size > 8 * 1024 * 1024) {
        setInputError("Cada imagem de garantia deve ter menos de 8MB.");
        isErr = true;
        break;
      }

      try {
        const b64 = await fileToBase64(file);
        base64List.push(b64);
      } catch (err) {
        setInputError("Falha na codificação da imagem.");
        isErr = true;
        break;
      }
    }

    if (isErr) {
      setGuaranteeStatus("invalid");
      return;
    }

    let progress = 10;
    const interval = setInterval(() => {
      progress += 30;
      if (progress >= 100) {
        setGuaranteeProgress(100);
        clearInterval(interval);
        setGuaranteePhotos((prev) => [...prev, ...base64List]);
        setGuaranteeStatus("loaded");
      } else {
        setGuaranteeProgress(progress);
      }
    }, 100);
  };

  const removeGuaranteePhoto = (idx: number) => {
    setGuaranteePhotos((prev) => prev.filter((_, i) => i !== idx));
    if (guaranteePhotos.length <= 1) {
      setGuaranteeStatus("idle");
    }
  };

  // Validation before changing/navigating wizard steps
  const validateStep = (step: number): boolean => {
    setInputError("");

    if (step === 1) {
      if (isExistingClient && !selectedClientId) {
        setInputError("Deve selecionar um cliente já cadastrado.");
        return false;
      }
      if (!fullName.trim()) {
        setInputError("Nome completo é obrigatório.");
        return false;
      }
      if (!phone.trim() || phone.trim() === "+258") {
        setInputError("Telefone de contacto é obrigatório.");
        return false;
      }
      if (!idPassport.trim()) {
        setInputError("Número documento de Identificação é obrigatório.");
        return false;
      }
      if (!address.trim()) {
        setInputError("Defina o endereço residencial habitual.");
        return false;
      }
    }

    if (step === 2) {
      if (!biBase64) {
        setInputError("Upload do Documento BI / Passaporte é obrigatório.");
        return false;
      }
      if (guaranteePhotos.length === 0) {
        setInputError("Adicione pelo menos 1 Foto da Penhora / Garantia apresentada.");
        return false;
      }
      if (!guaranteeDescription.trim()) {
        setInputError("Escreva uma descrição breve sobre a garantia penhorada.");
        return false;
      }
      if (!guaranteeEstimatedValue) {
        setInputError("Defina o valor avaliado estimado da penhora em MZN.");
        return false;
      }
    }

    if (step === 3) {
      if (parsedPrincipal <= 0) {
        setInputError("O montante de capital deve ser maior que zero MZN.");
        return false;
      }
      if (termOption === "custom" && !customDueDate) {
        setInputError("Selecione a data de resgate personalizada no calendário.");
        return false;
      }
      if (termOption === "custom") {
        const todayStrStr = new Date().toISOString().split('T')[0];
        if (customDueDate < todayStrStr) {
          setInputError("A data de resgate personalizada não pode ser no passado.");
          return false;
        }
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => (prev + 1) as any);
    }
  };

  const handleBackStep = () => {
    setInputError("");
    setActiveStep((prev) => (prev - 1) as any);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
    setInputError("");

    try {
      // Send correct client fields and loan fields
      await onConfirm(
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          idPassport: idPassport.trim(),
          address: address.trim(),
          financialStatus: "STABLE",
          notes: notes.trim() || undefined,
          existingClientId: isExistingClient ? selectedClientId : undefined,
          biAttachment: biBase64,
          guaranteeAttachment: guaranteePhotos[0], // First photo as main guarantee
          guaranteeDescription: guaranteeDescription.trim(),
          guaranteeEstimatedValue: parseFloat(guaranteeEstimatedValue),
          guaranteePhotos: guaranteePhotos,
        },
        {
          principalAmount: parsedPrincipal,
          interestRate: parsedRate,
          termMonths: activeMonths,
          paymentFrequency: paymentFrequency,
          dueDate: termOption === "custom" ? customDueDate : standardDueDateISO,
          biAttachment: biBase64,
          guaranteeAttachment: guaranteePhotos[0],
          guaranteeDescription: guaranteeDescription.trim(),
          guaranteeEstimatedValue: parseFloat(guaranteeEstimatedValue),
          guaranteePhotos: guaranteePhotos,
        }
      );

      // Clean modal values completely
      setFullName("");
      setPhone("+258 ");
      setIdPassport("");
      setAddress("");
      setNotes("");
      setIsExistingClient(false);
      setSelectedClientId("");
      setBiStatus("idle");
      setBiFileName("");
      setBiBase64("");
      setBiProgress(0);
      setGuaranteePhotos([]);
      setGuaranteeDescription("");
      setGuaranteeEstimatedValue("");
      setGuaranteeStatus("idle");
      setGuaranteeProgress(0);
      setPrincipalAmount("");
      setTermOption("90");
      setCustomDueDate("");
      setActiveStep(1);
      onClose();
    } catch (err: any) {
      setInputError(err.message || "Erro operacional ao criar registo de mútuo e contrato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header with Close Icon */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-sm">
                Registar Cliente & Conceder Empréstimo
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Contrato de Microcrédito e Registro de Adjudicação de Penhora Garantidora.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dynamic Nav Stepper Progress Graphic */}
        <div className="bg-slate-100/50 dark:bg-slate-950/40 px-6 py-4.5 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center text-[10px] uppercase font-bold tracking-wider select-none">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
              activeStep === 1 
                ? "bg-indigo-600 border-indigo-600 text-white" 
                : activeStep > 1 
                  ? "bg-emerald-500 border-emerald-500 text-white font-bold" 
                  : "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500"
            }`}>
              {activeStep > 1 ? "✓" : "1"}
            </span>
            <span className={activeStep === 1 ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-500"}>Mutuário</span>
          </div>

          <div className="flex-1 h-[2px] mx-2 bg-slate-200 dark:bg-slate-800">
            <div className={`h-full transition-all duration-300 bg-indigo-500 ${activeStep >= 2 ? "w-full" : "w-0"}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
              activeStep === 2 
                ? "bg-indigo-600 border-indigo-600 text-white animate-pulse" 
                : activeStep > 2 
                  ? "bg-emerald-500 border-emerald-500 text-white font-bold" 
                  : "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500"
            }`}>
              {activeStep > 2 ? "✓" : "2"}
            </span>
            <span className={activeStep === 2 ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-500"}>Garantias</span>
          </div>

          <div className="flex-1 h-[2px] mx-2 bg-slate-200 dark:bg-slate-800">
            <div className={`h-full transition-all duration-300 bg-indigo-500 ${activeStep >= 3 ? "w-full" : "w-0"}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
              activeStep === 3 
                ? "bg-indigo-600 border-indigo-600 text-white" 
                : activeStep > 3 
                  ? "bg-emerald-500 border-emerald-500 text-white font-bold" 
                  : "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500"
            }`}>
              {activeStep > 3 ? "✓" : "3"}
            </span>
            <span className={activeStep === 3 ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-500"}>Termos</span>
          </div>

          <div className="flex-1 h-[2px] mx-2 bg-slate-200 dark:bg-slate-800">
            <div className={`h-full transition-all duration-300 bg-indigo-500 ${activeStep >= 4 ? "w-full" : "w-0"}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border ${
              activeStep === 4 
                ? "bg-indigo-600 border-indigo-600 text-white" 
                : "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500"
            }`}>
              4
            </span>
            <span className={activeStep === 4 ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-500"}>Remessa</span>
          </div>
        </div>

        {/* Content Body Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {inputError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-3 rounded-2xl border border-rose-100 dark:border-rose-950/80 text-[11px] font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{inputError}</span>
            </div>
          )}

          {/* PASSO 1: DADOS DO MUTUÁRIO */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-display font-extrabold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                  Passo 1: Identificação Civil do Mutuário
                </h4>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Identificação do Cliente</span>
              </div>

              {/* Selector Option (Novo / Existente) */}
              <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsExistingClient(false);
                    setFullName("");
                    setPhone("+258 ");
                    setIdPassport("");
                    setAddress("");
                    setSelectedClientId("");
                  }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !isExistingClient
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.01]"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Novo Cadastro Mutuário
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExistingClient(true);
                    setFullName("");
                    setPhone("");
                    setIdPassport("");
                    setAddress("");
                    setSelectedClientId("");
                  }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isExistingClient
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.01]"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Clientes Já Registados
                </button>
              </div>

              {/* Dropdown for Existent Clients */}
              {isExistingClient && (
                <div className="bg-indigo-50/20 dark:bg-indigo-950/10 p-4 border border-indigo-100/30 dark:border-indigo-900/30 rounded-2xl space-y-2">
                  <label className="text-slate-600 dark:text-slate-400 block font-bold text-[10px]">Escolher da Lista Cadastrada *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedClientId(cid);
                      const matched = clients.find((c) => c.id === cid);
                      if (matched) {
                        setFullName(matched.fullName);
                        setPhone(matched.phone);
                        setIdPassport(matched.idPassport);
                        setAddress(matched.address);
                        // Backfill if previously uploaded
                        if (matched.biAttachment) setBiBase64(matched.biAttachment);
                        if (matched.guaranteePhotos && matched.guaranteePhotos.length > 0) {
                          setGuaranteePhotos(matched.guaranteePhotos);
                          setGuaranteeStatus("loaded");
                        }
                        if (matched.guaranteeDescription) setGuaranteeDescription(matched.guaranteeDescription);
                        if (matched.guaranteeEstimatedValue) setGuaranteeEstimatedValue(matched.guaranteeEstimatedValue.toString());
                      } else {
                        setFullName("");
                        setPhone("+258 ");
                        setIdPassport("");
                        setAddress("");
                        setBiBase64("");
                        setGuaranteePhotos([]);
                        setGuaranteeDescription("");
                        setGuaranteeEstimatedValue("");
                        setGuaranteeStatus("idle");
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="">-- Seleccione a partir da lista de clientes cadastrados --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} (NSU: {c.idPassport})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    disabled={isExistingClient}
                    placeholder="Ex: Isac Alfredo Mondlane"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Telefone de Contacto *</label>
                  <input
                    type="text"
                    required
                    disabled={isExistingClient}
                    placeholder="+258 84 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">BI ou Passaporte *</label>
                  <input
                    type="text"
                    required
                    disabled={isExistingClient}
                    placeholder="Ex: 110204859B"
                    value={idPassport}
                    onChange={(e) => setIdPassport(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Endereço Residencial *</label>
                  <input
                    type="text"
                    required
                    disabled={isExistingClient}
                    placeholder="Ex: Bairro Central, Av. Eduardo Mondlane, Maputo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Observações, Co-Garantias ou Notas</label>
                <textarea
                  placeholder="Introduza notas secundárias sobre o referenciador, emprego ou garantias acessórias..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-250 dark:border-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* PASSO 2: DOCUMENTOS E PENHORA */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-display font-extrabold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                  Passo 2: Documentos do Mutuário e Penhora Adjudicada
                </h4>
                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 border border-indigo-150 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider shrink-0">
                  Documentos Obrigatórios
                </span>
              </div>

              {/* 1. UPLOAD DO BI OU PASSAPORTE */}
              <div className="space-y-2">
                <label className="text-slate-600 dark:text-slate-350 font-bold block">1. Upload do BI ou Passaporte *</label>
                
                {biStatus === "idle" && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setBiDragOver(true); }}
                    onDragLeave={() => setBiDragOver(false)}
                    onDrop={handleBiDrop}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                      biDragOver 
                        ? "border-indigo-500 bg-indigo-500/10" 
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <input
                      type="file"
                      id="bi-upload-input"
                      accept="application/pdf, image/png, image/jpeg, image/jpg"
                      className="hidden"
                      onChange={handleBiFileSelector}
                    />
                    <label htmlFor="bi-upload-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                      <UploadCloud size={28} className="text-slate-400 hover:text-indigo-500 transition-colors" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Arraste ou clique para carregar o BI do mutuário</p>
                      <p className="text-[10px] text-slate-400">PDF, JPG, JPEG ou PNG (Limite máximo de 5MB)</p>
                    </label>
                  </div>
                )}

                {biStatus === "uploading" && (
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-950 bg-indigo-50/10">
                    <div className="flex justify-between items-center mb-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-indigo-650">
                        <Clock size={12} className="animate-spin text-indigo-500" />
                        A carregar BI...
                      </span>
                      <span>{biProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-150" style={{ width: `${biProgress}%` }} />
                    </div>
                  </div>
                )}

                {biStatus === "loaded" && (
                  <div className="p-4 rounded-2xl border border-emerald-250 dark:border-emerald-950/50 bg-emerald-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileCheck size={18} />
                      </div>
                      <div className="text-left font-mono text-[10.5px]">
                        <p className="text-slate-850 dark:text-slate-200 font-bold truncate max-w-[260px]">{biFileName || "Comprovativo ID Carregado"}</p>
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans font-bold flex items-center gap-1">
                          <span>✓ Documento carregado com sucesso</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {biBase64.startsWith("data:image/") && (
                        <a 
                          href={biBase64} 
                          target="_blank" 
                          rel="noreferrer" 
                          referrerPolicy="no-referrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-500 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg hover:shadow-sm"
                          title="Ver documento ampliado"
                        >
                          <Eye size={12} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={removeBiFile}
                        className="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg hover:shadow-sm"
                        title="Substituir/Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {biStatus === "invalid" && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl flex items-center justify-between text-[10.5px]">
                    <span className="text-rose-600 dark:text-rose-450 font-semibold flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      ⚠ Documento inválido ou excede o limite.
                    </span>
                    <button onClick={() => setBiStatus("idle")} className="text-[9px] text-rose-500 hover:underline">Repetir upload</button>
                  </div>
                )}
              </div>

              {/* 2. FOTO DA PENHORA/GARANTIA */}
              <div className="space-y-2">
                <label className="text-slate-600 dark:text-slate-350 font-bold block">2. Foto da Penhora / Garantia *</label>

                {/* Camera / Standard selector panel */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 py-3 px-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                      onChange={handleGuaranteeFileSelector}
                      multiple
                    />
                    <UploadCloud size={14} className="text-indigo-500" />
                    Carregar Ficheiros-Fotos
                  </label>

                  <label className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 py-3 px-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleGuaranteeFileSelector}
                      multiple
                    />
                    <Camera size={14} className="text-indigo-500 animate-pulse" />
                    Tirar Foto (Câmara)
                  </label>
                </div>

                {/* Simulated multi-upload status bar */}
                {guaranteeStatus === "uploading" && (
                  <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-950 bg-indigo-50/10">
                    <div className="flex justify-between items-center mb-1 text-[10px] font-bold">
                      <span className="text-indigo-650 flex items-center gap-1 whitespace-nowrap">
                        <Clock size={10} className="animate-spin text-indigo-500" />
                        Simulando compressão de imagem...
                      </span>
                      <span>{guaranteeProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-850 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${guaranteeProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Draggable Dropzone Wrapper */}
                {guaranteePhotos.length === 0 && guaranteeStatus === "idle" && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setGDragOver(true); }}
                    onDragLeave={() => setGDragOver(false)}
                    onDrop={handleGuaranteeDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center text-slate-400 ${
                      gDragOver ? "border-indigo-500 bg-indigo-500/10 text-indigo-500" : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    Arraste imagens ou fotos da garantia diretamente para este quadrado.
                  </div>
                )}

                {/* Previews Collection */}
                {guaranteePhotos.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase. tracking-wider">Miniaturas Cadastradas ({guaranteePhotos.length}):</span>
                    <div className="flex flex-wrap gap-2.5">
                      {guaranteePhotos.map((photo, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border bg-white dark:bg-slate-900 group shadow-xs">
                          <img 
                            src={photo} 
                            alt={`Garantia ${idx + 1}`} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => removeGuaranteePhoto(idx)}
                            className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-lg hover:bg-rose-700 transition"
                            title="Eliminar Foto"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. DESCRIÇÃO DA PENHORA */}
              <div>
                <label className="text-slate-650 dark:text-slate-350 font-bold block mb-1">3. Descrição Pormenorizada da Penhora *</label>
                <textarea
                  required
                  placeholder="Ex: Televisor Samsung 55’, cor preta, número de série XYZ..."
                  value={guaranteeDescription}
                  onChange={(e) => setGuaranteeDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-250 dark:border-slate-850 text-slate-950 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>

              {/* 4. VALOR DE AVALIAÇÃO DA PENHORA */}
              <div>
                <label className="text-slate-655 dark:text-slate-350 font-bold block mb-1">4. Valor Estimado Consensual / Comercial MZN *</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="MZN (ex: 15.000 MZN)"
                    value={getFormattedMZN(guaranteeEstimatedValue)}
                    onChange={(e) => handleCurrencyInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-slate-950 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold font-mono"
                  />
                  <span className="absolute right-3.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">Formatação em MZN</span>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: TERMOS DO EMPRÉSTIMO */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-display font-extrabold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                  Passo 3: Termos do Empréstimo Contractual
                </h4>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Parâmetros de Crédito</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Principal Requested Capital */}
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Capital Solicitado *</label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      required
                      placeholder="MZN"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-slate-950 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold font-mono"
                    />
                    <span className="absolute right-3.5 text-[10px] text-slate-400 font-bold">{settings?.currencySymbol || "MZN"}</span>
                  </div>
                </div>

                {/* Cadence of Installments */}
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Cadência de Prestações *</label>
                  <select
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-slate-950 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                  >
                    {frequencyOptions.map((freq) => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </div>

                {/* Interest Rate selector */}
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Taxa de Juro Aplicada *</label>
                  <select
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-slate-950 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-black font-mono text-indigo-650 dark:text-indigo-400"
                  >
                    {interestOptions.map((rate) => (
                      <option key={rate} value={rate.toString()}>{rate}% ao mês</option>
                    ))}
                  </select>
                </div>

                {/* Prazo de Resgate Modification */}
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold font-sans">Prazo de Resgate / Limite Contractual *</label>
                  <select
                    value={termOption}
                    onChange={(e) => {
                      const sel = e.target.value as any;
                      setTermOption(sel);
                      if (sel !== "custom") {
                        setCustomDueDate("");
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-slate-950 dark:text-white px-3.5 py-2.5 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="7">7 dias (Micro-prazo)</option>
                    <option value="15">15 dias (Curto-prazo)</option>
                    <option value="30">30 dias - (1 mês)</option>
                    <option value="60">2 meses (Prestações bi-mensais)</option>
                    <option value="90">3 meses (Padrão 90 dias)</option>
                    <option value="180">6 meses (Semestral)</option>
                    <option value="custom">📅 Escolher Data Personalizada</option>
                  </select>
                </div>
              </div>

              {/* Data personalizada date picker calendar display */}
              {termOption === "custom" && (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-200/50 dark:border-indigo-900/40 space-y-3.5 animate-fade-in">
                  <span className="font-bold text-slate-700 dark:text-indigo-400 block text-[10.5px]">Selecione a Data de Resgate / Vencimento no Calendário *</span>
                  <input
                    type="date"
                    min={todayStr}
                    value={customDueDate}
                    onChange={(e) => setCustomDueDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold font-mono"
                  />
                  
                  {customDueDate && (
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-550 pt-2 border-t border-indigo-150/20">
                      <div>
                        QAUNTIDADE DE DIAS: <strong className="text-slate-850 dark:text-white">{activeDays} dias</strong>
                      </div>
                      <div>
                        EQUIVALENTE EM MESES: <strong className="text-slate-850 dark:text-white">{activeMonths} meses</strong>
                      </div>
                      <div className="col-span-2 text-indigo-650 dark:text-indigo-300 font-bold font-sans text-[10.5px]">
                        ✓ DATA FINAL DO CONTRATO: {displayDueDateStr}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Real-time Dynamic Math breakdown calculations card */}
              {parsedPrincipal > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-50/25 dark:from-indigo-950/15 dark:to-slate-900 p-5 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 space-y-3">
                  <h5 className="font-display font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <Coins size={14} className="animate-pulse" />
                    Plano de Pagamento Estimado ({paymentFrequency})
                  </h5>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-750 dark:text-slate-350">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Capital Mutuado</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[12.5px]">
                        {parsedPrincipal.toLocaleString()} MZN
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Juros Acumulados ({parsedRate}%/mês)</span>
                      <span className="font-mono font-bold text-emerald-600 text-[12.5px]">
                        +{totalInterest.toLocaleString()} MZN
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Valor Consolidado</span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 text-[12.5px]">
                        {totalDue.toLocaleString()} MZN
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Duração e Resgate</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase border dark:border-slate-700">
                        {displayDueDateStr} ({activeDays}d)
                      </span>
                    </div>
                  </div>

                  <div className="text-[10.5px] text-slate-405 italic font-mono pt-1.5 border-t border-indigo-100/10 flex items-center justify-between">
                    <span>Ativo por {activeMonths} meses em {parsedTermMonthsForInstallment} {parsedTermMonthsForInstallment === 1 ? 'reembolso mensal' : 'reembolsos mensais'}.</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-150 px-2 py-0.5 rounded-lg">Prestação: {installmentAmount.toLocaleString()} MZN / mês</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 4: REMESSA E EMISSÃO CONTRATO */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-display font-extrabold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                  Passo 4: Revisão Jurídica e Emissão do Contrato
                </h4>
                <span className="text-[9px] bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-lg border border-green-200/50 font-bold uppercase tracking-wider">
                  Pronto a Operar
                </span>
              </div>

              {/* Comprehensive Summary Cards */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border rounded-2xl space-y-4 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">Identificação Civil</span>
                  <span className="font-mono text-[9px] font-bold text-slate-400">STATUS: CADASTRADO</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3.5 text-[11px]">
                  <div>
                    Nome Mutuário: <strong className="text-slate-950 dark:text-white block">{fullName}</strong>
                  </div>
                  <div>
                    BI / Passaporte: <strong className="text-slate-950 dark:text-white font-mono block">{idPassport}</strong>
                  </div>
                  <div>
                    Contacto: <strong className="text-slate-950 dark:text-white font-mono block">{phone}</strong>
                  </div>
                  <div>
                    Residência: <strong className="text-slate-950 dark:text-white block">{address}</strong>
                  </div>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pt-2 pb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">Anexos e Avaliação de Penhora</span>
                  <span className="font-mono text-[9px] font-bold text-indigo-600">✓ ADJUDICADA</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-50 dark:bg-indigo-950 border text-[9.5px] px-2.5 py-1 rounded-lg font-bold font-mono text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <FileCheck size={12} />
                      Documento BI / Passaporte Verificado
                    </span>
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 border text-[9.5px] px-2.5 py-1 rounded-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {guaranteePhotos.length} Imagem(ns) de Garantia Gravadas
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-xl font-mono text-[10px] text-slate-650 leading-relaxed">
                    <p className="font-sans font-bold text-[9.5px] text-slate-400 mb-1 uppercase">Descrição da Penhora:</p>
                    {guaranteeDescription}
                    <div className="mt-2.5 border-t border-dashed pt-2.5 flex items-center justify-between font-sans">
                      <span className="text-slate-400 text-[10.5px]">Valor da Garantia Declarada:</span>
                      <strong className="text-[12.5px] text-indigo-650 font-bold font-mono">{getFormattedMZN(guaranteeEstimatedValue)}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pt-2 pb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">Projeção Financeira do Contrato</span>
                  <span className="font-mono text-[9px] font-bold text-slate-400">VALOR NOMINAL</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono leading-relaxed bg-white dark:bg-slate-900 border p-3 rounded-xl">
                  <div>
                    Capital: <strong>{parsedPrincipal.toLocaleString()} MZN</strong>
                  </div>
                  <div>
                    Taxa Juros: <strong>{parsedRate}% ao mês</strong>
                  </div>
                  <div>
                    Total Juros: <strong className="text-emerald-600">+{totalInterest.toLocaleString()} MZN</strong>
                  </div>
                  <div>
                    Vencimentos em: <strong>{displayDueDateStr} ({activeDays} dias)</strong>
                  </div>
                  <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-[11.5px] text-indigo-650 font-sans font-bold flex justify-between">
                    <span>Reembolso Consolidado:</span>
                    <span>{totalDue.toLocaleString()} MZN</span>
                  </div>
                </div>
              </div>

              {/* Informational digital seal and reference card */}
              <div className="p-3.5 bg-blue-500/5 text-blue-800 dark:text-blue-300 rounded-2xl border border-blue-200/30 dark:border-indigo-900 flex gap-3 text-[10.5px] leading-relaxed">
                <ShieldCheck size={20} className="shrink-0 text-blue-600" />
                <div>
                  <strong>Aviso de Adesão Contratual Extrajudicial:</strong>
                  <p className="mt-0.5">
                    Este contrato de microcrédito possui valor de título extrajudicial certo e exigível. No âmbito desta emissão, o documento de identificação civil BI do mutuário e as imagens de garantias correspondentes são anexadas expressamente na ata executiva do contrato.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Navigation/Controls Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={handleBackStep}
                className="bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer transition text-xs border border-slate-250 flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                Voltar
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition text-xs border"
            >
              Cancelar
            </button>

            {activeStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-lg transition flex items-center gap-1.5 text-xs"
              >
                Seguinte
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-6 py-2.5 rounded-xl cursor-pointer shadow-lg transition flex items-center gap-2 text-xs"
              >
                {isSubmitting ? (
                  <span>A emitir contrato...</span>
                ) : (
                  <>
                    <CheckSquare size={13} />
                    Emitir Contrato & Concluir
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
