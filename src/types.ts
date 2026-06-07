export type UserRole = 'SUPER_ADMIN' | 'MASTER_USER' | 'SECONDARY_USER';

export interface UserPermissions {
  viewDashboard: boolean;
  viewClients: boolean;
  insertData: boolean;
  editData: boolean;
  deleteData: boolean;
  approveLoans: boolean;
  manageRates: boolean;
  manageUsers: boolean;
  exportReports: boolean;
}

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermissions;
  status: 'active' | 'disabled';
  companyId?: string; // Tenant identification
  isOnline?: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  idPassport: string;
  address: string;
  avatarUrl?: string; // or base64
  financialStatus: 'EXCELLENT' | 'STABLE' | 'RISKY' | 'DELINQUENT';
  notes?: string;
  companyId?: string; // Tenant identification
  createdAt: string;
  birthDate?: string;
  idExpiryDate?: string;
  biAttachment?: string;
  guaranteeAttachment?: string;
  guaranteeDescription?: string;
  guaranteeEstimatedValue?: number;
  guaranteePhotos?: string[];
}

export interface LoanPayment {
  id: string;
  paymentDate: string;
  amount: number;
  penaltyPaid: number;
  paymentMethod: string;
  receiptNumber: string;
  receivedBy: string;
}

export interface Loan {
  id: string;
  clientId: string;
  clientName: string; // denormalized for search / quick access
  principalAmount: number;
  interestRate: number; // monthly interest rate in %
  termMonths: number;
  totalInterest: number;
  totalDue: number;
  outstandingBalance: number;
  installmentAmount: number;
  startDate: string;
  dueDate: string;
  status: 'ACTIVE' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  penaltyRate: number; // default penalty rate in % for late payments
  lateFeePenaltyApplied: number; // current overdue penalty amount
  paymentFrequency?: string; // New field for predefined frequency (e.g. "Mensal", "Semanal", "Diário")
  biAttachment?: string; // Base64 payload or URL
  guaranteeAttachment?: string; // Base64 payload or URL
  guaranteeDescription?: string;
  guaranteeEstimatedValue?: number;
  guaranteePhotos?: string[];
  companyId?: string; // Tenant identification
  payments: LoanPayment[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  companyId?: string; // Tenant identification
  timestamp: string;
}

export interface DashboardStats {
  totalAmountLoaned: number;
  totalRecovered: number;
  activeClientsCount: number;
  overdueLoansCount: number;
  estimatedProfit: number;
  totalLoansVolume: number;
}

export interface SystemSettings {
  defaultInterestRate: number;
  defaultPenaltyRate: number;
  currencySymbol: string;
  companyName: string;
  companyNuit: string; // Mozambican tax number
  companyAddress: string;
  companyLogoUrl?: string;
  plan?: 'BASICO' | 'PRO' | 'PREMIUM';
  availableRates?: number[];
  availableTerms?: number[];
  availablePaymentFrequencies?: string[];
}

export interface Company {
  id: string;
  name: string;
  nuit: string;
  address: string;
  logoUrl?: string;
  plan?: 'BASICO' | 'PRO' | 'PREMIUM';
  settings: SystemSettings;
  createdAt: string;
  initialBalance?: number;
  currentBalance?: number;
  capitalHistory?: Array<{
    id: string;
    date: string;
    type: 'INITIAL' | 'REINFORCEMENT' | 'LOAN_DISBURSEMENT' | 'LOAN_REPAYMENT';
    amount: number;
    description: string;
    userFullName: string;
  }>;
}
