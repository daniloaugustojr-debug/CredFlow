import React, { useState } from "react";
import { User, UserPermissions, Company } from "../types";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Trash2,
  Key,
  Unlock,
  Check,
  Plus,
  X,
  UserMinus,
  Settings,
  Eye,
  Edit,
  Building,
  ChevronDown
} from "lucide-react";

interface UsersViewProps {
  users: User[];
  currentUser: User;
  onSaveUser: (userData: Partial<User> & { password?: string }) => void;
  onDeleteUser: (id: string) => void;
  companies?: Company[];
  activeCompanyId?: string;
  setActiveCompanyId?: (id: string) => void;
}

export default function UsersView({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  companies,
  activeCompanyId,
  setActiveCompanyId,
}: UsersViewProps) {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("SECONDARY_USER");
  const [status, setStatus] = useState<User["status"]>("active");

  // Advanced permission locks state
  const [permDashboard, setPermDashboard] = useState(true);
  const [permClients, setPermClients] = useState(true);
  const [permInsert, setPermInsert] = useState(true);
  const [permEdit, setPermEdit] = useState(true);
  const [permDelete, setPermDelete] = useState(false);
  const [permApprove, setPermApprove] = useState(false);
  const [permRates, setPermRates] = useState(false);
  const [permUsers, setPermUsers] = useState(false);
  const [permReports, setPermReports] = useState(true);

  const resetForm = () => {
    setFullName("");
    setPhone("+258 ");
    setPassword("");
    setRole("SECONDARY_USER");
    setStatus("active");
    setPermDashboard(true);
    setPermClients(true);
    setPermInsert(true);
    setPermEdit(true);
    setPermDelete(false);
    setPermApprove(false);
    setPermRates(false);
    setPermUsers(false);
    setPermReports(true);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    resetForm();
    setIsOpenForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setPhone(user.phone);
    setPassword("");
    setRole(user.role);
    setStatus(user.status);
    setPermDashboard(user.permissions.viewDashboard);
    setPermClients(user.permissions.viewClients);
    setPermInsert(user.permissions.insertData);
    setPermEdit(user.permissions.editData);
    setPermDelete(user.permissions.deleteData);
    setPermApprove(user.permissions.approveLoans);
    setPermRates(user.permissions.manageRates);
    setPermUsers(user.permissions.manageUsers || false);
    setPermReports(user.permissions.exportReports || false);
    setIsOpenForm(true);
  };

  const handleRoleChange = (selectedRole: User["role"]) => {
    setRole(selectedRole);
    // Standard role-based access settings
    if (selectedRole === "SUPER_ADMIN") {
      setPermDashboard(true);
      setPermClients(true);
      setPermInsert(true);
      setPermEdit(true);
      setPermDelete(true);
      setPermApprove(true);
      setPermRates(true);
      setPermUsers(true);
      setPermReports(true);
    } else if (selectedRole === "MASTER_USER") {
      setPermDashboard(true);
      setPermClients(true);
      setPermInsert(true);
      setPermEdit(true);
      setPermDelete(false);
      setPermApprove(true); // Can receive loan approval permission
      setPermRates(false);
      setPermUsers(false);
      setPermReports(true);
    } else {
      // Secondary
      setPermDashboard(true);
      setPermClients(true);
      setPermInsert(true);
      setPermEdit(true);
      setPermDelete(false);
      setPermApprove(false);
      setPermRates(false);
      setPermUsers(false);
      setPermReports(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || (!editingUser && !password)) {
      alert("Por favor insira Nome, Telefone e uma Palavra-passe forte.");
      return;
    }

    const payloadPermissions: UserPermissions = {
      viewDashboard: permDashboard,
      viewClients: permClients,
      insertData: permInsert,
      editData: permEdit,
      deleteData: permDelete,
      approveLoans: permApprove,
      manageRates: permRates,
      manageUsers: permUsers,
      exportReports: permReports,
    };

    onSaveUser({
      ...(editingUser && { id: editingUser.id }),
      fullName,
      phone,
      role,
      status,
      permissions: payloadPermissions,
      ...(password && { password }),
    });

    setIsOpenForm(false);
  };

  const handleToggleState = (user: User) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    onSaveUser({
      id: user.id,
      status: nextStatus,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-slate-900 dark:text-white">
            Utilizadores do Sistema
          </h2>
          <p className="text-sm text-slate-500">
            Administre credenciais, níveis de privilégio (Role Based Access Control) e suspenda contas operadoras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser.role === "SUPER_ADMIN" && companies && companies.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-150/45 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-450 dark:text-slate-500 font-bold">
                Empresa Alvo:
              </span>
              <div className="relative flex items-center pr-5">
                <select
                  value={activeCompanyId}
                  onChange={(e) => setActiveCompanyId?.(e.target.value)}
                  className="bg-transparent py-0.5 pl-1 rounded text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-sans border-none appearance-none"
                >
                  {companies.map((comp) => (
                    <option key={comp.id} value={comp.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {comp.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-0 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {(currentUser.role === "SUPER_ADMIN" || currentUser.role === "MASTER_USER") && (
            <button
              onClick={handleNewUser}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md"
            >
              <UserPlus size={16} />
              Novo Colaborador
            </button>
          )}
        </div>
      </div>

      {/* Users grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => {
          const isMe = user.id === currentUser.id;
          return (
            <div
              key={user.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 ${
                user.status === "disabled"
                  ? "border-rose-200/55 bg-rose-50/10 opacity-75"
                  : "border-slate-100 dark:border-slate-800"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500/35 flex items-center justify-center font-bold text-slate-800 dark:text-slate-250 font-display">
                      {user.fullName[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white font-sans text-sm flex items-center gap-2 flex-wrap">
                        {user.fullName} {isMe && <span className="text-[10px] text-indigo-500 font-bold">(Eu)</span>}
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-200/40 dark:border-slate-800">
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? "bg-emerald-500 animate-pulse shadow shadow-emerald-500" : "bg-rose-500"}`}></span>
                          <span className="text-[9px] font-mono text-slate-400 font-medium">
                            {user.isOnline ? "Online" : "Offline"}
                          </span>
                        </span>
                      </h4>
                      <span className="text-xs font-mono text-slate-400">{user.phone}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide border ${
                      user.role === "SUPER_ADMIN"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : user.role === "MASTER_USER"
                          ? "bg-amber-150 text-amber-850 border-amber-200"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Permissions badge details */}
                <div className="py-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest block mb-2">
                    Níveis de Acesso Permitidos
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.approveLoans && (
                      <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                        Aprovar Empréstimos
                      </span>
                    )}
                    {user.permissions.insertData && (
                      <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full font-semibold">
                        Inserir Dados
                      </span>
                    )}
                    {user.permissions.editData && (
                      <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 px-2 py-0.5 rounded-full font-semibold">
                        Editar Dados
                      </span>
                    )}
                    {user.permissions.deleteData && (
                      <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 px-2 py-0.5 rounded-full font-semibold">
                        Eliminar Registos
                      </span>
                    )}
                    {!user.permissions.deleteData && !user.permissions.approveLoans && (
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                        Visualização e Rotina
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status or administrator controls */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-805 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-xl">
                <span className="text-xs text-slate-400">
                  Estado:{" "}
                  <strong className={user.status === "active" ? "text-emerald-500" : "text-rose-500"}>
                    {user.status === "active" ? "Activo" : "Bloqueado"}
                  </strong>
                </span>

                {(currentUser.role === "SUPER_ADMIN" || (currentUser.role === "MASTER_USER" && user.role === "SECONDARY_USER") || isMe) ? (
                  <div className="flex items-center gap-1.5">
                    {/* Edit button */}
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-1 px-2 text-[10px] font-bold tracking-wider uppercase bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded transition cursor-pointer flex items-center gap-1"
                      title="Editar Colaborador"
                    >
                      <Edit size={11} /> Editar
                    </button>

                    {!isMe && (currentUser.role === "SUPER_ADMIN" || (currentUser.role === "MASTER_USER" && user.role === "SECONDARY_USER")) && (
                      <>
                        {/* Toggle lock */}
                        <button
                          onClick={() => handleToggleState(user)}
                          className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase border border-slate-205 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          {user.status === "active" ? (
                            <span className="text-rose-500 flex items-center gap-1">
                              <UserMinus size={11} /> Bloquear
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <ShieldCheck size={11} /> Reativar
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => onDeleteUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition hover:bg-slate-150 rounded"
                          title="Excluir Colaborador"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW USER DIALOG FORM */}
      {isOpenForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display font-semibold text-base text-slate-950 dark:text-white">
                {editingUser ? "Editar Colaborador & Credenciais" : "Cadastrar Colaborador & Credenciais"}
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
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do Operador"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Telephone */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Número de Telefone (Contacto de Acesso) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+258 "
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs font-mono px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {editingUser ? "Alterar Palavra-passe de Login (deixe em branco para manter)" : "Definir Palavra-passe de Login *"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? "Nova senha para acesso (opcional)" : "Defina a senha padrão para login"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Status Select for Editing */}
              {editingUser && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Estado da Conta (Acesso Ativo / Suspenso)
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as User["status"])}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none cursor-pointer font-sans"
                  >
                    <option value="active">Activo (Acesso Liberado)</option>
                    <option value="disabled">Bloqueado (Acesso Suspenso)</option>
                  </select>
                </div>
              )}

              {/* Role Select */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Função / Papel Corporativo
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as User["role"])}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 dark:text-white outline-none cursor-pointer"
                  disabled={currentUser.role === "MASTER_USER"}
                >
                  <option value="SECONDARY_USER">Utilizador Secundário (Apenas Inserir/Visualizar)</option>
                  {currentUser.role !== "MASTER_USER" && (
                    <>
                      <option value="MASTER_USER">Master User (Aprovar Crédito, Permissões Estendidas)</option>
                      <option value="SUPER_ADMIN">Super Admin (Nível Completo de Gestão)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Custom capabilities layout locks */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block mb-1">
                  Afinar Permissões de Acesso (RBAC)
                </span>

                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permClients}
                      onChange={(e) => setPermClients(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Ver Clientes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permInsert}
                      onChange={(e) => setPermInsert(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Inserir Registos
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permEdit}
                      disabled={role === "SECONDARY_USER"}
                      onChange={(e) => setPermEdit(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Editar Registos
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permDelete}
                      disabled={role !== "SUPER_ADMIN"}
                      onChange={(e) => setPermDelete(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Eliminar Registos
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permApprove}
                      disabled={role === "SECONDARY_USER"}
                      onChange={(e) => setPermApprove(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Aprovar Empréstimos
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permRates}
                      disabled={role !== "SUPER_ADMIN"}
                      onChange={(e) => setPermRates(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    Gerir Taxas
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpenForm(false)}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-xl font-medium text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  {editingUser ? "Guardar Alterações" : "Confirmar Cadastro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
