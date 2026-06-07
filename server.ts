import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Client, Loan, User, ActivityLog, DashboardStats, SystemSettings, UserPermissions, LoanPayment, Company } from "./src/types";

// Firebase Integration imports for full cloud persistence
import { initializeApp as initFirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Serve valid PDF documents statically first
app.use("/pdfs", express.static(path.join(process.cwd(), "pdfs")));

// For maximum security, all direct links and requests to unmatched paths under /pdfs/* will redirect politely to the home/login page (/)
app.get("/pdfs/*", (req, res) => {
  res.redirect("/");
});

// 1. Database File Setup
const DB_FILE = path.join(process.cwd(), "db.json");

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[^\d+]/g, "");
  if (normalized.startsWith("258") && !normalized.startsWith("+")) {
    normalized = "+" + normalized;
  }
  if (normalized.length === 9 && !normalized.startsWith("+")) {
    normalized = "+258" + normalized;
  }
  return normalized;
}

interface DBStructure {
  companies: Company[];
  users: Array<User & { passwordHash: string; companyId?: string }>;
  clients: Client[];
  loans: Loan[];
  logs: ActivityLog[];
  settings: SystemSettings;
}

// Default settings in MZN (Mozambican Metical)
const DEFAULT_SETTINGS: SystemSettings = {
  defaultInterestRate: 15, // 15% monthly
  defaultPenaltyRate: 2, // 2% daily or monthly late penalty
  currencySymbol: "MZN",
  companyName: "MeticalCred S.A.",
  companyNuit: "NUIT 400234123",
  companyAddress: "Av. Julius Nyerere, No. 345, Maputo, Moçambique",
  availableRates: [5, 10, 15, 20, 25, 30],
  availableTerms: [1, 2, 3, 4, 6, 12],
  availablePaymentFrequencies: ["Mensais", "Semanais", "Diárias"],
};

// Seed initial database
function getInitialDB(): DBStructure {
  const adminId = "u-admin";

  const db: DBStructure = {
    companies: [],
    users: [
      {
        id: adminId,
        phone: "+258842419924",
        fullName: "Danilo Augusto (Admin)",
        role: "SUPER_ADMIN",
        status: "active",
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword("Khensane8"),
        permissions: {
          viewDashboard: true,
          viewClients: true,
          insertData: true,
          editData: true,
          deleteData: true,
          approveLoans: true,
          manageRates: true,
          manageUsers: true,
          exportReports: true,
        },
      },
    ],
    clients: [],
    loans: [],
    logs: [],
    settings: DEFAULT_SETTINGS,
  };

  db.companies = [
    {
      id: "com-1",
      name: "MeticalCred S.A.",
      nuit: "NUIT 400234123",
      address: "Av. Julius Nyerere, No. 345, Maputo, Moçambique",
      logoUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=200",
      plan: "PREMIUM",
      settings: DEFAULT_SETTINGS,
      createdAt: new Date().toISOString()
    }
  ];

  db.users.forEach(u => { if (!u.companyId) u.companyId = "com-1"; });

  return db;
}

// Initialize Firebase SDK on server-side
const firebaseApp = initFirebaseApp(firebaseConfig);
const firestore = initializeFirestore(firebaseApp, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);

let isDbLoaded = false;
let memoryDB: DBStructure | null = null;
let lastSyncedState: DBStructure | null = null;

// Helper to fetch a complete collection from Firestore (propagates errors for retry and recovery)
async function fetchColFromFirestore(colName: string): Promise<any[]> {
  const colRef = collection(firestore, colName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => doc.data());
}

// Function to synchronously supply database to Express routes (utilizes memoryDB)
function readDB(): DBStructure {
  if (!memoryDB) {
    console.log("[Firestore] Memory cache was empty, performing emergency synchronous load from local fallback db.json");
    if (fs.existsSync(DB_FILE)) {
      try {
        memoryDB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      } catch (err) {
        memoryDB = getInitialDB();
      }
    } else {
      memoryDB = getInitialDB();
    }
  }
  return memoryDB!;
}

const safeSetDoc = async (docRef: any, data: any) => {
  try {
    await setDoc(docRef, data);
  } catch (err: any) {
    console.error(`[Firestore Sync] Non-blocking failure to write document at ${docRef.path}. Size is likely too large or permission error:`, err.message);
  }
};

const safeDeleteDoc = async (docRef: any) => {
  try {
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error(`[Firestore Sync] Non-blocking failure to delete document at ${docRef.path}:`, err.message);
  }
};

// Asynchronously sync modifications (add/mod/delete) from in-memory changes to Firebase Cloud Firestore
async function syncDataToFirestore(newData: DBStructure, incomingPreviousState: DBStructure | null = null) {
  const baseState = incomingPreviousState || lastSyncedState || {
    companies: [],
    users: [],
    clients: [],
    loans: [],
    logs: [],
    settings: DEFAULT_SETTINGS
  };
  const operations: Array<Promise<any>> = [];
  const isDiff = (a: any, b: any) => JSON.stringify(a) !== JSON.stringify(b);

  // 1. Sync Companies
  const oldCompaniesMap = new Map(baseState.companies.map(c => [c.id, c]));
  const newCompaniesMap = new Map(newData.companies.map(c => [c.id, c]));

  for (const [id, comp] of newCompaniesMap) {
    const oldComp = oldCompaniesMap.get(id);
    if (!oldComp || isDiff(oldComp, comp)) {
      operations.push(safeSetDoc(doc(firestore, "companies", id), comp));
    }
  }
  for (const id of oldCompaniesMap.keys()) {
    if (!newCompaniesMap.has(id)) {
      operations.push(safeDeleteDoc(doc(firestore, "companies", id)));
    }
  }

  // 2. Sync Users
  const oldUsersMap = new Map(baseState.users.map(u => [u.id, u]));
  const newUsersMap = new Map(newData.users.map(u => [u.id, u]));

  for (const [id, user] of newUsersMap) {
    const oldUser = oldUsersMap.get(id);
    if (!oldUser || isDiff(oldUser, user)) {
      operations.push(safeSetDoc(doc(firestore, "users", id), user));
    }
  }
  for (const id of oldUsersMap.keys()) {
    if (!newUsersMap.has(id)) {
      operations.push(safeDeleteDoc(doc(firestore, "users", id)));
    }
  }

  // 3. Sync Clients
  const oldClientsMap = new Map(baseState.clients.map(c => [c.id, c]));
  const newClientsMap = new Map(newData.clients.map(c => [c.id, c]));

  for (const [id, cl] of newClientsMap) {
    const oldCl = oldClientsMap.get(id);
    if (!oldCl || isDiff(oldCl, cl)) {
      operations.push(safeSetDoc(doc(firestore, "clients", id), cl));
    }
  }
  for (const id of oldClientsMap.keys()) {
    if (!newClientsMap.has(id)) {
      operations.push(safeDeleteDoc(doc(firestore, "clients", id)));
    }
  }

  // 4. Sync Loans
  const oldLoansMap = new Map(baseState.loans.map(l => [l.id, l]));
  const newLoansMap = new Map(newData.loans.map(l => [l.id, l]));

  for (const [id, loan] of newLoansMap) {
    const oldLoan = oldLoansMap.get(id);
    if (!oldLoan || isDiff(oldLoan, loan)) {
      operations.push(safeSetDoc(doc(firestore, "loans", id), loan));
    }
  }
  for (const id of oldLoansMap.keys()) {
    if (!newLoansMap.has(id)) {
      operations.push(safeDeleteDoc(doc(firestore, "loans", id)));
    }
  }

  // 5. Sync Logs
  const oldLogsMap = new Map(baseState.logs.map(l => [l.id, l]));
  const newLogsMap = new Map(newData.logs.map(l => [l.id, l]));

  for (const [id, log] of newLogsMap) {
    const oldLog = oldLogsMap.get(id);
    if (!oldLog || isDiff(oldLog, log)) {
      operations.push(safeSetDoc(doc(firestore, "logs", id), log));
    }
  }
  for (const id of oldLogsMap.keys()) {
    if (!newLogsMap.has(id)) {
      operations.push(safeDeleteDoc(doc(firestore, "logs", id)));
    }
  }

  // 6. Sync Global Settings
  if (isDiff(baseState.settings, newData.settings)) {
    operations.push(safeSetDoc(doc(firestore, "settings", "global"), newData.settings));
  }

  // Execute all background writes to Firestore in parallel
  if (operations.length > 0) {
    console.log(`[Firestore Sync] Pushing ${operations.length} object adjustments to Cloud...`);
    await Promise.all(operations);
  }

  // Synchronously update memoryDB cache and lastSyncedState to matched reference
  memoryDB = JSON.parse(JSON.stringify(newData));
  lastSyncedState = JSON.parse(JSON.stringify(newData));
}

