// frontend/src/pages/AdminPage.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllUsers, createUser, updateUser, deleteUser, fetchAllAdminPatients, createPatient, deletePatient, fetchAllAssignments } from '../api/adminApi';
import { updateAssignmentStatus } from '../api/programApi';
import { removeProgramAssignment } from '../api/patientApi';
import UserFormModal from '../components/admin/UserFormModal';
import PatientForm from '../components/patient/PatientForm';
import AssignmentModal from '../components/admin/AssignmentModal';
import TransferAssignmentsModal from '../components/admin/TransferAssignmentsModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faSpinner, faExclamationTriangle, faUserPlus, faUsers, faUserGraduate, faEdit, faTrashAlt, faSearch, faCogs, faArchive, faUndo, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';

// Componente UserList (sem alterações)
const UserList = ({ users, onEditClick, onDeleteClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Criação</th>
            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.username}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_admin ? 'bg-green-100 text-green-800' : user.role === 'pai' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                  {user.is_admin ? 'Admin' : user.role === 'pai' ? 'Pai/Mãe' : 'Terapeuta'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.created_at)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                {!user.is_admin && (
                    <>
                        <button onClick={() => onEditClick(user)} className="text-indigo-600 hover:text-indigo-900"> <FontAwesomeIcon icon={faEdit} className="mr-1 h-3 w-3" /> Editar </button>
                        <button onClick={() => onDeleteClick(user)} className="text-red-600 hover:text-red-900"> <FontAwesomeIcon icon={faTrashAlt} className="mr-1 h-3 w-3" /> Apagar </button>
                    </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && ( <div className="text-center py-8 text-gray-500"><FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mb-2" /><p>Nenhum utilizador encontrado.</p></div> )}
    </div>
  );
};

// Componente PatientList (sem alterações)
const PatientList = ({ patients, onManageClick, onDeleteClick }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Paciente</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Nasc.</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnóstico</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {patients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(patient.dob)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.diagnosis || 'Não informado'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                <button onClick={() => onManageClick(patient)} className="text-indigo-600 hover:text-indigo-900">Gerir Terapeutas</button>
                                <button onClick={() => onDeleteClick(patient)} className="text-red-600 hover:text-red-900"> <FontAwesomeIcon icon={faTrashAlt} className="mr-1 h-3 w-3" /> Apagar </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {patients.length === 0 && ( <div className="text-center py-8 text-gray-500"><FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mb-2" /><p>Nenhum paciente encontrado nesta clínica.</p></div> )}
        </div>
    );
};

// Novo Componente AssignmentList
const AssignmentList = ({ assignments, onArchiveClick, onDeleteClick, onRestoreClick, onPauseClick, onResumeClick }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'active':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Ativo</span>;
            case 'archived':
                return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Arquivado</span>;
            case 'paused':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pausado</span>;
            default:
                return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Desconhecido</span>;
        }
    };

    const renderActions = (assignment) => {
        switch(assignment.status) {
            case 'active':
                return (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => onArchiveClick(assignment)}
                            className="text-yellow-600 hover:text-yellow-900 text-sm"
                            title="Arquivar programa"
                        >
                            <FontAwesomeIcon icon={faArchive} className="mr-1" /> Arquivar
                        </button>
                        <button
                            onClick={() => onPauseClick(assignment)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                            title="Pausar programa"
                        >
                            <FontAwesomeIcon icon={faPause} className="mr-1" /> Pausar
                        </button>
                    </div>
                );
            case 'archived':
                return (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => onRestoreClick(assignment)}
                            className="text-green-600 hover:text-green-900 text-sm"
                            title="Restaurar programa"
                        >
                            <FontAwesomeIcon icon={faUndo} className="mr-1" /> Restaurar
                        </button>
                        <button
                            onClick={() => onDeleteClick(assignment)}
                            className="text-red-600 hover:text-red-900 text-sm"
                            title="Deletar permanentemente"
                        >
                            <FontAwesomeIcon icon={faTrashAlt} className="mr-1" /> Deletar
                        </button>
                    </div>
                );
            case 'paused':
                return (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => onResumeClick(assignment)}
                            className="text-green-600 hover:text-green-900 text-sm"
                            title="Retomar programa"
                        >
                            <FontAwesomeIcon icon={faPlay} className="mr-1" /> Retomar
                        </button>
                        <button
                            onClick={() => onArchiveClick(assignment)}
                            className="text-yellow-600 hover:text-yellow-900 text-sm"
                            title="Arquivar programa"
                        >
                            <FontAwesomeIcon icon={faArchive} className="mr-1" /> Arquivar
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programa</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terapeuta</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessões</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Sessão</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                        <tr key={assignment.assignment_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assignment.patient_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="max-w-xs truncate" title={assignment.program_name}>
                                    {assignment.program_name}
                                </div>
                                {assignment.has_custom_trials && (
                                    <div className="text-xs text-blue-600">Tentativas customizadas</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.therapist_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(assignment.status)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {assignment.total_sessions}
                                {assignment.total_sessions > 0 && assignment.average_score > 0 && (
                                    <div className="text-xs text-green-600">{assignment.average_score.toFixed(1)}% média</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(assignment.last_session_date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                {renderActions(assignment)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {assignments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mb-2" />
                    <p>Nenhuma atribuição encontrada nesta clínica.</p>
                </div>
            )}
        </div>
    );
};


const AdminPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [therapistToDelete, setTherapistToDelete] = useState(null);
  const [patientToManage, setPatientToManage] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
        const [fetchedUsers, fetchedPatients, fetchedAssignments] = await Promise.all([
            fetchAllUsers(token),
            fetchAllAdminPatients(token),
            fetchAllAssignments(token)
        ]);
        setUsers(fetchedUsers);
        setPatients(fetchedPatients);
        setAssignments(fetchedAssignments);
    } catch (err) {
        setError(err.message || 'Ocorreu um erro ao carregar os dados.');
    } finally {
        setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() =>
    users.filter(user =>
      user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase())
    ), [users, userSearchTerm]);

  const filteredPatients = useMemo(() =>
    patients.filter(patient =>
      patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase())
    ), [patients, patientSearchTerm]);

  const filteredAssignments = useMemo(() =>
    assignments.filter(assignment => {
      const matchesSearch =
        assignment.patient_name.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) ||
        assignment.program_name.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) ||
        assignment.therapist_name.toLowerCase().includes(assignmentSearchTerm.toLowerCase());

      const matchesStatus = assignmentStatusFilter === 'all' || assignment.status === assignmentStatusFilter;

      return matchesSearch && matchesStatus;
    }), [assignments, assignmentSearchTerm, assignmentStatusFilter]);


  const handleSaveUser = useCallback(async (userData) => {
    try {
        if (userToEdit) { await updateUser(userToEdit.id, userData, token); } 
        else { await createUser(userData, token); }
        await loadData();
    } catch (err) { throw err; }
  }, [token, loadData, userToEdit]);

  const handleSavePatient = useCallback(async (patientData) => {
    try { await createPatient(patientData, token); await loadData(); } catch(err) { throw err; }
  }, [token, loadData]);
  
  const handleDeleteUser = useCallback(async (userToDelete) => {
    // Para pais, exclusão direta
    if (userToDelete.role === 'pai') {
      if (window.confirm(`Tem a certeza que deseja apagar o utilizador "${userToDelete.full_name}"? Esta ação não pode ser desfeita.`)) {
        try {
          await deleteUser(userToDelete.id, token);
          await loadData();
        } catch(err) {
          alert(`Erro ao apagar utilizador: ${err.message}`);
        }
      }
      return;
    }

    // Para terapeutas, tentar exclusão e verificar se precisa transferência
    if (userToDelete.role === 'terapeuta') {
      try {
        await deleteUser(userToDelete.id, token);
        await loadData();
      } catch(err) {
        if (err.requiresTransfer) {
          // Abrir modal de transferência
          setTherapistToDelete(userToDelete);
          setIsTransferModalOpen(true);
        } else {
          alert(`Erro ao apagar utilizador: ${err.message}`);
        }
      }
    }
  }, [token, loadData]);

  const handleTransferComplete = useCallback(async () => {
    try {
      // Após transferência, tentar deletar novamente
      await deleteUser(therapistToDelete.id, token);
      await loadData();
      setIsTransferModalOpen(false);
      setTherapistToDelete(null);
      alert('Terapeuta removido com sucesso após transferência das atribuições!');
    } catch(err) {
      alert(`Erro ao remover terapeuta após transferência: ${err.message}`);
    }
  }, [therapistToDelete, token, loadData]);
  
  const handleDeletePatient = useCallback(async (patientToDelete) => {
    if (window.confirm(`Tem a certeza que deseja apagar o paciente "${patientToDelete.name}"? Esta ação não pode ser desfeita e irá remover todos os dados associados.`)) {
        try { await deletePatient(patientToDelete.id, token); await loadData(); }
        catch(err) { alert(`Erro ao apagar paciente: ${err.message}`); }
    }
  }, [token, loadData]);

  // Handlers para Assignment operations
  const handleArchiveAssignment = useCallback(async (assignment) => {
    if (window.confirm(`Arquivar programa "${assignment.program_name}" do paciente "${assignment.patient_name}"?`)) {
      try {
        await updateAssignmentStatus(assignment.assignment_id, 'archived');
        await loadData();
      } catch (err) {
        alert(`Erro ao arquivar: ${err.message}`);
      }
    }
  }, [loadData]);

  const handleDeleteAssignment = useCallback(async (assignment) => {
    if (window.confirm(`DELETAR PERMANENTEMENTE programa "${assignment.program_name}" do paciente "${assignment.patient_name}"? Esta ação NÃO pode ser desfeita!`)) {
      try {
        await removeProgramAssignment(assignment.assignment_id, token);
        await loadData();
      } catch (err) {
        alert(`Erro ao deletar: ${err.message}`);
      }
    }
  }, [token, loadData]);

  const handleRestoreAssignment = useCallback(async (assignment) => {
    if (window.confirm(`Restaurar programa "${assignment.program_name}" do paciente "${assignment.patient_name}"?`)) {
      try {
        await updateAssignmentStatus(assignment.assignment_id, 'active');
        await loadData();
      } catch (err) {
        alert(`Erro ao restaurar: ${err.message}`);
      }
    }
  }, [loadData]);

  const handlePauseAssignment = useCallback(async (assignment) => {
    if (window.confirm(`Pausar programa "${assignment.program_name}" do paciente "${assignment.patient_name}"?`)) {
      try {
        await updateAssignmentStatus(assignment.assignment_id, 'paused');
        await loadData();
      } catch (err) {
        alert(`Erro ao pausar: ${err.message}`);
      }
    }
  }, [loadData]);

  const handleResumeAssignment = useCallback(async (assignment) => {
    if (window.confirm(`Retomar programa "${assignment.program_name}" do paciente "${assignment.patient_name}"?`)) {
      try {
        await updateAssignmentStatus(assignment.assignment_id, 'active');
        await loadData();
      } catch (err) {
        alert(`Erro ao retomar: ${err.message}`);
      }
    }
  }, [loadData]);

  const handleOpenAssignmentModal = (patient) => {
    setPatientToManage(patient);
    setIsAssignmentModalOpen(true);
  };
  
  const handleOpenCreateUserModal = () => {
    setUserToEdit(null);
    setIsUserModalOpen(true);
  };
  
  const handleOpenEditUserModal = (user) => {
    setUserToEdit(user);
    setIsUserModalOpen(true);
  };

  const allTherapists = useMemo(() => users.filter(u => u.role === 'terapeuta' && !u.is_admin), [users]);

  const TabButton = ({ tabName, activeTab, setTab, icon, children }) => (
      <button onClick={() => setTab(tabName)} className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`} >
          <FontAwesomeIcon icon={icon} className="mr-2" />
          {children}
      </button>
  );

  const renderHeader = () => {
      const isUsersTab = activeTab === 'users';
      const isPatientsTab = activeTab === 'patients';
      const showAddButton = isUsersTab || isPatientsTab;

      return (
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <FontAwesomeIcon icon={faUserShield} className="mr-3 text-indigo-500" />
                Painel de Administração
            </h1>
            {showAddButton && (
              <button
                  onClick={() => isUsersTab ? handleOpenCreateUserModal() : setIsPatientModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow hover:shadow-md flex items-center"
              >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  {isUsersTab ? 'Adicionar Utilizador' : 'Adicionar Paciente'}
              </button>
            )}
        </div>
      )
  }

  const renderSearchInput = () => {
    if (activeTab === 'users') {
        return (
            <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar por nome ou username..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} className="w-full sm:w-72 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
        )
    }
    if (activeTab === 'patients') {
        return (
            <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar por nome de paciente..." value={patientSearchTerm} onChange={e => setPatientSearchTerm(e.target.value)} className="w-full sm:w-72 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
        )
    }
    if (activeTab === 'assignments') {
        return (
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar paciente, programa ou terapeuta..."
                        value={assignmentSearchTerm}
                        onChange={e => setAssignmentSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                </div>
                <select
                    value={assignmentStatusFilter}
                    onChange={e => setAssignmentStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativos</option>
                    <option value="archived">Arquivados</option>
                    <option value="paused">Pausados</option>
                </select>
            </div>
        )
    }
    return null;
  }

  return (
    <>
      <div className="fade-in">
        {renderHeader()}
        <div className="mb-4 border-b border-gray-200">
            <nav className="flex space-x-2" aria-label="Tabs">
                <TabButton tabName="users" activeTab={activeTab} setTab={setActiveTab} icon={faUsers}>Utilizadores</TabButton>
                <TabButton tabName="patients" activeTab={activeTab} setTab={setActiveTab} icon={faUserGraduate}>Pacientes</TabButton>
                <TabButton tabName="assignments" activeTab={activeTab} setTab={setActiveTab} icon={faCogs}>Programas Atribuídos</TabButton>
            </nav>
        </div>

        <div className="mb-4">
            {renderSearchInput()}
        </div>

        {isLoading ? (
            <div className="flex justify-center items-center h-64"> <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500" /> </div>
        ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md"> <p className="font-bold">Erro</p> <p>{error}</p> </div>
        ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                {activeTab === 'users' && <UserList users={filteredUsers} onEditClick={handleOpenEditUserModal} onDeleteClick={handleDeleteUser} />}
                {activeTab === 'patients' && <PatientList patients={filteredPatients} onManageClick={handleOpenAssignmentModal} onDeleteClick={handleDeletePatient} />}
                {activeTab === 'assignments' && (
                    <AssignmentList
                        assignments={filteredAssignments}
                        onArchiveClick={handleArchiveAssignment}
                        onDeleteClick={handleDeleteAssignment}
                        onRestoreClick={handleRestoreAssignment}
                        onPauseClick={handlePauseAssignment}
                        onResumeClick={handleResumeAssignment}
                    />
                )}
            </div>
        )}
      </div>
      
      {/* <<< ATUALIZADO: Passa a lista de pacientes para o modal >>> */}
      <UserFormModal 
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
        userToEdit={userToEdit}
        patients={patients} 
      />
      <PatientForm isOpen={isPatientModalOpen} onClose={() => setIsPatientModalOpen(false)} onSave={handleSavePatient} patientToEdit={null} />
      <AssignmentModal isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} patient={patientToManage} allTherapists={allTherapists} />

      {/* <<< NOVO MODAL DE TRANSFERÊNCIA >>> */}
      <TransferAssignmentsModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTherapistToDelete(null);
        }}
        therapistToDelete={therapistToDelete}
        availableTherapists={allTherapists}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
};

export default AdminPage;
