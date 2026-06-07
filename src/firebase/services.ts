import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "./config";
import { Client, Loan, User, ActivityLog, Company } from "../types";

// Core Multi-Tenant Database Path Helpers
export function getCompanyRef(companyId: string) {
  return doc(db, "empresas", companyId);
}

export function getUsersCollection(companyId: string) {
  return collection(db, "empresas", companyId, "usuarios");
}

export function getClientsCollection(companyId: string) {
  return collection(db, "empresas", companyId, "clientes");
}

export function getLoansCollection(companyId: string) {
  return collection(db, "empresas", companyId, "creditos");
}

export function getPaymentsCollection(companyId: string) {
  return collection(db, "empresas", companyId, "pagamentos");
}

export function getLogsCollection(companyId: string) {
  return collection(db, "empresas", companyId, "relatorios");
}

// Data Access Layer Services 

// 1. Company Services
export async function getCompany(companyId: string): Promise<Company | null> {
  const docRef = getCompanyRef(companyId);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as Company) : null;
}

export async function createOrUpdateCompany(companyId: string, company: Partial<Company>) {
  const docRef = getCompanyRef(companyId);
  await setDoc(docRef, company, { merge: true });
}

// 2. User Services
export async function getCompanyUsers(companyId: string): Promise<User[]> {
  const colRef = getUsersCollection(companyId);
  const snap = await getDocs(colRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function createCompanyUser(companyId: string, userId: string, userData: Partial<User>) {
  const docRef = doc(getUsersCollection(companyId), userId);
  await setDoc(docRef, userData, { merge: true });
}

// 3. Client Services
export async function getCompanyClients(companyId: string): Promise<Client[]> {
  const colRef = getClientsCollection(companyId);
  const snap = await getDocs(colRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
}

export async function createCompanyClient(companyId: string, client: Client) {
  const docRef = doc(getClientsCollection(companyId), client.id);
  await setDoc(docRef, client);
}

export async function deleteCompanyClient(companyId: string, clientId: string) {
  const docRef = doc(getClientsCollection(companyId), clientId);
  await deleteDoc(docRef);
}

// 4. Loan Services
export async function getCompanyLoans(companyId: string): Promise<Loan[]> {
  const colRef = getLoansCollection(companyId);
  const snap = await getDocs(colRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
}

export async function createCompanyLoan(companyId: string, loan: Loan) {
  const docRef = doc(getLoansCollection(companyId), loan.id);
  await setDoc(docRef, loan);
}

// 5. Activity Logging Service
export async function logSystemAction(companyId: string, action: ActivityLog) {
  const docRef = doc(getLogsCollection(companyId), action.id);
  await setDoc(docRef, action);
}