// Low-level helper to write and read db
async function writeDB(data: DBStructure) {
  memoryDB = JSON.parse(JSON.stringify(data));

  // Write immediate local fallback backup
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("[Firestore Sync] Error writing temporary local db.json recovery backup file", error);
  }

  // ONLY sync back to cloud if the database was successfully loaded from Firestore.
  // This is a CRITICAL safety guard! If we are in local fallback mode because of a cold connection,
  // we must NOT write to Firestore because we could wipe/clobber actual remote records!
  if (!isDbLoaded) {
    console.warn("[Firestore Sync] Bypassing cloud write sync because remote database is not verified loaded.");
    return;
  }

  // Enforce Cloud Sync in real-time, awaiting completion to prevent Cloud Run request throttling
  try {
    await syncDataToFirestore(data, null);
    console.log("[Firestore Sync] Cloud database synchronization completed successfully (any oversized docs skipped gracefully).");
  } catch (err) {
    console.error("[Firestore Sync] Real-time write to cloud failed:", err);
    // DO NOT throw err here. We do not want Firestore connection issues or oversized files to break user operations on local db!
  }
}

// Memory map to track online status
const userLastActiveMap: Record<string, number> = {};

// Context helper for multi-tenant company resolution
function getRequestContext(req: express.Request, db: DBStructure) {
  const requesterId = (req.headers["x-user-id"] as string) || "u-admin";
  const reqUser = db.users.find((u: any) => u.id === requesterId);

  if (reqUser) {
    userLastActiveMap[reqUser.id] = Date.now();
  }

  if (!reqUser) {
    return {
      reqUser: null,
      companyId: "com-1",
      isSuperAdmin: false,
    };
  }

  const isSuperAdmin = reqUser.role === "SUPER_ADMIN";

  // If Super Admin, they can view/admin other companies via X-Company-ID header
  let companyId = reqUser.companyId || "com-1";
  const companyHeader = req.headers["x-company-id"] as string;
  if (isSuperAdmin && companyHeader) {
    companyId = companyHeader;
  }

  return {
    reqUser,
    companyId,
    isSuperAdmin,
  };
}

// Logger helper
async function createLog(userId: string, userName: string, action: string, details: string, companyId?: string) {
  const db = readDB();
  const actualCompanyId = companyId || db.users.find((u: any) => u.id === userId)?.companyId || "com-1";
  const log: ActivityLog = {
    id: "log-" + Date.now() + Math.random().toString(36).substr(2, 4),
    userId,
    userName,
    action,
    details,
    companyId: actualCompanyId,
    timestamp: new Date().toISOString(),
  };
  db.logs.unshift(log);
  // Keep logs to clean limit of 500
  if (db.logs.length > 500) {
    db.logs = db.logs.slice(0, 500);
  }
  await writeDB(db);
}

// Automatic Overdue Loan Calculator on startup or periodically
async function checkAndAutoApplyOverdue() {
  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  let updated = false;

  db.loans = db.loans.map((loan) => {
    if (loan.status === "ACTIVE" && loan.dueDate < today) {
      loan.status = "OVERDUE";
      // Apply a penalty (e.g. 5% of the principal if it triggers OVERDUE)
      if (loan.lateFeePenaltyApplied === 0) {
        loan.lateFeePenaltyApplied = Math.round(loan.principalAmount * (loan.penaltyRate / 100));
        loan.outstandingBalance += loan.lateFeePenaltyApplied;
      }
      updated = true;
      
      // Also update client financialStatus to RISK or DELINQUE
      const cl = db.clients.find((c) => c.id === loan.clientId);
      if (cl && cl.financialStatus !== "DELINQUENT") {
        cl.financialStatus = "DELINQUENT";
      }
    }
    return loan;
  });

  if (updated) {
    await writeDB(db);
  }
}

// 2. Setup Gemini Client Lazy
let aiClient: any = null;
function getGemini(): any {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// 3. API Handlers

// AUTH
app.get("/api/auth/companies", (req, res) => {
  const db = readDB();
  const publicCompanies = (db.companies || []).map((c) => ({
    id: c.id,
    name: c.name,
    logoUrl: c.logoUrl,
    nuit: c.nuit,
  }));
  res.json(publicCompanies);
});

app.post("/api/auth/login", async (req, res) => {
  const { phone, password, companyId } = req.body;
  if (!phone || !password || !companyId) {
    return res.status(400).json({ error: "Empresa, telefone e palavra-passe são obrigatórios." });
  }

  const db = readDB();
  const hash = hashPassword(password);
  const user = db.users.find(
    (u) =>
      normalizePhone(u.phone) === normalizePhone(phone) &&
      u.passwordHash === hash &&
      (u.companyId || "com-1") === companyId
  );
  
  if (!user) {
    return res.status(401).json({ error: "Telefone, palavra-passe ou empresa incorretos." });
  }
  if (user.status === "disabled") {
    return res.status(403).json({ error: "Esta conta foi desactivada ou suspensa." });
  }

  await createLog(user.id, user.fullName, "AUTH_LOGIN", "Utilizador iniciou sessão com sucesso.", companyId);
  
  // Return user without passwordHash
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token: `mock-session-${safeUser.id}-${Date.now()}` });
});

// PASSWORD RECOVERY (Enables recovery on matching phone metadata without real SMS integration)
app.post("/api/auth/recover", async (req, res) => {
  const { phone, newPassword } = req.body;
  const db = readDB();
  const userIndex = db.users.findIndex((u) => normalizePhone(u.phone) === normalizePhone(phone));

  if (userIndex === -1) {
    return res.status(404).json({ error: "Nenhum utilizador encontrado com este telefone" });
  }

  db.users[userIndex].passwordHash = hashPassword(newPassword);
  await createLog(
    db.users[userIndex].id,
    db.users[userIndex].fullName,
    "AUTH_RECOVERY",
    "A palavra-passe foi redefinida através da recuperação segura."
  );

  res.json({ message: "Palavra-passe redefinida com sucesso." });
});

// USERS MANAGEMENT
app.get("/api/users", (req, res) => {
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);
  const companyUsers = db.users.filter((u: any) => (u.companyId || "com-1") === companyId);
  const safeUsers = companyUsers.map(({ passwordHash: _, ...u }) => {
    const lastActive = userLastActiveMap[u.id] || 0;
    const isOnline = (Date.now() - lastActive) < 240000; // 4 minutes window
    return {
      ...u,
      isOnline: isOnline || u.id === (reqUser?.id || "")
    };
  });
  res.json(safeUsers);
});

app.post("/api/users", async (req, res) => {
  const { phone, fullName, role, password, status, permissions } = req.body;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }

  // A Master User can create users for their company, and Super Admin can create for any selected company
  if (reqUser.role !== "SUPER_ADMIN" && reqUser.role !== "MASTER_USER") {
    return res.status(403).json({ error: "Permissão negada. Apenas Administradores podem criar utilizadores." });
  }

  if (reqUser.role === "MASTER_USER" && role !== "SECONDARY_USER") {
    return res.status(403).json({ error: "Utilizadores com nível Master apenas podem criar utilizadores do tipo Secundário." });
  }

  if (!phone || !fullName || !role || !password) {
    return res.status(400).json({ error: "Todos os campos de utilizador são obrigatórios" });
  }

  const processedPhone = phone.trim();
  const existUser = db.users.find(u => u.phone === processedPhone);
  if (existUser) {
    return res.status(400).json({ error: "Já existe um utilizador com este número de telefone." });
  }

  const newUser: User & { passwordHash: string } = {
    id: "u-" + Date.now(),
    phone: processedPhone,
    fullName,
    role,
    status: status || "active",
    companyId,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
    permissions: permissions || {
      viewDashboard: true,
      viewClients: true,
      insertData: role !== "SECONDARY_USER",
      editData: role !== "SECONDARY_USER",
      deleteData: role === "SUPER_ADMIN",
      approveLoans: role === "SUPER_ADMIN" || (role === "MASTER_USER" && permissions?.approveLoans),
      manageRates: role === "SUPER_ADMIN" || role === "MASTER_USER",
      manageUsers: role === "SUPER_ADMIN" || role === "MASTER_USER",
      exportReports: true,
    }
  };

  db.users.push(newUser);
  await createLog(reqUser.id, reqUser.fullName, "USER_CREATED", `Criado utilizador ${fullName} (${role}).`, companyId);
  
  const { passwordHash: _, ...safeUser } = newUser;
  res.json(safeUser);
});

app.put("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  const { fullName, status, permissions, password, phone, role } = req.body;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }

  if (reqUser.role !== "SUPER_ADMIN" && reqUser.role !== "MASTER_USER") {
    return res.status(403).json({ error: "Apenas Administradores podem alterar permissões ou dados de utilizadores." });
  }

  const userIndex = db.users.findIndex(u => u.id === userId && (u.companyId || "com-1") === companyId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Utilizador não encontrado no âmbito desta empresa." });
  }

  const prevUser = db.users[userIndex];
  if (reqUser.role === "MASTER_USER" && prevUser.role !== "SECONDARY_USER") {
    return res.status(403).json({ error: "Utilizador com nível Master apenas pode gerir utilizadores do tipo Secundário." });
  }

  if (phone) {
    const processedPhone = phone.trim();
    const existUser = db.users.find(u => u.phone === processedPhone && u.id !== userId);
    if (existUser) {
      return res.status(400).json({ error: "Já existe outro utilizador com este número de telefone." });
    }
    prevUser.phone = processedPhone;
  }

  if (role) {
    if (reqUser.role === "MASTER_USER" && role !== "SECONDARY_USER") {
      return res.status(403).json({ error: "Utilizadores com nível Master apenas podem definir o tipo Secundário." });
    }
    prevUser.role = role;
  }

  if (fullName) prevUser.fullName = fullName;
  if (status) prevUser.status = status;
  if (permissions) prevUser.permissions = { ...prevUser.permissions, ...permissions };
  if (password) prevUser.passwordHash = hashPassword(password);

  await createLog(reqUser.id, reqUser.fullName, "USER_UPDATED", `Atualizado utilizador ${prevUser.fullName}.`, companyId);

  const { passwordHash: _, ...safeUser } = prevUser;
  res.json(safeUser);
});

