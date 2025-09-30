// frontend/src/pages/AdminPage.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAllUsers, createUser, updateUser, deleteUser, fetchAllAdminPatients, createPatient, deletePatient, fetchAllAssignments } from '../api/adminApi';
import { updateAssignmentStatus } from '../api/programApi';
import { removeProgramAssignment } from '../api/patientApi';
import UserFormModal from '../components/admin/UserFormModal';
import ExpandedPatientForm from '../components/patient/ExpandedPatientForm';
import AssignmentModal from '../components/admin/AssignmentModal';
import TransferAssignmentsModal from '../components/admin/TransferAssignmentsModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faSpinner, faExclamationTriangle, faUserPlus, faUsers, faUserGraduate, faEdit, faTrashAlt, faSearch, faCogs, faArchive, faUndo, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';

// Componente UserList com melhorias estéticas sutis mantendo funcionalidade
const UserList = ({ users, onEditClick, onDeleteClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-gray-50 to-slate-50">
          <tr>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Nome Completo</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Username</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Função</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Data de Criação</th>
            <th scope="col" className="relative px-6 py-4 border-b border-gray-200"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {users.map((user, index) => (
            <tr key={user.id} className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      user.is_admin ? 'bg-purple-100 text-purple-600' :
                      user.role === 'pai' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      <FontAwesomeIcon icon={
                        user.is_admin ? faUserShield :
                        user.role === 'pai' ? faUsers :
                        faUserGraduate
                      } className="text-sm" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {user.username}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.is_admin ? 'bg-purple-100 text-purple-800' :
                  user.role === 'pai' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {user.is_admin ? 'Admin' : user.role === 'pai' ? 'Pai/Mãe' : 'Terapeuta'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.created_at)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {!user.is_admin && (
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEditClick(user)}
                      className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors duration-200"
                    >
                      <FontAwesomeIcon icon={faEdit} className="mr-1 h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => onDeleteClick(user)}
                      className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded-md transition-colors duration-200"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} className="mr-1 h-3 w-3" /> Apagar
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-slate-50">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-gray-400 mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Nenhum utilizador encontrado</h3>
          <p className="text-sm text-gray-500">Não há utilizadores que correspondam aos critérios de busca.</p>
        </div>
      )}
    </div>
  );
};

// Componente PatientList com melhorias estéticas sutis mantendo funcionalidade
const PatientList = ({ patients, onManageClick, onEditClick, onDeleteClick }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Paciente</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Idade</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Data de Nasc.</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Diagnóstico</th>
                        <th scope="col" className="relative px-6 py-4 border-b border-gray-200"><span className="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {patients.map((patient, index) => {
                        const age = calculateAge(patient.dob);
                        return (
                            <tr key={patient.id} className={`hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-8 w-8">
                                            <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faUserGraduate} className="text-sm" />
                                            </div>
                                        </div>
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {age !== null ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {age} anos
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-500">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(patient.dob)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        patient.diagnosis ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {patient.diagnosis || 'Não informado'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button
                                            onClick={() => onEditClick(patient)}
                                            className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded-md transition-colors duration-200"
                                        >
                                            <FontAwesomeIcon icon={faEdit} className="mr-1 h-3 w-3" /> Editar
                                        </button>
                                        <button
                                            onClick={() => onManageClick(patient)}
                                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded-md transition-colors duration-200"
                                        >
                                            <FontAwesomeIcon icon={faCogs} className="mr-1 h-3 w-3" /> Gerir Terapeutas
                                        </button>
                                        <button
                                            onClick={() => onDeleteClick(patient)}
                                            className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded-md transition-colors duration-200"
                                        >
                                            <FontAwesomeIcon icon={faTrashAlt} className="mr-1 h-3 w-3" /> Apagar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {patients.length === 0 && (
                <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50">
                    <FontAwesomeIcon icon={faUserGraduate} className="text-3xl text-green-400 mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Nenhum paciente encontrado</h3>
                    <p className="text-sm text-gray-500">Não há pacientes nesta clínica que correspondam aos critérios de busca.</p>
                </div>
            )}
        </div>
    );
};

// Componente AssignmentList com melhorias estéticas sutis mantendo funcionalidade
const AssignmentList = ({ assignments, onArchiveClick, onDeleteClick, onRestoreClick, onPauseClick, onResumeClick }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'active':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>;
            case 'archived':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Arquivado</span>;
            case 'paused':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pausado</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Desconhecido</span>;
        }
    };

    const renderActions = (assignment) => {
        const actions = [];

        switch(assignment.status) {
            case 'active':
                actions.push(
                    <button
                        key="archive"
                        onClick={() => onArchiveClick(assignment)}
                        className="text-amber-600 hover:text-amber-900 hover:bg-amber-50 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        title="Arquivar programa"
                    >
                        <FontAwesomeIcon icon={faArchive} className="mr-1" /> Arquivar
                    </button>,
                    <button
                        key="pause"
                        onClick={() => onPauseClick(assignment)}
                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        title="Pausar programa"
                    >
                        <FontAwesomeIcon icon={faPause} className="mr-1" /> Pausar
                    </button>
                );
                break;
            case 'archived':
                actions.push(
                    <button
                        key="restore"
                        onClick={() => onRestoreClick(assignment)}
                        className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        title="Restaurar programa"
                    >
                        <FontAwesomeIcon icon={faUndo} className="mr-1" /> Restaurar
                    </button>,
                    <button
                        key="delete"
                        onClick={() => onDeleteClick(assignment)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        title="Deletar permanentemente"
                    >
                        <FontAwesomeIcon icon={faTrashAlt} className="mr-1" /> Deletar
                    </button>
                );
                break;
            case 'paused':
                actions.push(
                    <button
                        key="resume"
                        onClick={() => onResumeClick(assignment)}
                        className="text-green-600 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        title="Retomar programa"
                    >
                        <FontAwesomeIcon icon={faPlay} className="mr-1" /> Retomar
                    </button>,
                    <button
                        key="archive2"
                        onClick={() => onArchiveClick(assignment)}
                        className="text-amber-600 hover:text-amber-900 hover:bg-amber-50 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        title="Arquivar programa"
                    >
                        <FontAwesomeIcon icon={faArchive} className="mr-1" /> Arquivar
                    </button>
                );
                break;
        }

        return (
            <div className="flex flex-col space-y-1">
                {actions}
            </div>
        );
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Paciente</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Programa</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Terapeuta</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Sessões</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">Última Sessão</th>
                        <th scope="col" className="relative px-6 py-4 border-b border-gray-200"><span className="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {assignments.map((assignment, index) => (
                        <tr key={assignment.assignment_id} className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-8 w-8">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faUserGraduate} className="text-sm" />
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-sm font-medium text-gray-900">{assignment.patient_name}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                    <div className="max-w-xs truncate font-medium" title={assignment.program_name}>
                                        {assignment.program_name}
                                    </div>
                                    {assignment.has_custom_trials && (
                                        <div className="text-xs text-blue-600 mt-1">
                                            <FontAwesomeIcon icon={faCogs} className="mr-1" />
                                            Tentativas customizadas
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.therapist_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(assignment.status)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>
                                    <div className="font-medium">{assignment.total_sessions}</div>
                                    {assignment.total_sessions > 0 && assignment.average_score > 0 && (
                                        <div className="text-xs text-green-600">{assignment.average_score.toFixed(1)}% média</div>
                                    )}
                                </div>
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
                <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50">
                    <FontAwesomeIcon icon={faCogs} className="text-3xl text-indigo-400 mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Nenhuma atribuição encontrada</h3>
                    <p className="text-sm text-gray-500">Não há programas atribuídos que correspondam aos critérios de busca.</p>
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
  const [patientToEdit, setPatientToEdit] = useState(null);
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

  const handleEditPatient = useCallback((patient) => {
    setPatientToEdit(patient);
    setIsPatientModalOpen(true);
  }, []);
  
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
                {activeTab === 'patients' && <PatientList patients={filteredPatients} onManageClick={handleOpenAssignmentModal} onEditClick={handleEditPatient} onDeleteClick={handleDeletePatient} />}
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
      <ExpandedPatientForm
        isOpen={isPatientModalOpen}
        onClose={() => {
          setIsPatientModalOpen(false);
          setPatientToEdit(null);
        }}
        patient={patientToEdit}
      />
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
