import React, { useState, useEffect, useRef } from "react";
import { User, Client, Loan, ActivityLog, SystemSettings, LoanPayment, Company } from "./types";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ClientsView from "./components/ClientsView";
import LoansView from "./components/LoansView";
import UsersView from "./components/UsersView";
import SettingsView from "./components/SettingsView";
import CompaniesView from "./components/CompaniesView";
import AIParty from "./components/AIParty";
import ReportCreator from "./components/ReportCreator";
import QuickGrantLoanModal from "./components/QuickGrantLoanModal";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  Lock,
  Phone,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Building,
  Menu
} from "lucide-react";

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [isRecoverMode, setIsRecoverMode] = useState(false);
  const [currentTab, setCurrentTab] = useState("dashboard");

  // Domain Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [capital, setCapital] = useState<{
    initialBalance: number;
    currentBalance: number;
    capitalHistory: Array<{
      id: string;
      date: string;
      type: 'INITIAL' | 'REINFORCEMENT' | 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT';
      amount: number;
      description: string;
      userFullName: string;
    }>;
  }>({
    initialBalance: 0,
    currentBalance: 0,
    capitalHistory: []
  });

  // UI Theme & Notification State
  const [isDark, setIsDark] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; type: "success" | "alert" | "info"; timestamp: string }>
  >([
    {
      id: "n-1",
      title: "Sinal de Liquidez Estável",
      type: "success",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const notifiedLoanIds = useRef<Set<string>>(new Set());

  // AI analysis state
  const [creditAnalysisResult, setCreditAnalysisResult] = useState<string | null>(null);
  const [selectedClientForRisk, setSelectedClientForRisk] = useState<Client | null>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

  // Quick Grant Loan Modal state
  const [isQuickGrantOpen, setIsQuickGrantOpen] = useState(false);

  // Printable Report PrevState
  const [activeReport, setActiveReport] = useState<{
    type: "CONTRACT" | "RECEIPT" | "DAILY_REPORT" | "MONTHLY_REPORT" | "OVERDUE_CLIENTS" | "CLIENT_STATEMENT";
    data: any;
  } | null>(null);

  // Active Preview Attachment state
  const [activePreviewAttachment, setActivePreviewAttachment] = useState<{ url: string; title: string } | null>(null);

  // Login Form Controllers
  const [loginPhone, setLoginPhone] = useState("+258 ");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginCompanyId, setLoginCompanyId] = useState("");
  const [loginError, setLoginError] = useState("");

  // Recover form State
  const [recoverPhone, setRecoverPhone] = useState("+258 ");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [recoverSuccess, setRecoverSuccess] = useState("");

  // Restore session from cache
  useEffect(() => {
    const cachedUser = sessionStorage.getItem("meticalcred_user");
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        setCurrentUser(u);
        setActiveCompanyId(u.companyId || "com-1");
      } catch (e) {
        sessionStorage.removeItem("meticalcred_user");
      }
    }
  }, []);

  // Fetch public companies at startup for login selection
  useEffect(() => {
    const loadPublicCompanies = async () => {
      try {
        const res = await fetch("/api/auth/companies");
        if (res.ok) {
          const comps = await res.json();
          setCompanies(comps);
          if (comps.length > 0) {
            const defaultC = comps.find((c: any) => c.id === "com-1") || comps[0];
            setLoginCompanyId(defaultC.id);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar empresas para login", err);
      }
    };
    loadPublicCompanies();
  }, []);

  // Fetch all domain data if user logged in
  const syncData = async () => {
    if (!currentUser) return;
    try {
      const headers: Record<string, string> = { "x-user-id": currentUser.id };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }
      
      const [clientsRes, loansRes, usersRes, logsRes, settingsRes, capitalRes] = await Promise.all([
        fetch("/api/clients", { headers }),
        fetch("/api/loans", { headers }),
        fetch("/api/users", { headers }),
        fetch("/api/logs", { headers }),
        fetch("/api/settings", { headers }),
        fetch("/api/companies/capital", { headers }),
      ]);

      const [cData, lData, uData, loData, sData, capData] = await Promise.all([
        clientsRes.json(),
        loansRes.json(),
        usersRes.json(),
        logsRes.json(),
        settingsRes.json(),
        capitalRes.json(),
      ]);

      setClients(cData);
      setLoans(lData);
      setUsers(uData);
      setLogs(loData);
      setSettings(sData);
      if (capData && !capData.error) {
        setCapital(capData);
      }

      // Notify Master or Admin of new pending loan requests AND credits due in exactly 5 days
      if (currentUser && (currentUser.role === "MASTER_USER" || currentUser.role === "SUPER_ADMIN")) {
        // 1. Pending approval requests
        const pendingList = (lData || []).filter((l: any) => l.status === "PENDING");
        pendingList.forEach((loan: any) => {
          if (!notifiedLoanIds.current.has(loan.id)) {
            notifiedLoanIds.current.add(loan.id);
            pushNotification(
              `Aprovação Pendente: Ref ${loan.id} - Cliente: ${loan.clientName} (Valor: ${loan.principalAmount.toLocaleString("pt-MZ")} MZN).`,
              "alert"
            );
          }
        });

        // 2. Credits with exactly 5 days before due date
        const activeList = (lData || []).filter((l: any) => l.status === "ACTIVE");
        activeList.forEach((loan: any) => {
          if (loan.dueDate) {
            const dueDateObj = new Date(loan.dueDate + "T00:00:00");
            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);
            const diffTime = dueDateObj.getTime() - todayObj.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 5) {
              const notifKey = `${loan.id}-due-5days`;
              if (!notifiedLoanIds.current.has(notifKey)) {
                notifiedLoanIds.current.add(notifKey);
                pushNotification(
                  `Alerta de Vencimento (5 Dias): Ref ${loan.id} vence em ${new Date(loan.dueDate).toLocaleDateString("pt-MZ")} - Cliente: ${loan.clientName}.`,
                  "alert"
                );
              }
            }
          }
        });
      }

      // Super Admins fetch the registered company list
      if (currentUser.role === "SUPER_ADMIN") {
        const compRes = await fetch("/api/companies", { headers });
        if (compRes.ok) {
          const comps = await compRes.json();
          setCompanies(comps);
        }
      }
    } catch (err) {
      console.error("Sincronização falhou", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      syncData();
      const interval = setInterval(syncData, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [currentUser, activeCompanyId]);

  // Idle timeout check - Automatically redirects to login after 15 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        pushNotification("Sessão terminada após 15 minutos de inatividade por razões de segurança.", "info");
        handleLogout();
      }, 15 * 60 * 1000); // 15 minutes
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Initialize with a fresh timer
    resetTimer();

    // Attach interaction listeners to the window
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser?.id]);

  // Alert Handler
  const pushNotification = (title: string, type: "success" | "alert" | "info" = "info") => {
    setNotifications((prev) => [
      { id: "n-" + Date.now(), title, type, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  };

  // 1. Auth Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginCompanyId) {
      setLoginError("Deve selecionar uma empresa para efetuar o login.");
      return;
    }

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword, companyId: loginCompanyId }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || "Código, Palavra-passe ou empresa incorretos.");
        return;
      }

      sessionStorage.setItem("meticalcred_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setActiveCompanyId(data.user.companyId || "com-1");
      pushNotification(`Bem-vindo, ${data.user.fullName}!`, "success");
    } catch (err) {
      setLoginError("Erro na conexão ao servidor local.");
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverSuccess("");
    setLoginError("");

    try {
      const resp = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: recoverPhone, newPassword: recoverPassword }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || "Operação inválida.");
        return;
      }

      setRecoverSuccess("Senha redefinida com sucesso! Prossiga com o login.");
      setIsRecoverMode(false);
    } catch (err) {
      setLoginError("Erro ao contactar o servidor de recuperação.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("meticalcred_user");
    setCurrentUser(null);
    setCurrentTab("dashboard");
    setCreditAnalysisResult(null);
    setSelectedClientForRisk(null);
  };

  // Company Capital Handlers
  const handleUpdateCapital = async (amount: number, type: "INITIAL" | "REINFORCEMENT", description: string) => {
    try {
      if (!currentUser) return false;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }
      const res = await fetch("/api/companies/capital", {
        method: "POST",
        headers,
        body: JSON.stringify({ amount, type, description })
      });
      if (res.ok) {
        const data = await res.json();
        setCapital(data);
        syncData(); // refresh operations & logs
        pushNotification(`Capital atualizado com sucesso: +${amount.toLocaleString("pt-MZ")} MZN`, "success");
        return true;
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao atualizar capital.");
        return false;
      }
    } catch (e) {
      console.error(e);
      alert("Erro na conexão com o servidor.");
      return false;
    }
  };

  const handleEditCapital = async (id: string, amount: number, type: "INITIAL" | "REINFORCEMENT", description: string) => {
    try {
      if (!currentUser) return false;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }
      const res = await fetch(`/api/companies/capital/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ amount, type, description })
      });
      if (res.ok) {
        const data = await res.json();
        setCapital(data);
        syncData();
        pushNotification("Registo de caixa atualizado com sucesso.", "success");
        return true;
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao editar capital.");
        return false;
      }
    } catch (err) {
      alert("Erro ao conectar ao servidor.");
      return false;
    }
  };

  const handleDeleteCapital = async (id: string) => {
    try {
      if (!currentUser) return false;
      const headers: Record<string, string> = {
        "x-user-id": currentUser.id,
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }
      const res = await fetch(`/api/companies/capital/${id}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setCapital(data);
        syncData();
        pushNotification("Registo de caixa de tesouraria eliminado com sucesso.", "success");
        return true;
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao excluir capital.");
        return false;
      }
    } catch (err) {
      alert("Erro ao conectar ao servidor.");
      return false;
    }
  };

  // 2. Client Handlers
  const handleSaveClient = async (clientData: Partial<Client>) => {
    if (!currentUser) return;
    try {
      const method = clientData.id ? "PUT" : "POST";
      const url = clientData.id ? `/api/clients/${clientData.id}` : "/api/clients";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }

      const resp = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(clientData),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Erro ao salvar cliente.");
        return;
      }

      syncData();
      pushNotification(
        clientData.id ? "Perfil do cliente atualizado com sucesso." : "Novo cliente adicionado com sucesso.",
        "success"
      );
    } catch (err) {
      alert("Falha de comunicação.");
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("Pretende realmente remover este cliente do sistema? Esta ação é irreversível.")) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        "x-user-id": currentUser.id,
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }

      const resp = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Erro de validação de remoção.");
        return;
      }

      syncData();
      pushNotification("Cliente removido com sucesso.", "success");
    } catch (err) {
      alert("Erro ao contatar servidor.");
    }
  };

  // 3. User Handlers
  const handleSaveUser = async (userData: Partial<User> & { password?: string }) => {
    if (!currentUser) return;
    try {
      const isEdit = !!userData.id;
      const url = isEdit ? `/api/users/${userData.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }

      const resp = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(userData),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error);
        return;
      }

      syncData();
      pushNotification(
        isEdit ? "Utilizador modificado com sucesso." : "Novo utilizador adicionado com sucesso.",
        "success"
      );
    } catch (err) {
      alert("Falha de rede.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("Pretende eliminar este operador de acesso? Suas capacidades de login serão revogadas.")) {
      return;
    }

    try {
      const headers: Record<string, string> = { 
        "x-user-id": currentUser.id 
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }

      const resp = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error);
        return;
      }

      syncData();
      pushNotification("Utilizador operacional removido.", "info");
    } catch (err) {
      alert("Falha ao comunicar com base de dados.");
    }
  };

  // 4. Loan Handlers
  const handleCreateLoan = async (loanData: Partial<Loan> & { newClientData?: any }) => {
    if (!currentUser) return;
    try {
      let finalClientId = loanData.clientId;

      if (loanData.newClientData) {
        if (loanData.newClientData.existingClientId) {
          finalClientId = loanData.newClientData.existingClientId;
        } else {
          // 1. Create client first
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "x-user-id": currentUser.id,
          };
          if (activeCompanyId) {
            headers["x-company-id"] = activeCompanyId;
          }

          const clientResp = await fetch("/api/clients", {
            method: "POST",
            headers,
            body: JSON.stringify(loanData.newClientData),
          });

          const clientResult = await clientResp.json();
          if (!clientResp.ok) {
            alert(clientResult.error || "Erro ao registar novo cliente.");
            return;
          }
          finalClientId = clientResult.id;
        }
      }

      // 2. Create the loan using finalClientId
      const { newClientData, ...cleanLoanData } = loanData;
      const loanPayload = {
        ...cleanLoanData,
        clientId: finalClientId,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": currentUser.id,
      };
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }

      const resp = await fetch("/api/loans", {
        method: "POST",
        headers,
        body: JSON.stringify(loanPayload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error);
        return;
      }

      syncData();
      pushNotification(
        loanData.newClientData
          ? "Cliente cadastrado & Empréstimo submetido! Aguarda aprovação do Master."
          : "Novo contrato de microcrédito submetido. Aguarda aprovação do Master.",
        "success"
      );
    } catch (err) {
      alert("Erro na conexão.");
    }
  };

  const handleRegisterClientAndGrantLoan = async (clientData: any, loanData: any) => {
    // Left for backwards compatibility, but redirecting to generalized handleCreateLoan
    await handleCreateLoan({
      ...loanData,
      newClientData: clientData
    });
  };

  const handleRecordPayment = async (
    loanId: string,
    paymentData: { amount: number; penaltyPaid: number; paymentMethod: string }
  ) => {
    if (!currentUser) return;
    try {
      const resp = await fetch(`/api/loans/${loanId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error);
        return;
      }

      syncData();
      pushNotification(
        `Pagamento de ${paymentData.amount.toLocaleString()} MZN homologado no caixa.`,
        "success"
      );

      // Instantly open details modal for printed receipt
      if (data.loan && data.payment && settings) {
        setActiveReport({
          type: "RECEIPT",
          data: {
            loan: data.loan,
            payment: data.payment,
            settings,
            userFullName: currentUser.fullName,
          },
        });
      }
    } catch (err) {
      alert("Falha de envio.");
    }
  };

  const handleUpdateLoanStatus = async (loanId: string, status: Loan["status"]) => {
    if (!currentUser) return;
    try {
      const resp = await fetch(`/api/loans/${loanId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({ status }),
      });

      if (!resp.ok) {
        const d = await resp.json();
        alert(d.error);
        return;
      }

      syncData();
      pushNotification(`Crédito de referência ${loanId} classificado como ${status}.`, "info");
    } catch (err) {
      alert("Falha na atualização física do contrato.");
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!currentUser) return;
    if (!window.confirm("Pretende reverter e deletar permanentemente este empréstimo do livro de caixa?")) {
      return;
    }

    try {
      const resp = await fetch(`/api/loans/${loanId}`, {
        method: "DELETE",
        headers: { "x-user-id": currentUser.id },
      });

      if (!resp.ok) {
        const d = await resp.json();
        alert(d.error);
        return;
      }

      syncData();
      pushNotification("Empréstimo revertido.", "info");
    } catch (err) {
      alert("Falha operacional.");
    }
  };

  // 5. Configs Handlers
  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (!currentUser) return;
    try {
      const resp = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify(newSettings),
      });

      if (!resp.ok) {
        const d = await resp.json();
        alert(d.error);
        return;
      }

      syncData();
      pushNotification("Configurações monetárias institucionais consolidadas.", "success");
    } catch (err) {
      alert("Falha de rede.");
    }
  };

  const handleSaveCompany = async (companyData: any): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const resp = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify(companyData),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Falha ao registrar empresa.");
        return false;
      }

      pushNotification(`Empresa ${companyData.name} cadastrada com gestor ${companyData.managerName}.`, "success");
      syncData();
      return true;
    } catch (err) {
      alert("Falha de comunicação com o servidor.");
      return false;
    }
  };

  const handleUpdateCompany = async (id: string, updatedFields: any) => {
    if (!currentUser) return;
    try {
      const resp = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify(updatedFields),
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Erro ao editar empresa.");
        return;
      }

      pushNotification("Empresa atualizada com sucesso.", "success");
      syncData();
    } catch (err) {
      alert("Falha ao atualizar.");
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("Pretende realmente eliminar esta empresa e todos os seus dados associados? Esta acção é perigosa e irreversível!")) {
      return;
    }

    try {
      const resp = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": currentUser.id,
        },
      });

      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Erro ao remover empresa.");
        return;
      }

      pushNotification("Empresa e dados liquidados.", "info");
      
      if (activeCompanyId === id) {
        setActiveCompanyId("com-1");
      }

      syncData();
    } catch (err) {
      alert("Erro na conexão.");
    }
  };

  const handleRestoreBackup = async (backupData: any): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const resp = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({ backupData }),
      });

      if (!resp.ok) return false;

      syncData();
      pushNotification("Base de dados restaurada cópia homologada.", "success");
      return true;
    } catch (err) {
      return false;
    }
  };

  // 6. Gemini Core Risk Assessment Wrapper
  const handlePerformRiskAI = async (client: Client, requestedPrincipal: number) => {
    if (!currentUser) return;
    setCreditAnalysisResult(null);
    setSelectedClientForRisk(client);
    setIsGeneratingAnalysis(true);
    setCurrentTab("ai-analyst"); // Switch automatically!

    try {
      const resp = await fetch("/api/ai/credit-risk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify({ client, loanPrincipal: requestedPrincipal }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setCreditAnalysisResult("Não possuível gerar o parecer automático da IA no momento devido a constrangimento de ligação.");
        return;
      }

      setCreditAnalysisResult(data.analysis);
      pushNotification(`Parecer de crédito gerado de forma segura para ${client.fullName}.`, "success");
    } catch (err) {
      setCreditAnalysisResult("Falta de resposta de rede do canal do modelo.");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  // Printable Report Modals Triggers
  const handleTriggerQuickReport = (
    type: "DAILY_REPORT" | "MONTHLY_REPORT" | "OVERDUE_CLIENTS"
  ) => {
    if (!currentUser || !settings) return;
    setActiveReport({
      type,
      data: {
        loansList: loans,
        clientsList: clients,
        settings,
        userFullName: currentUser.fullName,
      },
    });
  };

  const renderCurrentTab = () => {
    if (!settings) return null;
    switch (currentTab) {
      case "dashboard":
        return (
          <DashboardView
            loans={loans}
            clients={clients}
            logs={logs}
            settings={settings}
            onQuickReport={handleTriggerQuickReport}
            onGrantLoan={() => setIsQuickGrantOpen(true)}
            capital={capital}
            onUpdateCapital={handleUpdateCapital}
            onEditCapital={handleEditCapital}
            onDeleteCapital={handleDeleteCapital}
            currentUser={currentUser!}
          />
        );
      case "clients":
        return (
          <ClientsView
            clients={clients}
            loans={loans}
            currentUser={currentUser!}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onTriggerAI={handlePerformRiskAI}
            isCustomReportTrigger={(client) => {}}
            onPreviewAttachment={(url, title) => setActivePreviewAttachment({ url, title })}
            onShowStatement={(client, start, end) => {
              setActiveReport({
                type: "CLIENT_STATEMENT",
                data: {
                  client,
                  loansList: loans,
                  statementStartDate: start,
                  statementEndDate: end,
                  settings,
                  userFullName: currentUser!.fullName
                }
              });
            }}
          />
        );
      case "loans":
        return (
          <LoansView
            loans={loans}
            clients={clients}
            currentUser={currentUser!}
            settings={settings}
            onCreateLoan={handleCreateLoan}
            onRecordPayment={handleRecordPayment}
            onUpdateLoanStatus={handleUpdateLoanStatus}
            onDeleteLoan={handleDeleteLoan}
            onPreviewAttachment={(url, title) => setActivePreviewAttachment({ url, title })}
            onShowReceipt={(l, p) => {
              setActiveReport({
                type: "RECEIPT",
                data: { loan: l, payment: p, settings, userFullName: currentUser!.fullName },
              });
            }}
            onShowContract={(l, c) => {
              setActiveReport({
                type: "CONTRACT",
                data: { loan: l, client: c, settings, userFullName: currentUser!.fullName },
              });
            }}
          />
        );
      case "ai-analyst": {
        const hasPremium = currentUser!.role === "SUPER_ADMIN" || settings?.plan === "PREMIUM";
        if (!hasPremium) {
          return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-xl max-w-xl mx-auto space-y-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/50 dark:border-amber-900 flex items-center justify-center text-xl font-bold font-display">★</div>
              <h3 className="font-display font-extrabold text-base text-slate-950 dark:text-white uppercase tracking-tight">Analista Inteligente Bloqueado</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Este recurso avançado de Inteligência de Crédito requer acesso ao plano <strong>Premium</strong> do CredFlow. Contacte o suporte ou o Admin para efetuar o upgrade.
              </p>
            </div>
          );
        }
        return (
          <AIParty
            creditAnalysisResult={creditAnalysisResult}
            selectedClientForRisk={selectedClientForRisk}
            isGeneratingAnalysis={isGeneratingAnalysis}
            onClearAnalysis={() => {
              setCreditAnalysisResult(null);
              setSelectedClientForRisk(null);
            }}
          />
        );
      }
      case "companies":
        return currentUser!.role === "SUPER_ADMIN" ? (
          <CompaniesView
            companies={companies}
            onSaveCompany={handleSaveCompany}
            onDeleteCompany={handleDeleteCompany}
            onUpdateCompany={handleUpdateCompany}
            currentUser={currentUser!}
          />
        ) : null;
      case "users": {
        const hasProOrPremium = currentUser!.role === "SUPER_ADMIN" || settings?.plan === "PRO" || settings?.plan === "PREMIUM";
        if (!hasProOrPremium) {
          return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-xl max-w-xl mx-auto space-y-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-200/50 dark:border-indigo-900 flex items-center justify-center text-xl font-bold font-display">⚙</div>
              <h3 className="font-display font-extrabold text-base text-slate-950 dark:text-white uppercase tracking-tight">Gestão de Utilizadores Bloqueado</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                A gestão e adição de múltiplos utilizadores requer acesso ao plano <strong>Pro</strong> ou superior. Efetue o upgrade do CredFlow para continuar.
              </p>
            </div>
          );
        }
        return (
          <UsersView
            users={users}
            currentUser={currentUser!}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            companies={companies}
            activeCompanyId={activeCompanyId}
            setActiveCompanyId={setActiveCompanyId}
          />
        );
      }
      case "settings": {
        const hasProOrPremium = currentUser!.role === "SUPER_ADMIN" || settings?.plan === "PRO" || settings?.plan === "PREMIUM";
        if (!hasProOrPremium) {
          return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-xl max-w-xl mx-auto space-y-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-200/50 dark:border-indigo-900 flex items-center justify-center text-xl font-bold font-display">⚙</div>
              <h3 className="font-display font-extrabold text-base text-slate-950 dark:text-white uppercase tracking-tight">Definições Bloqueadas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                As Definições avançadas do mercado requerem acesso ao plano <strong>Pro</strong> ou superior do CredFlow.
              </p>
            </div>
          );
        }
        return (
          <SettingsView
            settings={settings}
            currentUser={currentUser!}
            onUpdateSettings={handleUpdateSettings}
            onRestoreBackup={handleRestoreBackup}
          />
        );
      }
      default:
        return null;
    }
  };

  // RENDER SECURITY GATES (LOGIN PAGE)
  if (!currentUser) {
    return (
      <div className={`min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 md:p-8 relative font-sans select-none overflow-hidden ${isDark ? "dark" : ""}`}>
        {/* Aesthetic glowing background spots */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none opacity-60"></div>
        <div className="absolute -bottom-40 -left-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-70"></div>

        {/* Outer container: Split-pane layout on desktop, clean single-card on mobile */}
        <div className="w-full max-w-4xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-12 transition-all duration-300">
          
          {/* LEFT PANEL: Branding & CredFlow S.A. context (Desktop-only) */}
          <div className="hidden md:flex md:col-span-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-10 flex-col justify-between border-r border-slate-850 relative">
            {/* Subtle light streak */}
            <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent"></div>
            
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-display font-black text-xl shadow-lg shadow-indigo-600/30">
                  C
                </div>
                <div>
                  <h1 className="font-display font-black text-md tracking-tight text-white leading-none">
                    CredFlow S.A.
                  </h1>
                  <span className="text-[9px] tracking-widest font-mono text-indigo-400 font-extrabold uppercase mt-1 block">
                    Fintech Regional
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="font-display font-bold text-lg text-slate-100 tracking-tight leading-snug">
                  Plataforma Unificada de Microfinanças
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Gerencie concessões, planos de reembolso, simulações de risco de crédito com inteligência artificial e emita faturas e contratos em PDF a partir de um único motor centralizado.
                </p>
              </div>

              {/* Minimalist tactical features listing */}
              <div className="space-y-3.5 pt-4">
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 h-3.5 w-3.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-bold text-slate-200">Segurança Multi-Tenancy</h4>
                    <p className="text-[10px] text-slate-500">Acesso seguro por operador ligado diretamente ao cadastro.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-1 h-3.5 w-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-bold text-slate-200">Motor de PDF Único</h4>
                    <p className="text-[10px] text-slate-500">Contratos, recibos e extratos 100% autênticos e consistentes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-1 h-3.5 w-3.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-bold text-slate-200">Auditabilidade MZN</h4>
                    <p className="text-[10px] text-slate-500">Histórico fiscal e balancetes parametrizados.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-mono text-slate-550 block uppercase tracking-wide">
                Desenvolvimento Legalizado
              </span>
              <p className="text-[10px] text-slate-500 font-sans">
                Licença Regulamentada Nº 204. Registado para operações financeiras locais em Moçambique.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: Form inputs */}
          <div className="col-span-1 md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            
            {/* Mobile Header branding block (Hidden on md+) */}
            <div className="flex flex-col items-center mb-8 md:hidden">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-display font-black text-xl shadow-lg shadow-indigo-600/20 mb-3">
                C
              </div>
              <h2 className="font-display font-bold text-lg text-white">
                CredFlow S.A.
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-mono">
                Portal do Colaborador (Moçambique)
              </p>
            </div>

            {/* Title / Description */}
            <div className="mb-6 hidden md:block">
              <h2 className="font-display font-black text-2xl tracking-tight text-white mb-1.5">
                {!isRecoverMode ? "Aceder ao Portal" : "Recuperar Credenciais"}
              </h2>
              <p className="text-xs text-slate-400">
                {!isRecoverMode 
                  ? "Introduza os dados corporativos fornecidos pelo administrador." 
                  : "Por favor, introduza o seu número de acesso cadastrado."}
              </p>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-4 rounded-xl text-xs mb-5 flex items-start gap-2.5 animate-fade-in">
                <AlertTriangle size={15} className="mt-0.5 text-rose-500 flex-shrink-0" />
                <div className="space-y-0.5">
                  <h4 className="font-bold">Falha na Autenticação</h4>
                  <p className="text-slate-400 leading-tight">{loginError}</p>
                </div>
              </div>
            )}

            {recoverSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs mb-5 flex items-start gap-2.5 animate-fade-in">
                <CheckCircle size={15} className="mt-0.5 text-emerald-500 flex-shrink-0" />
                <div className="space-y-0.5">
                  <h4 className="font-bold">Redefinição do Sistema Concluída</h4>
                  <p className="text-slate-400 leading-tight">{recoverSuccess}</p>
                </div>
              </div>
            )}

            {!isRecoverMode ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-1.5 font-mono">
                    Empresa Autorizada *
                  </label>
                  <div className="relative flex items-center">
                    <Building size={14} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                    <select
                      required
                      value={loginCompanyId}
                      onChange={(e) => setLoginCompanyId(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 py-3 pl-11 pr-10 rounded-xl text-xs text-slate-100 outline-none transition cursor-pointer font-sans appearance-none select-none"
                    >
                      <option value="" disabled className="text-slate-500">Selecionar Empresa...</option>
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id} className="bg-slate-900 text-slate-200">
                          {comp.name} {comp.nuit ? `(${comp.nuit})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-1.5 font-mono">
                    Contacto Telefónico de Acesso *
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={14} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 py-3 pl-11 pr-4 rounded-xl text-xs text-slate-100 outline-none transition font-mono placeholder-slate-700"
                      placeholder="+258 84 123 4567"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] tracking-wider uppercase font-bold text-slate-400 font-mono">
                      Palavra-passe de Segurança *
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <Lock size={14} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 py-3 pl-11 pr-4 rounded-xl text-xs text-slate-100 outline-none transition placeholder-slate-700 font-sans"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-650/15 flex items-center justify-center gap-2"
                  >
                    <span>Iniciar Sessão Segura</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRecoverSubmit} className="space-y-4">
                <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 mb-2">
                  Selecione o número de telefone correspondente ao operador cadastrado para definir uma nova Palavra-passe de login com efeito de restauro.
                </div>

                <div>
                  <label className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-1.5 font-mono">
                    Contacto de Telefone da Conta *
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={14} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={recoverPhone}
                      onChange={(e) => setRecoverPhone(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 py-3 pl-11 pr-4 rounded-xl text-xs text-slate-100 outline-none transition font-mono"
                      placeholder="+258 "
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-1.5 font-mono">
                    Definir Nova Palavra-passe *
                  </label>
                  <div className="relative flex items-center">
                    <Lock size={14} className="absolute left-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={recoverPassword}
                      onChange={(e) => setRecoverPassword(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 py-3 pl-11 pr-4 rounded-xl text-xs text-slate-100 outline-none transition font-sans"
                      placeholder="Nova palavra-passe de acesso"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setIsRecoverMode(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer hover:underline transition order-2 sm:order-1"
                  >
                    Voltar ao Login Seguro
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition cursor-pointer shadow order-1 sm:order-2"
                  >
                    Redefinir Palavra-passe
                  </button>
                </div>
              </form>
            )}

            <div className="border-t border-slate-850/60 pt-6 mt-8 flex flex-wrap justify-between gap-2 text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sistema Operacional SSL Ativo
              </span>
              <span>Meticais MZN</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  const renderPlanBadge = (plan: 'BASICO' | 'PRO' | 'PREMIUM' | undefined) => {
    if (!plan) return null;
    const planInfo = {
      BASICO: { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', text: 'Básico' },
      PRO: { bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900', text: 'Pro' },
      PREMIUM: { bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 font-extrabold', text: 'Premium ★' }
    };
    const current = planInfo[plan] || planInfo.BASICO;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${current.bg}`} title="Plano de Subscrição">
        {current.text}
      </span>
    );
  };

  // RENDER APP CORE IF LOGGED IN
  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 flex overflow-hidden font-sans ${isDark ? "dark" : ""}`}>
      {/* Dynamic sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isDark={isDark}
        setIsDark={setIsDark}
        companyPlan={settings?.plan}
        companyLogo={settings?.companyLogoUrl}
        isPinned={sidebarPinned}
        setIsPinned={setSidebarPinned}
        isMobileOpen={sidebarMobileOpen}
        setIsMobileOpen={setSidebarMobileOpen}
      />

      {/* Spacer to preserve sidebar sizing on desktop since sidebar is fixed */}
      <div className={`hidden lg:block h-screen transition-all duration-300 flex-shrink-0 ${sidebarPinned ? "w-72" : "w-20"}`} />

      {/* Mobile drawer click-away backdrop */}
      {sidebarMobileOpen && (
        <div
          onClick={() => setSidebarMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-35 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Main viewport canvas */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden selection:bg-indigo-500/10 select-none">
        
        {/* UPPER TITLE BAR PANEL */}
        <header className="h-16 border-b border-slate-200/60 dark:border-slate-850 px-8 flex items-center justify-between bg-white dark:bg-slate-900 no-print flex-shrink-0 z-10 shadow-sm animate-fade-in">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger menu/drawer toggle */}
              <button
                onClick={() => setSidebarMobileOpen(true)}
                type="button"
                className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-850 cursor-pointer"
                title="Abrir Menu"
              >
                <Menu size={20} />
              </button>

              {settings?.companyLogoUrl && (
                <img
                  src={settings.companyLogoUrl}
                  referrerPolicy="no-referrer"
                  alt="Logo"
                  className="w-7 h-7 object-contain bg-white rounded border border-slate-200 dark:border-slate-800"
                />
              )}
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {settings?.companyName || "CredFlow"}
              </span>
              {renderPlanBadge(settings?.plan)}
            </div>

            {currentUser.role === "SUPER_ADMIN" && companies.length > 0 && (
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-850 pl-6">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-450 font-bold block">
                  Empresa Ativa:
                </span>
                <div className="relative flex items-center">
                  <select
                    value={activeCompanyId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setActiveCompanyId(selId);
                      const compName = companies.find((c) => c.id === selId)?.name || "Matriz";
                      pushNotification(`A visualizar dados da empresa: ${compName}`, "info");
                    }}
                    className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-750 py-1.5 pl-3 pr-8 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-sans"
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} ({comp.nuit})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
                className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer relative"
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500"></span>
                )}
              </button>

              {/* Notification Slide drawer */}
              {showNotificationDrawer && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl z-30 space-y-3.5">
                  <div className="flex justify-between items-center border-b pb-2 font-display">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Notificações Claras</span>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-[9px] text-indigo-500 hover:text-indigo-700 font-mono font-semibold hover:underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {notifications.length > 0 ? (
                      notifications.map((not) => (
                        <div
                          key={not.id}
                          className="flex gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-950/40 border rounded-xl"
                        >
                          <div className="p-1 text-indigo-500 bg-indigo-50 rounded-lg h-fit">
                            <Info size={12} />
                          </div>
                          <div className="text-[11px] leading-relaxed">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{not.title}</p>
                            <span className="text-[9px] font-mono text-slate-400">
                              {new Date(not.timestamp).toLocaleTimeString("pt-MZ")}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10.5px] text-slate-400 block text-center py-4 italic">
                        Não existem alertas ativos no painel.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Micro Badge state */}
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
                  MZN Registado
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Canvas Content Scrolling viewport */}
        <section className="flex-1 overflow-y-auto p-8 bg-slate-100/40 dark:bg-slate-950/20">
          {renderCurrentTab()}
        </section>
      </main>

      {/* RENDER REPORT PRINT AGREEMENT PREVIEW */}
      {activeReport && (
        <ReportCreator
          type={activeReport.type}
          data={activeReport.data}
          onClose={() => setActiveReport(null)}
          onPreviewAttachment={(url, title) => setActivePreviewAttachment({ url, title })}
        />
      )}

      {/* QUICK GRANT LOAN MODAL */}
      {settings && (
        <QuickGrantLoanModal
          isOpen={isQuickGrantOpen}
          onClose={() => setIsQuickGrantOpen(false)}
          settings={settings}
          clients={clients}
          onConfirm={handleRegisterClientAndGrantLoan}
        />
      )}

      {/* ATTACHMENT PREVIEW MODAL */}
      {activePreviewAttachment && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-display uppercase tracking-wider">
                  📂 Visualizar Documento Anexo:
                </span>
                <span className="text-xs bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 font-mono px-2.5 py-0.5 rounded-full font-bold">
                  {activePreviewAttachment.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewAttachment(null)}
                className="w-8 h-8 rounded-full bg-slate-250 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 flex items-center justify-center font-bold text-sm select-none cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/20 flex flex-col items-center justify-center min-h-[350px]">
              {activePreviewAttachment.url ? (
                (() => {
                  const url = activePreviewAttachment.url;
                  const isPdf = url.startsWith("data:application/pdf") || url.toLowerCase().includes(".pdf") || url.startsWith("data:application/octet-stream");
                  
                  if (isPdf) {
                    return (
                      <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col bg-white">
                        <iframe
                          src={url}
                          title={activePreviewAttachment.title}
                          className="w-full h-full border-none"
                        />
                        <div className="p-3 bg-slate-55 dark:bg-slate-900 border-t border-slate-250 dark:border-slate-800 flex justify-center">
                          <a
                            href={url}
                            download={activePreviewAttachment.title.replace(/\s+/g, "_") + ".pdf"}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer"
                          >
                            📥 Descarregar Documento PDF
                          </a>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center max-w-full">
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md max-h-[60vh] overflow-auto flex items-center justify-center mb-4">
                          <img
                            src={url}
                            alt={activePreviewAttachment.title}
                            className="max-h-[55vh] max-w-full object-contain rounded-xl select-none"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex gap-3">
                          <a
                            href={url}
                            download={activePreviewAttachment.title.replace(/\s+/g, "_") + ".png"}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                          >
                            📥 Descarregar Imagem
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const win = window.open();
                              if (win) {
                                win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              } else {
                                alert("O seu browser impediu a abertura do novo tab. Utilize a opção de descarregar documento!");
                              }
                            }}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                          >
                            🔍 Abrir em Novo Tab
                          </button>
                        </div>
                      </div>
                    );
                  }
                })()
              ) : (
                <div className="text-center text-slate-500 py-12">
                  <span className="text-4xl block mb-2">⚠️</span>
                  Nenhum ficheiro ou imagem associada a este documento anexo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