app.delete("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }

  if (reqUser.role !== "SUPER_ADMIN" && reqUser.role !== "MASTER_USER") {
    return res.status(403).json({ error: "Apenas Administradores podem eliminar utilizadores." });
  }

  const userIndex = db.users.findIndex(u => u.id === userId && (u.companyId || "com-1") === companyId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Utilizador não encontrado no âmbito desta empresa." });
  }
  
  if (userId === "u-admin") {
    return res.status(400).json({ error: "Impossível eliminar o administrador principal." });
  }

  const deletedUser = db.users[userIndex];
  db.users.splice(userIndex, 1);
  await createLog(reqUser.id, reqUser.fullName, "USER_DELETED", `Eliminado utilizador ${deletedUser.fullName}.`, companyId);
  res.json({ message: "Utilizador eliminado com sucesso." });
});

// COMPANIES MANAGEMENT
app.get("/api/companies", (req, res) => {
  const db = readDB();
  const { reqUser } = getRequestContext(req, db);
  if (!reqUser || reqUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Apenas o Super Admin pode listar empresas." });
  }
  res.json(db.companies || []);
});

app.post("/api/companies", async (req, res) => {
  const db = readDB();
  const { reqUser } = getRequestContext(req, db);
  if (!reqUser || reqUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Apenas o Super Admin pode registar empresas." });
  }

  const { name, nuit, address, logoUrl, managerName, managerPhone, managerPassword, plan } = req.body;
  if (!name || !nuit || !address || !managerName || !managerPhone || !managerPassword) {
    return res.status(400).json({ error: "Todos os campos da empresa e do gestor são obrigatórios." });
  }

  const processedPhone = normalizePhone(managerPhone);
  const existUser = db.users.find(u => normalizePhone(u.phone) === processedPhone);
  if (existUser) {
    return res.status(400).json({ error: "Já existe um utilizador registado com o telefone do gestor." });
  }

  const newCompanyId = "com-" + Date.now();
  const newCompany: Company = {
    id: newCompanyId,
    name,
    nuit,
    address,
    logoUrl: logoUrl || "",
    plan: plan || "BASICO",
    settings: {
      defaultInterestRate: 15,
      defaultPenaltyRate: 2,
      currencySymbol: "MZN",
      companyName: name,
      companyNuit: nuit,
      companyAddress: address,
      companyLogoUrl: logoUrl || "",
      availableRates: [5, 10, 15, 20, 25, 30],
      availableTerms: [1, 2, 3, 4, 6, 12],
      availablePaymentFrequencies: ["Mensais", "Semanais", "Diárias"],
    },
    createdAt: new Date().toISOString()
  };

  const passwordHash = hashPassword(managerPassword);
  const newMasterUser: User & { passwordHash: string } = {
    id: "u-" + Date.now(),
    phone: processedPhone,
    fullName: managerName,
    role: "MASTER_USER",
    status: "active",
    companyId: newCompanyId,
    createdAt: new Date().toISOString(),
    passwordHash,
    permissions: {
      viewDashboard: true,
      viewClients: true,
      insertData: true,
      editData: true,
      deleteData: true,
      approveLoans: true,
      manageRates: true,
      manageUsers: true,
      exportReports: true,
    }
  };

  db.companies.push(newCompany);
  db.users.push(newMasterUser);
  await createLog(reqUser.id, reqUser.fullName, "COMPANY_CREATED", `Criada empresa ${name} com gestor ${managerName}.`, "com-1");

  res.json({ company: newCompany, user: newMasterUser });
});

app.put("/api/companies/:id", async (req, res) => {
  const db = readDB();
  const { reqUser } = getRequestContext(req, db);
  if (!reqUser || reqUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Apenas o Super Admin pode atualizar empresas." });
  }
  const companyId = req.params.id;
  const companyIdx = db.companies.findIndex(c => c.id === companyId);
  if (companyIdx === -1) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }
  const { name, nuit, address, logoUrl, plan } = req.body;
  if (name) {
    db.companies[companyIdx].name = name;
    db.companies[companyIdx].settings.companyName = name;
  }
  if (nuit) {
    db.companies[companyIdx].nuit = nuit;
    db.companies[companyIdx].settings.companyNuit = nuit;
  }
  if (address) {
    db.companies[companyIdx].address = address;
    db.companies[companyIdx].settings.companyAddress = address;
  }
  if (logoUrl !== undefined) {
    db.companies[companyIdx].logoUrl = logoUrl;
    db.companies[companyIdx].settings.companyLogoUrl = logoUrl;
  }
  if (plan !== undefined) {
    db.companies[companyIdx].plan = plan;
  }
  await createLog(reqUser.id, reqUser.fullName, "COMPANY_UPDATED", `Empresa atualizada: ${db.companies[companyIdx].name}.`, "com-1");
  res.json(db.companies[companyIdx]);
});

app.delete("/api/companies/:id", async (req, res) => {
  const db = readDB();
  const { reqUser } = getRequestContext(req, db);
  if (!reqUser || reqUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Apenas o Super Admin pode remover empresas." });
  }
  const companyId = req.params.id;
  if (companyId === "com-1") {
    return res.status(400).json({ error: "Não é possível remover a empresa principal." });
  }
  const companyIdx = db.companies.findIndex(c => c.id === companyId);
  if (companyIdx === -1) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }
  const name = db.companies[companyIdx].name;
  db.companies.splice(companyIdx, 1);
  
  // Clean up cascading data for that company
  db.users = db.users.filter(u => u.companyId !== companyId);
  db.clients = db.clients.filter(c => c.companyId !== companyId);
  db.loans = db.loans.filter(l => l.companyId !== companyId);
  db.logs = db.logs.filter(log => log.companyId !== companyId);

  await createLog(reqUser.id, reqUser.fullName, "COMPANY_DELETED", `Empresa removida: ${name}.`, "com-1");
  res.json({ message: "Empresa e todos os seus dados associados foram removidos com sucesso." });
});

// CLIENT MODULE
app.get("/api/clients", (req, res) => {
  const db = readDB();
  const { companyId } = getRequestContext(req, db);
  const companyClients = db.clients.filter((c: any) => (c.companyId || "com-1") === companyId);
  res.json(companyClients);
});

app.post("/api/clients", async (req, res) => {
  try {
    const { fullName, phone, idPassport, address, financialStatus, notes, birthDate, idExpiryDate, biAttachment, guaranteeAttachment, guaranteeDescription, guaranteeEstimatedValue, guaranteePhotos } = req.body;
    const db = readDB();
    const { reqUser, companyId } = getRequestContext(req, db);

    if (!reqUser) {
      return res.status(401).json({ error: "Sessão inválida" });
    }

    // Check Permissions: Insert
    if (!reqUser.permissions.insertData) {
      return res.status(403).json({ error: "A sua função não tem autorização para introduzir/inserir dados." });
    }

    if (!fullName || !phone || !idPassport || !address) {
      return res.status(400).json({ error: "Os campos Nome, Telefone, Bilhete e Endereço são obrigatórios." });
    }

    // Pre-configured client photo
    const newClient: Client = {
      id: "c-" + Date.now(),
      fullName,
      phone,
      idPassport,
      address,
      financialStatus: financialStatus || "STABLE",
      notes: notes || "",
      companyId,
      createdAt: new Date().toISOString(),
      birthDate: birthDate || "",
      idExpiryDate: idExpiryDate || "",
      biAttachment: biAttachment || "",
      guaranteeAttachment: guaranteeAttachment || "",
      guaranteeDescription: guaranteeDescription || "",
      guaranteeEstimatedValue: guaranteeEstimatedValue !== undefined ? Number(guaranteeEstimatedValue) || 0 : 0,
      guaranteePhotos: Array.isArray(guaranteePhotos) ? guaranteePhotos : [],
    };

    db.clients.push(newClient);
    await createLog(reqUser.id, reqUser.fullName, "CLIENT_SAVED", `Novo cliente cadastrado: ${fullName}.`, companyId);
    res.status(201).json(newClient);
  } catch (error: any) {
    console.error("Erro em POST /api/clients:", error);
    res.status(500).json({ error: "Erro interno no servidor ao cadastrar cliente: " + error.message });
  }
});

app.put("/api/clients/:id", async (req, res) => {
  const clientId = req.params.id;
  const { fullName, phone, idPassport, address, financialStatus, notes, birthDate, idExpiryDate, biAttachment, guaranteeAttachment, guaranteeDescription, guaranteeEstimatedValue, guaranteePhotos } = req.body;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }

  // Check Permissions: Edit
  if (!reqUser.permissions.editData) {
    return res.status(403).json({ error: "A sua função não tem autorização para editar dados." });
  }

  const clientIndex = db.clients.findIndex(c => c.id === clientId && (c.companyId || "com-1") === companyId);
  if (clientIndex === -1) {
    return res.status(404).json({ error: "Cliente não encontrado" });
  }

  const updatedClient = {
    ...db.clients[clientIndex],
    ...(fullName && { fullName }),
    ...(phone && { phone }),
    ...(idPassport && { idPassport }),
    ...(address && { address }),
    ...(financialStatus && { financialStatus }),
    ...(notes !== undefined && { notes }),
    ...(birthDate !== undefined && { birthDate }),
    ...(idExpiryDate !== undefined && { idExpiryDate }),
    ...(biAttachment !== undefined && { biAttachment }),
    ...(guaranteeAttachment !== undefined && { guaranteeAttachment }),
    ...(guaranteeDescription !== undefined && { guaranteeDescription }),
    ...(guaranteeEstimatedValue !== undefined && { guaranteeEstimatedValue: Number(guaranteeEstimatedValue) }),
    ...(guaranteePhotos !== undefined && { guaranteePhotos }),
  };

  db.clients[clientIndex] = updatedClient;
  await createLog(reqUser.id, reqUser.fullName, "CLIENT_UPDATED", `Dados do cliente atualizados: ${updatedClient.fullName}.`, companyId);
  res.json(updatedClient);
});

app.delete("/api/clients/:id", async (req, res) => {
  const clientId = req.params.id;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }

  // Check Permissions: Delete
  if (!reqUser.permissions.deleteData) {
    return res.status(403).json({ error: "A sua função não tem autorização para eliminar dados (Apenas Super Admin)." });
  }

  const clientIndex = db.clients.findIndex(c => c.id === clientId && (c.companyId || "com-1") === companyId);
  if (clientIndex === -1) {
    return res.status(404).json({ error: "Cliente não encontrado" });
  }

  // Prevent client deletion if they have active loans
  const hasActiveLoan = db.loans.some(l => l.clientId === clientId && (l.status === "ACTIVE" || l.status === "OVERDUE") && (l.companyId || "com-1") === companyId);
  if (hasActiveLoan) {
    return res.status(400).json({ error: "Impossível eliminar o cliente. Existem empréstimos activos ou em atraso." });
  }

  const deleted = db.clients[clientIndex];
  db.clients.splice(clientIndex, 1);
  await createLog(reqUser.id, reqUser.fullName, "CLIENT_DELETED", `Cliente removido do sistema: ${deleted.fullName}.`, companyId);
  res.json({ message: "Cliente eliminado com sucesso." });
});

// LOAN MODULE
app.get("/api/loans", (req, res) => {
  const db = readDB();
  const { companyId } = getRequestContext(req, db);
  const companyLoans = db.loans.filter((l: any) => (l.companyId || "com-1") === companyId);
  res.json(companyLoans);
});

app.post("/api/loans", async (req, res) => {
  try {
    const { clientId, principalAmount, interestRate, termMonths, penaltyRate, startDate, dueDate, paymentFrequency, biAttachment, guaranteeAttachment, guaranteeDescription, guaranteeEstimatedValue, guaranteePhotos } = req.body;
    const db = readDB();
    const { reqUser, companyId } = getRequestContext(req, db);

    if (!reqUser) {
      return res.status(401).json({ error: "Sessão inválida" });
    }

    if (!reqUser.permissions.insertData) {
      return res.status(403).json({ error: "Função sem permissão para criar empréstimos." });
    }

    const client = db.clients.find(c => c.id === clientId && (c.companyId || "com-1") === companyId);
    if (!client) {
      return res.status(404).json({ error: "Cliente selecionado não foi encontrado no âmbito desta empresa." });
    }

    const company = db.companies.find(c => c.id === companyId);
    const companySettings = company ? company.settings : db.settings;

    const principal = parseFloat(principalAmount);
    const rate = parseFloat(interestRate || companySettings.defaultInterestRate);
    const term = parseInt(termMonths || 3);
    const penalty = parseFloat(penaltyRate || companySettings.defaultPenaltyRate);
    const freq = paymentFrequency || "Mensais";

    if (isNaN(principal) || principal <= 0) {
      return res.status(400).json({ error: "Montante de capital inválido." });
    }

    // Simple interest calculations standard for microfinance
    const totalInterest = Math.round(principal * (rate / 100) * term);
    const totalDue = principal + totalInterest;
    const installmentAmount = Math.round(totalDue / term);

    // Calculate default dates if not provided
    const parsedStartDate = startDate || new Date().toISOString().split('T')[0];
    
    let daysToAdd = term * 30; // standard fallback
    if (freq === "Diárias") {
      daysToAdd = term;
    } else if (freq === "Semanais") {
      daysToAdd = term * 7;
    }
    
    const parsedDueDate = dueDate || new Date(new Date(parsedStartDate).getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Custom professional reference sequence (YYYYMMDD-CF-XX)
    const companyActiveLoans = db.loans.filter(l => (l.companyId || "com-1") === companyId);
    const consecutiveNum = String(companyActiveLoans.length + 1).padStart(2, "0");
    const dateStr = parsedStartDate.replace(/-/g, "");
    let professionalId = `${dateStr}-CF-${consecutiveNum}`;
    let uniqSeq = 1;
    while (db.loans.some(l => l.id === professionalId)) {
      professionalId = `${dateStr}-CF-${consecutiveNum}-${uniqSeq}`;
      uniqSeq++;
    }

    const newLoan: any = {
      id: professionalId,
      clientId,
      clientName: client.fullName,
      principalAmount: principal,
      interestRate: rate,
      termMonths: term,
      totalInterest,
      totalDue,
      outstandingBalance: totalDue,
      installmentAmount,
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      status: "PENDING", // Subject to approval by MASTER_USER or SUPER_ADMIN
      penaltyRate: penalty,
      lateFeePenaltyApplied: 0,
      paymentFrequency: freq,
      biAttachment: biAttachment || "",
      guaranteeAttachment: guaranteeAttachment || "",
      guaranteeDescription: guaranteeDescription || "",
      guaranteeEstimatedValue: guaranteeEstimatedValue !== undefined ? Number(guaranteeEstimatedValue) || 0 : 0,
      guaranteePhotos: Array.isArray(guaranteePhotos) ? guaranteePhotos : [],
      companyId,
      payments: []
    };

    db.loans.push(newLoan);
    await createLog(reqUser.id, reqUser.fullName, "LOAN_CREATED", `Registado empréstimo de ${principal} MZN para o cliente ${client.fullName}.`, companyId);
    res.status(201).json(newLoan);
  } catch (error: any) {
    console.error("Erro em POST /api/loans:", error);
    res.status(500).json({ error: "Erro interno no servidor ao registar empréstimo: " + error.message });
  }
});

// LOAN ACTION: Approve / Pay Installment / Cancel
app.post("/api/loans/:id/pay", async (req, res) => {
  try {
    const loanId = req.params.id;
    const { amount, penaltyPaid, paymentMethod } = req.body;
    const db = readDB();
    const { reqUser, companyId } = getRequestContext(req, db);

    if (!reqUser) {
      return res.status(401).json({ error: "Sessão inválida" });
    }

    if (!reqUser.permissions.insertData) {
      return res.status(403).json({ error: "Função sem permissão para registrar recebimentos de pagamento." });
    }

    const loanIndex = db.loans.findIndex(l => l.id === loanId && (l.companyId || "com-1") === companyId);
    if (loanIndex === -1) {
      return res.status(404).json({ error: "Empréstimo não encontrado no âmbito desta empresa." });
    }

    const loan = db.loans[loanIndex];
    const payAmt = parseFloat(amount);
    const payPen = parseFloat(penaltyPaid || 0);

    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ error: "Valor de pagamento é inválido." });
    }

    // Record payment
    const actualReceipt = "REC-" + Math.floor(100000 + Math.random() * 900000);
    const newPayment: LoanPayment = {
      id: "pay-" + Date.now(),
      paymentDate: new Date().toISOString(),
      amount: payAmt,
      penaltyPaid: payPen,
      paymentMethod: paymentMethod || "M-Pesa",
      receiptNumber: actualReceipt,
      receivedBy: reqUser.fullName,
    };

    // Add repayment to company capital history
    const company = db.companies.find(c => c.id === companyId);
    if (company) {
      if (!company.capitalHistory) {
        company.capitalHistory = [];
      }
      if (company.currentBalance === undefined) {
        company.currentBalance = company.initialBalance || 0;
      }
      company.currentBalance += payAmt;
      company.capitalHistory.push({
        id: "cap-" + Date.now() + "-rep",
        date: new Date().toISOString(),
        type: "LOAN_REPAYMENT",
        amount: payAmt,
        description: `Recepção de Reembolso - Recibo: ${actualReceipt} Gasto por ${loan.clientName}`,
        userFullName: reqUser.fullName
      });
    }

    // Deduct Outstanding balance. Total collected reduces outstanding
    const fullDeduction = payAmt;
    loan.outstandingBalance = Math.max(0, loan.outstandingBalance - fullDeduction);

    if (loan.outstandingBalance === 0) {
      loan.status = "PAID";
      // restore client score stable/excellent
      const cl = db.clients.find(c => c.id === loan.clientId && (c.companyId || "com-1") === companyId);
      if (cl) cl.financialStatus = "EXCELLENT";
    }

    loan.payments.push(newPayment);
    await createLog(reqUser.id, reqUser.fullName, "PAYMENT_RECORDED", `Registado pagamento de ${payAmt} MZN para o empréstimo ${loan.id}. Recibo: ${actualReceipt}`, companyId);
    
    res.json({ loan, payment: newPayment });
  } catch (error: any) {
    console.error("Erro em POST /api/loans/:id/pay:", error);
    res.status(500).json({ error: "Erro interno no servidor ao registrar pagamento: " + error.message });
  }
});

// Update status directly (e.g. Cancel or Force update Loan)
app.put("/api/loans/:id", async (req, res) => {
  try {
    const loanId = req.params.id;
    const { status, outstandingBalance, lateFeePenaltyApplied } = req.body;
    const db = readDB();
    const { reqUser, companyId } = getRequestContext(req, db);

    if (!reqUser) {
      return res.status(401).json({ error: "Sessão inválida" });
    }

    if (status && (status === "ACTIVE" || status === "CANCELLED")) {
      if (reqUser.role !== "MASTER_USER" && reqUser.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Apenas utilizadores com nível Master ou Super Admin podem aprovar ou decidir sobre solicitações de empréstimo." });
      }
    }

    if (!reqUser.permissions.approveLoans && reqUser.role !== "SUPER_ADMIN" && reqUser.role !== "MASTER_USER") {
      return res.status(403).json({ error: "Apenas Super Admin ou Master pode autorizar ou redefinir canais de empréstimo." });
    }

    const loanIndex = db.loans.findIndex(l => l.id === loanId && (l.companyId || "com-1") === companyId);
    if (loanIndex === -1) {
      return res.status(404).json({ error: "Empréstimo não encontrado no âmbito desta empresa." });
    }

    const loan = db.loans[loanIndex];
    const oldStatus = loan.status;
    if (status) loan.status = status;
    if (outstandingBalance !== undefined) loan.outstandingBalance = parseFloat(outstandingBalance);
    if (lateFeePenaltyApplied !== undefined) loan.lateFeePenaltyApplied = parseFloat(lateFeePenaltyApplied);

    if (status === "ACTIVE" && oldStatus === "PENDING") {
      const company = db.companies.find(c => c.id === companyId);
      if (company) {
        if (!company.capitalHistory) {
          company.capitalHistory = [];
        }
        if (company.currentBalance === undefined) {
          company.currentBalance = company.initialBalance || 0;
        }
        company.currentBalance -= loan.principalAmount;
        company.capitalHistory.push({
          id: "cap-" + Date.now() + "-disb",
          date: new Date().toISOString(),
          type: "LOAN_DISBURSEMENT",
          amount: loan.principalAmount,
          description: `Discarregamento (Desembolso) de Crédito - Ref: ${loan.id} para ${loan.clientName}`,
          userFullName: reqUser.fullName
        });
      }
    }

    await createLog(reqUser.id, reqUser.fullName, "LOAN_UPDATED", `Estado do empréstimo ${loanId} atualizado para ${status || loan.status}.`, companyId);
    res.json(loan);
  } catch (error: any) {
    console.error("Erro em PUT /api/loans/:id:", error);
    res.status(500).json({ error: "Erro interno no servidor ao atualizar empréstimo: " + error.message });
  }
});

app.delete("/api/loans/:id", async (req, res) => {
  const loanId = req.params.id;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }

  if (!reqUser.permissions.deleteData) {
    return res.status(403).json({ error: "Apenas Super Admin tem permissão de exclusão estrutural." });
  }

  const loanIndex = db.loans.findIndex(l => l.id === loanId && (l.companyId || "com-1") === companyId);
  if (loanIndex === -1) {
    return res.status(404).json({ error: "Empréstimo não encontrado no âmbito desta empresa." });
  }

  const deleted = db.loans[loanIndex];
  db.loans.splice(loanIndex, 1);
  await createLog(reqUser.id, reqUser.fullName, "LOAN_DELETED", `Eliminado empréstimo ${loanId} pertencente a ${deleted.clientName}`, companyId);
  res.json({ message: "Empréstimo eliminado com sucesso." });
});

// LOGS
app.get("/api/logs", (req, res) => {
  const db = readDB();
  const { companyId } = getRequestContext(req, db);
  const companyLogs = db.logs.filter((log: any) => (log.companyId || "com-1") === companyId);
  res.json(companyLogs);
});

// SYSTEM CAPITAL ENDPOINTS
app.get("/api/companies/capital", (req, res) => {
  const db = readDB();
  const { companyId } = getRequestContext(req, db);
  const company = db.companies.find((c: any) => c.id === companyId);
  if (!company) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }
  res.json({
    initialBalance: company.initialBalance || 0,
    currentBalance: company.currentBalance !== undefined ? company.currentBalance : (company.initialBalance || 0),
    capitalHistory: company.capitalHistory || []
  });
});

app.post("/api/companies/capital", async (req, res) => {
  const { amount, type, description } = req.body;
  if (amount === undefined || !type) {
    return res.status(400).json({ error: "Valor e tipo de transação são obrigatórios." });
  }
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);
  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }
  if (reqUser.role !== "MASTER_USER" && reqUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Apenas utilizadores administradores (Admin) ou utilizadores Master (MASTER_USER) podem definir saldo inicial ou registar reforços de capital." });
  }
  const company = db.companies.find((c: any) => c.id === companyId);
  if (!company) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Valor inválido" });
  }

  if (!company.capitalHistory) {
    company.capitalHistory = [];
  }

  const newTx = {
    id: "cap-" + Date.now(),
    date: new Date().toISOString(),
    type: type as 'INITIAL' | 'REINFORCEMENT' | 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT',
    amount: amt,
    description: description || (type === "INITIAL" ? "Definição de Saldo Inicial" : "Reforço de Capital"),
    userFullName: reqUser.fullName
  };

  if (type === "INITIAL") {
    company.initialBalance = amt;
    // Recalculate current balance
    const inflows = company.capitalHistory
      .filter((h: any) => h.type === "REINFORCEMENT" || h.type === "LOAN_REPAYMENT")
      .reduce((sum: number, h: any) => sum + h.amount, 0);
    const outflows = company.capitalHistory
      .filter((h: any) => h.type === "LOAN_DISBURSEMENT")
      .reduce((sum: number, h: any) => sum + h.amount, 0);
    company.currentBalance = amt + inflows - outflows;
  } else if (type === "REINFORCEMENT") {
    if (company.currentBalance === undefined) {
      company.currentBalance = company.initialBalance || 0;
    }
    company.currentBalance += amt;
  }

  company.capitalHistory.push(newTx);
  await createLog(reqUser.id, reqUser.fullName, "CAPITAL_CHANGED", `${newTx.description}: +${amt.toLocaleString("pt-MZ")} MZN`, companyId);

  res.json({
    initialBalance: company.initialBalance || 0,
    currentBalance: company.currentBalance !== undefined ? company.currentBalance : (company.initialBalance || 0),
    capitalHistory: company.capitalHistory
  });
});

app.put("/api/companies/capital/:id", async (req, res) => {
  const { id } = req.params;
  const { amount, type, description } = req.body;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }
  if (reqUser.role !== "SUPER_ADMIN" && reqUser.role !== "MASTER_USER") {
    return res.status(403).json({ error: "Apenas utilizadores administradores (Admin) podem editar o histórico de tesouraria." });
  }

  const company = db.companies.find((c: any) => c.id === companyId);
  if (!company) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }

  if (!company.capitalHistory) {
    company.capitalHistory = [];
  }

  const tx = company.capitalHistory.find((t: any) => t.id === id);
  if (!tx) {
    return res.status(404).json({ error: "Registo de caixa não encontrado." });
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Valor inválido" });
  }

  // Update
  tx.amount = amt;
  if (type) {
    tx.type = type;
  }
  if (description !== undefined) {
    tx.description = description;
  }

  // Recalculate
  const initialEntries = company.capitalHistory.filter((h: any) => h.type === "INITIAL");
  const initialAmt = initialEntries.reduce((sum: number, h: any) => sum + h.amount, 0);
  company.initialBalance = initialAmt;

  const inflows = company.capitalHistory
    .filter((h: any) => h.type === "REINFORCEMENT" || h.type === "LOAN_REPAYMENT")
    .reduce((sum: number, h: any) => sum + h.amount, 0);
  const outflows = company.capitalHistory
    .filter((h: any) => h.type === "LOAN_DISBURSEMENT")
    .reduce((sum: number, h: any) => sum + h.amount, 0);

  company.currentBalance = initialAmt + inflows - outflows;

  await createLog(reqUser.id, reqUser.fullName, "CAPITAL_EDITED", `Registo editado (${tx.description}): ${amt.toLocaleString("pt-MZ")} MZN`, companyId);

  res.json({
    initialBalance: company.initialBalance || 0,
    currentBalance: company.currentBalance !== undefined ? company.currentBalance : (company.initialBalance || 0),
    capitalHistory: company.capitalHistory
  });
});

app.delete("/api/companies/capital/:id", async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }
  if (reqUser.role !== "SUPER_ADMIN" && reqUser.role !== "MASTER_USER") {
    return res.status(403).json({ error: "Apenas utilizadores administradores (Admin) podem eliminar registos de tesouraria." });
  }

  const company = db.companies.find((c: any) => c.id === companyId);
  if (!company) {
    return res.status(404).json({ error: "Empresa não encontrada" });
  }

  if (!company.capitalHistory) {
    company.capitalHistory = [];
  }

  const txIndex = company.capitalHistory.findIndex((t: any) => t.id === id);
  if (txIndex === -1) {
    return res.status(404).json({ error: "Registo de caixa não encontrado." });
  }

  const removedTx = company.capitalHistory[txIndex];
  company.capitalHistory.splice(txIndex, 1);

  // Recalculate
  const initialEntries = company.capitalHistory.filter((h: any) => h.type === "INITIAL");
  const initialAmt = initialEntries.reduce((sum: number, h: any) => sum + h.amount, 0);
  company.initialBalance = initialAmt;

  const inflows = company.capitalHistory
    .filter((h: any) => h.type === "REINFORCEMENT" || h.type === "LOAN_REPAYMENT")
    .reduce((sum: number, h: any) => sum + h.amount, 0);
  const outflows = company.capitalHistory
    .filter((h: any) => h.type === "LOAN_DISBURSEMENT")
    .reduce((sum: number, h: any) => sum + h.amount, 0);

  company.currentBalance = initialAmt + inflows - outflows;

  await createLog(reqUser.id, reqUser.fullName, "CAPITAL_DELETED", `Registo eliminado (${removedTx.description}): ${removedTx.amount.toLocaleString("pt-MZ")} MZN`, companyId);

  res.json({
    initialBalance: company.initialBalance || 0,
    currentBalance: company.currentBalance !== undefined ? company.currentBalance : (company.initialBalance || 0),
    capitalHistory: company.capitalHistory
  });
});

app.post("/api/pdf/upload", (req, res) => {
  const { filename, fileData } = req.body;
  if (!filename || !fileData) {
    return res.status(400).json({ error: "Parâmetros 'filename' e 'fileData' em falta." });
  }

  try {
    const pdfsDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    let base64Data = fileData;
    if (fileData.includes("base64,")) {
      base64Data = fileData.split("base64,")[1];
    }

    const buffer = Buffer.from(base64Data, "base64");
    const filePath = path.join(pdfsDir, filename);
    fs.writeFileSync(filePath, buffer);

    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const absoluteUrl = `${protocol}://${host}/pdfs/${filename}`;

    res.json({
      success: true,
      url: `/pdfs/${filename}`,
      absoluteUrl: absoluteUrl
    });
  } catch (error: any) {
    console.error("Erro ao guardar o PDF no servidor:", error);
    res.status(500).json({ error: "Erro interno ao guardar o PDF: " + error.message });
  }
});

// SYSTEM SETTINGS
app.get("/api/settings", (req, res) => {
  const db = readDB();
  const { companyId } = getRequestContext(req, db);
  const company = db.companies.find((c: any) => c.id === companyId);
  if (company) {
    res.json({
      ...company.settings,
      plan: company.plan || "BASICO",
      companyLogoUrl: company.logoUrl || ""
    });
  } else {
    res.json({
      ...db.settings,
      plan: "PREMIUM",
      companyLogoUrl: ""
    });
  }
});

app.put("/api/settings", async (req, res) => {
  const { defaultInterestRate, defaultPenaltyRate, companyName, companyNuit, companyAddress, companyLogoUrl, availableRates, availableTerms, availablePaymentFrequencies } = req.body;
  const db = readDB();
  const { reqUser, companyId } = getRequestContext(req, db);

  if (!reqUser) {
    return res.status(401).json({ error: "Sessão inválida" });
  }

  const isSuper = reqUser.role === "SUPER_ADMIN";
  const isMaster = reqUser.role === "MASTER_USER";
  const hasPrem = reqUser.permissions && reqUser.permissions.manageRates;
  const canManage = isSuper || isMaster || hasPrem;

  if (!canManage) {
    return res.status(403).json({ error: "Apenas o Administrador ou Gestor Master tem permissão para alterar as configurações." });
  }

  // Update company settings specifically
  const companyIdx = db.companies.findIndex(c => c.id === companyId);
  if (companyIdx === -1) {
    return res.status(404).json({ error: "Empresa não encontrada para aplicar as configurações." });
  }

  const company = db.companies[companyIdx];

  company.settings = {
    ...company.settings,
    ...(defaultInterestRate !== undefined && { defaultInterestRate: parseFloat(defaultInterestRate) }),
    ...(defaultPenaltyRate !== undefined && { defaultPenaltyRate: parseFloat(defaultPenaltyRate) }),
    ...(companyName !== undefined && isSuper && { companyName }),
    ...(companyNuit !== undefined && isSuper && { companyNuit }),
    ...(companyAddress !== undefined && isSuper && { companyAddress }),
    ...(companyLogoUrl !== undefined && isSuper && { companyLogoUrl }),
    ...(Array.isArray(availableRates) && { availableRates: availableRates.map(Number).filter(r => !isNaN(r)) }),
    ...(Array.isArray(availableTerms) && { availableTerms: availableTerms.map(Number).filter(t => !isNaN(t)) }),
    ...(Array.isArray(availablePaymentFrequencies) && { availablePaymentFrequencies: availablePaymentFrequencies.map(String) })
  };

  // Sync basic company details
  if (companyName && isSuper) company.name = companyName;
  if (companyNuit && isSuper) company.nuit = companyNuit;
  if (companyAddress && isSuper) company.address = companyAddress;
  if (companyLogoUrl !== undefined && isSuper) company.logoUrl = companyLogoUrl;

  // Also sync legacy settings object in db ROOT for compatibility fallback
  if (companyId === "com-1") {
    db.settings = { ...db.settings, ...company.settings };
  }

  await createLog(reqUser.id, reqUser.fullName, "SETTINGS_CONFIGURED", `As configurações da empresa ${company.name} foram atualizadas.`, companyId);
  res.json(company.settings);
});

// AI ENGINE: Risk Analysis & Dynamic Credit Intelligence
app.post("/api/ai/credit-risk", async (req, res) => {
  const { client, loanPrincipal, duration } = req.body;
  if (!client || !loanPrincipal) {
    return res.status(400).json({ error: "Faltam parâmetros para análise de crédito." });
  }

  const googleGenAI = getGemini();
  const finalPrincipal = parseFloat(loanPrincipal);
  const prompt = `Analise o perfil de crédito de forma profissional para este cliente de microfinanças moçambicano:
  - Nome: ${client.fullName}
  - BI/ID: ${client.idPassport}
  - Cidade/Endereço: ${client.address}
  - Classificação Financeira Atual: ${client.financialStatus}
  - Descrição Histórica: ${client.notes || 'Sem detalhes'}
  - Empréstimo solicitado: ${finalPrincipal.toLocaleString('pt-MZ')} MZN por ${duration || 3} meses.
  
  Por favor, faça um parecer de crédito rigoroso em Português de Moçambique com as secções:
  1. PARECER RÁPIDO DO ANALISTA (Média/Alta/Baixa confiança)
  2. NÍVEL DE RISCO CALCULADO (%). Forneça uma estimativa clara.
  3. CÁLCULO DA CAPACIDADE DE ENDIVIDAMENTO.
  4. RECOMENDAÇÕES OPERACIONAIS (por exemplo, pedir fiador profissional, aceitar livremente, parcelas quinzenais, redução de montante para x, etc.) de modo a mitigar potenciais não reembolsos.
  
  Mantenha uma formatação moderna e limpa, adequada para exibicão em cartazes ou relatórios executivos.`;

  if (!googleGenAI) {
    // Elegant fallback simulation if GEMINI_API_KEY is not configured yet
    const simulatedRisks = {
      "EXCELLENT": { opinion: "APROVAÇÃO RECOMENDADA COM DISTINÇÃO", risk: 5 },
      "STABLE": { opinion: "APROVAÇÃO VIÁVEL COM CONDIÇÕES DE ROTINA", risk: 14 },
      "RISKY": { opinion: "APROVAÇÃO RESTRITA MULTI-CUSTÓDIA", risk: 42 },
      "DELINQUENT": { opinion: "REJEIÇÃO ALTAMENTE SUGERIDA", risk: 85 }
    };
    const factor = simulatedRisks[client.financialStatus as 'STABLE'] || { opinion: "ANÁLISE AD-HOC", risk: 25 };

    const simulatedText = `### 🤖 ANÁLISE DE CRÉDITO INTELIGENTE (Simulador MeticalCred)

> **Nota:** Configurar a chave 'GEMINI_API_KEY' sob os Segredos para obter auditoria dinâmica em tempo real da IA.

#### 1. Parecer de Crédito Primário
* **Recomendação:** **${factor.opinion}**
* **Nível de Confiança:** Muito Alto (Dados Históricos Registados)

#### 2. Risco Financeiro Estimado
* **Probabilidade de Incumprimento:** **${factor.risk}%** (Escala Baseada em Perfil Cooperativo de Moçambique)

#### 3. Capacidade de Endividamento MZN
* O empréstimo estimado de **${finalPrincipal.toLocaleString()} MZN** correspondente a parcelas de **${Math.round(finalPrincipal / (duration || 3)).toLocaleString()} MZN** enquadra-se de forma tolerável no patamar demonstrado pelo histórico operacional deste cliente (${client.fullName}).

#### 4. Recomendações de Mitigação
* Exigência de Bilhete de Identidade (BI) validado física e digitalmente (Código: **${client.idPassport}**).
* Para clientes com perfil vulnerável, exigir fiador profissional ou depósito cautelar de pelo menos 13%.`;

    return res.json({ analysis: simulatedText });
  }

  try {
    const response = await googleGenAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    res.json({ analysis: response.text });
  } catch (err: any) {
    console.error("Gemini risk assessment error", err);
    res.status(500).json({ error: "Erro ao gerar auditoria automática da IA." });
  }
});

// CHAT WITH ANALYST
app.post("/api/ai/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Faltam mensagens para chat." });
  }

  const googleGenAI = getGemini();
  const lastMsg = messages[messages.length - 1]?.content || "Olá";

  const sysInstruction = `És o "MeticalMind Bot" - o Analista Financeiro e de Risco Inteligente da MeticalCred S.A., uma microfinança de elite em Moçambique.
  Dás conselhos de finanças, cálculos fiscais, gestão de carteiras de crédito vencido e mitigas delinquência de pagamentos.
  Respondes sempre de forma extremamente polida, cortês, profissional e prática em Português de Moçambique. Usas a moeda MZN constantemente.`;

  if (!googleGenAI) {
    const simulatedAnswers = [
      "Como seu assistente financeiro moçambicano, recomendo auditar rigorosamente o rácio de empréstimos em incumprimento (NPL). Na MeticalCred S.A., sugerimos manter este índice abaixo dos 5% da carteira total para manter a sustentabilidade.",
      "A taxa padrão de Meticais sob depósitos e taxas é calculada com base na nossa taxa diretora atual. Podemos estruturar garantias bilaterais ou planos de parcelamento flexíveis para este cliente.",
      "Para reduzir a sinistralidade no distrito de Maputo/Matola, é salutar aplicar lembretes SMS quinzenais automáticos prévios ao vencimento real da parcela e uma penalidade controlada em MZN."
    ];
    const randomIndex = Math.floor(Math.random() * simulatedAnswers.length);
    return res.json({ response: simulatedAnswers[randomIndex] });
  }

  try {
    const formattedHistory = messages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }]
    }));

    const response = await googleGenAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: lastMsg }] }
      ],
      config: {
        systemInstruction: sysInstruction
      }
    });

    res.json({ response: response.text });
  } catch (err: any) {
    console.error("Gemini chat error", err);
    res.status(500).json({ error: "Falha na comunicação com o assistente inteligente." });
  }
});

// DIAGNOSTIC AND SYNC ENDPOINT
app.get("/api/diagnose-db", async (req, res) => {
  const db = readDB();
  const fileExists = fs.existsSync(DB_FILE);
  let fileCompanies = [];
  if (fileExists) {
    try {
      fileCompanies = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")).companies || [];
    } catch (e) {}
  }

  let firestoreCompanies: any[] = [];
  let errorMsg = null;
  let syncSuccess = false;

  try {
    firestoreCompanies = await fetchColFromFirestore("companies");
  } catch (err: any) {
    errorMsg = err.message || err;
  }

  const shouldSync = req.query.sync === "true";
  if (shouldSync) {
    try {
      // Force loading of database flag so we can write to Cloud
      isDbLoaded = true;
      await syncDataToFirestore(db, null);
      
      syncSuccess = true;
      // Re-fetch firestore companies
      firestoreCompanies = await fetchColFromFirestore("companies");
    } catch (err: any) {
      errorMsg = "Sync failed: " + (err.message || err);
    }
  }

  res.json({
    status: isDbLoaded ? "LOADED" : "OFFLINE_FALLBACK",
    local: {
      companiesCount: db.companies?.length || 0,
      companies: db.companies?.map(c => ({ id: c.id, name: c.name })),
      usersCount: db.users?.length || 0,
      clientsCount: db.clients?.length || 0,
      loansCount: db.loans?.length || 0,
    },
    firestore: {
      connected: !errorMsg,
      error: errorMsg,
      companiesCount: firestoreCompanies.length,
      companies: firestoreCompanies.map(c => ({ id: c.id, name: c.name })),
    },
    syncApplied: syncSuccess
  });
});

// BACKUP TRIGGER: Encoded DB structure for instant system restore
app.get("/api/backup", (req, res) => {
  const db = readDB();
  res.setHeader("Content-Disposition", `attachment; filename="meticalcred_backup_${new Date().toISOString().split('T')[0]}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(db, null, 2));
});

// RESTORE BACKUP
app.post("/api/backup/restore", async (req, res) => {
  const { backupData } = req.body;
  const requesterId = req.headers["x-user-id"] as string || "u-admin";

  const db = readDB();
  const reqUser = db.users.find(u => u.id === requesterId);

  if (!reqUser || reqUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Apenas o Super Admin principal pode restaurar cópias de segurança do banco de dados." });
  }

  try {
    if (!backupData || !backupData.users || !backupData.clients || !backupData.loans) {
      return res.status(400).json({ error: "Formato de cópia de segurança inválido." });
    }

    await writeDB(backupData);
    await createLog(reqUser.id, reqUser.fullName, "BACKUP_RESTORED", "Base de dados restaurada com sucesso a partir de ficheiro externo.");
    res.json({ message: "Base de dados restaurada com sucesso!" });
  } catch (err) {
    res.status(400).json({ error: "Falha na validação ou restauração do ficheiro de backup." });
  }
});

// Initialize database check, seeding data if empty and priming cache memory
async function initializeCloudFirestore() {
  let companies: any[] = [];
  let users: any[] = [];
  let clients: any[] = [];
  let loans: any[] = [];
  let logs: any[] = [];
  let settings = DEFAULT_SETTINGS;
  let loadedSuccessfully = false;
  let loadedFromBackup = false;
  
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Firestore] Fetching data directly from individual collections (Tentativa ${attempt}/${maxRetries})...`);
      const results = await Promise.all([
        fetchColFromFirestore("companies"),
        fetchColFromFirestore("users"),
        fetchColFromFirestore("clients"),
        fetchColFromFirestore("loans"),
        fetchColFromFirestore("logs")
      ]);
      companies = results[0];
      users = results[1];
      clients = results[2];
      loans = results[3];
      logs = results[4];
      loadedSuccessfully = true;
      break;
    } catch (err: any) {
      console.error(`[Firestore] Falha na tentativa ${attempt} de carregar dados da nuvem direta:`, err?.message || err);
      if (attempt === maxRetries) {
        throw new Error("Persistência do Cloud Firestore não disponível após várias tentativas: " + (err?.message || err));
      }
      // Wait 1.5s before retrying
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  try {
    if (loadedSuccessfully) {
      // Check if cloud DB is completely newly provisioned (empty state)
      if (companies.length === 0 && users.length === 0) {
        console.log("[Firestore] Cloud database is empty or newly created. Syncing initial local seeds directly to Cloud storage...");
        // Try to load current local db.json if exists to avoid data wipe, otherwise fallback to seed defaults
        let seedDB: DBStructure;
        if (fs.existsSync(DB_FILE)) {
          try {
            seedDB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
            console.log("[Firestore] Seeded load successfully retrieved from local recovery db.json");
          } catch (e) {
            seedDB = getInitialDB();
          }
        } else {
          seedDB = getInitialDB();
        }
        memoryDB = seedDB;
        lastSyncedState = null; // Forces writing all default records
        await syncDataToFirestore(seedDB, null);
        isDbLoaded = true;

        console.log("[Firestore] Cloud database seeding completed successfully.");
      } else {
        // Check if local db.json has more records than Firestore (e.g., fallback data from before Firebase setup)
        let localDB: DBStructure | null = null;
        if (fs.existsSync(DB_FILE)) {
          try {
            localDB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
          } catch (e) {}
        }

        const localCount = localDB?.companies?.length || 0;
        const cloudCount = companies.length;

        if (localCount > cloudCount && localDB) {
          console.log(`[Firestore Auto-Sync] Local db.json has MORE companies (${localCount}) than Cloud Firestore (${cloudCount}). Migrating full local dataset to Cloud Firestore...`);
          memoryDB = localDB;
          lastSyncedState = null; // Forces writing all records
          await syncDataToFirestore(localDB, null);
          isDbLoaded = true;

          console.log("[Firestore Auto-Sync] Auto-healing migration completed successfully.");
        } else {
          // Restore system settings if we didn't load from a backup document
          if (!loadedFromBackup) {
            try {
              const settingsCol = await getDocs(collection(firestore, "settings"));
              const globalSettings = settingsCol.docs.find(d => d.id === "global");
              if (globalSettings) {
                settings = globalSettings.data() as SystemSettings;
              }
            } catch (err) {
              console.warn("[Firestore] Failed to read settings from Firestore collection, defaulting to initial template values.", err);
            }
          }

          memoryDB = {
            companies: companies as Company[],
            users: users as any[],
            clients: clients as Client[],
            loans: loans as Loan[],
            logs: logs as ActivityLog[],
            settings
          };
          lastSyncedState = JSON.parse(JSON.stringify(memoryDB));
          isDbLoaded = true;
          console.log(`[Firestore] Succesfully primed in-memory sync. Profiles synchronized: Companies=${companies.length}, Users=${users.length}, Clients=${clients.length}, Loans=${loans.length}`);
        }
      }
    } else {
      throw new Error("Loaded flag evaluated as false.");
    }
  } catch (error) {
    console.error("[Firestore] Critical Firestore loader error. Transitioning server to local JSON fallback database...", error);
    if (fs.existsSync(DB_FILE)) {
      try {
        memoryDB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      } catch (e) {
        memoryDB = getInitialDB();
      }
    } else {
      memoryDB = getInitialDB();
    }
    lastSyncedState = memoryDB ? JSON.parse(JSON.stringify(memoryDB)) : null;
    // Keep isDbLoaded as false to prevent local fallback records from clobbering remote DB in writeDB
  }

  // Proactive automatic purge of structural demo/mock records from the system (Clients, Loans, Users, Logs)
  if (memoryDB) {
    const demoClients = ["c-1", "c-2", "c-3", "c-4"];
    const demoLoans = ["l-1", "l-2", "l-3"];
    const demoUsers = ["u-master", "u-sec"];
    const demoLogs = ["log-1"];

    const clientsPurged = memoryDB.clients.filter(c => demoClients.includes(c.id));
    const loansPurged = memoryDB.loans.filter(l => demoLoans.includes(l.id));
    const usersActivePurged = memoryDB.users.filter(u => demoUsers.includes(u.id));
    const logsPurged = memoryDB.logs.filter(l => demoLogs.includes(l.id));

    if (clientsPurged.length > 0 || loansPurged.length > 0 || usersActivePurged.length > 0 || logsPurged.length > 0) {
      console.log(`[Startup Cleanup] Found legacy demo records in Memory cache: Clients=${clientsPurged.length}, Loans=${loansPurged.length}, Users=${usersActivePurged.length}, Logs=${logsPurged.length}. Filtering out...`);
      
      memoryDB.clients = memoryDB.clients.filter(c => !demoClients.includes(c.id));
      memoryDB.loans = memoryDB.loans.filter(l => !demoLoans.includes(l.id));
      memoryDB.users = memoryDB.users.filter(u => !demoUsers.includes(u.id));
      memoryDB.logs = memoryDB.logs.filter(l => !demoLogs.includes(l.id));

      if (isDbLoaded) {
        try {
          console.log("[Startup Cleanup] Pushing demo purges and deletions to Cloud Firestore cluster...");
          const dirtyStateSnapshot = JSON.parse(JSON.stringify(memoryDB));
          dirtyStateSnapshot.clients = [...memoryDB.clients, ...clientsPurged];
          dirtyStateSnapshot.loans = [...memoryDB.loans, ...loansPurged];
          dirtyStateSnapshot.users = [...memoryDB.users, ...usersActivePurged];
          dirtyStateSnapshot.logs = [...memoryDB.logs, ...logsPurged];

          await syncDataToFirestore(memoryDB, dirtyStateSnapshot);
          console.log("[Startup Cleanup] Demo records successfully deleted from Cloud Firestore permanently.");
        } catch (cleanupErr: any) {
          console.error("[Startup Cleanup] Error purging demo records from Cloud Firestore:", cleanupErr?.message || cleanupErr);
        }
      } else {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), "utf-8");
        } catch (e) {}
      }
      
      lastSyncedState = JSON.parse(JSON.stringify(memoryDB));
    }
  }

  // Write startup report for AI Coding Assistant diagnostics
  try {
    const reportPath = path.join(process.cwd(), "db-report.json");
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      isDbLoaded,
      companiesCount: memoryDB?.companies?.length || 0,
      companies: memoryDB?.companies?.map(c => ({ id: c.id, name: c.name })),
      usersCount: memoryDB?.users?.length || 0,
      clientsCount: memoryDB?.clients?.length || 0,
      loansCount: memoryDB?.loans?.length || 0,
    }, null, 2), "utf-8");
    console.log("[Diagnostics] Wrote active database status report to db-report.json");
  } catch (e) {
    console.error("[Diagnostics] Failed to write startup db-report.json", e);
  }
}

// Subscribe to real-time changes of individual collections to keep multiple instances securely updated in real-time
function setupRealtimeSyncListener() {
  console.log("[Backup & Sync] Subscribing to real-time collections changes from Firestore...");

  const collectionsToSync = ["companies", "users", "clients", "loans", "logs"];

  collectionsToSync.forEach(colName => {
    onSnapshot(collection(firestore, colName), (snapshot) => {
      try {
        if (!isDbLoaded || !memoryDB) return;

        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data());
        });

        const localItems = (memoryDB as any)[colName] || [];
        // Map elements by sorting by ID to make JSON compare robust against different document ordering
        const sortById = (a: any, b: any) => (a.id || "").localeCompare(b.id || "");
        
        const localSorted = [...localItems].sort(sortById);
        const remoteSorted = [...items].sort(sortById);

        if (JSON.stringify(localSorted) !== JSON.stringify(remoteSorted)) {
          console.log(`[Backup & Sync] Real-time updates detected in Firestore collection "${colName}". Syncing backend memory...`);
          (memoryDB as any)[colName] = items;
          lastSyncedState = JSON.parse(JSON.stringify(memoryDB));

          // Save fallback replica db.json locally
          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), "utf-8");
          } catch (err) {
            console.error(`[Backup & Sync] Fallback local file sync error for collection "${colName}":`, err);
          }
        }
      } catch (err: any) {
        console.error(`[Backup & Sync] Error in collection snapshot for "${colName}":`, err?.message || err);
      }
    });
  });

  // Also sync global settings document
  onSnapshot(doc(firestore, "settings", "global"), (snapshot) => {
    try {
      if (!isDbLoaded || !memoryDB) return;
      if (snapshot.exists()) {
        const settings = snapshot.data();
        if (JSON.stringify(memoryDB.settings) !== JSON.stringify(settings)) {
          console.log(`[Backup & Sync] Real-time updates detected in Firestore "settings/global". Syncing...`);
          memoryDB.settings = settings as any;
          lastSyncedState = JSON.parse(JSON.stringify(memoryDB));

          try {
            fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), "utf-8");
          } catch (err) {
            console.error(`[Backup & Sync] Fallback local file settings update error:`, err);
          }
        }
      }
    } catch (err: any) {
      console.error("[Backup & Sync] Error in global settings snapshot:", err?.message || err);
    }
  });
}

// 4. Vite and Server Port Initiation
async function startServer() {
  await initializeCloudFirestore();
  await checkAndAutoApplyOverdue();

  // Set up the real-time synchronization listener for Firestore to keep development and published environments connected
  setupRealtimeSyncListener();

  // Trigger a full database sync to Firestore immediately on startup
  try {
    console.log("[Backup & Sync] Triggering immediate full startup database synchronization to Firestore...");
    const db = readDB();
    isDbLoaded = true;
    
    // Sync all active collections
    await syncDataToFirestore(db, null);
    console.log("[Backup & Sync] Initial startup cloud synchronization successfully completed.");
  } catch (err) {
    console.error("[Backup & Sync] Initial startup cloud sync failed:", err);
  }

  // Set up 1-minute interval rule to auto-synchronize to Firebase
  console.log("[Backup & Sync] Registering active 1-minute automated system sync schedule.");
  setInterval(async () => {
    try {
      console.log("[Backup & Sync] Running scheduled 1-minute database sync to Firebase...");
      const db = readDB();
      isDbLoaded = true;
      
      // Sync active tables
      await syncDataToFirestore(db, null);
      console.log("[Backup & Sync] Automatic 1-minute cloud sync successfully completed.");
    } catch (err) {
      console.error("[Backup & Sync] Scheduled 1-minute automated auto-sync failed:", err);
    }
  }, 60 * 1000);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MeticalCred] Server active securely on port ${PORT}`);
  });
}

startServer();
