// frontend/src/components/scheduling/RecurringTemplatesList.js

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRedoAlt,
  faPlay,
  faPause,
  faTrash,
  faEye,
  faPlus,
  faExclamationTriangle,
  faSpinner,
  faCalendar,
  faFilter,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';
import { recurringAppointmentApi } from '../../api/recurringAppointmentApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente para listar e gerenciar templates de agendamentos recorrentes
 */
const RecurringTemplatesList = ({ onCreateNew, onViewAppointments }) => {
  const { token } = useAuth();

  // Estados principais
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de filtros
  const [filters, setFilters] = useState({
    patient_id: '',
    therapist_id: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Estados de ações
  const [actionLoading, setActionLoading] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Carregar templates
  const loadTemplates = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await recurringAppointmentApi.getTemplates(filters);
      setTemplates(response.templates || []);
    } catch (error) {
      console.error('Erro ao carregar templates recorrentes:', error);
      setError('Erro ao carregar templates recorrentes. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [token, filters]);

  // Carregar templates na inicialização
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Pausar template
  const handlePauseTemplate = async (template) => {
    const reason = prompt(`Motivo para pausar o template de ${template.patient_name}:`);
    if (!reason) return;

    const pauseUntil = prompt('Pausar até (YYYY-MM-DD - opcional):');

    try {
      setActionLoading(prev => ({ ...prev, [`pause_${template.id}`]: true }));

      await recurringAppointmentApi.pauseTemplate(template.id, reason, pauseUntil || null);

      // Recarregar lista
      await loadTemplates();

      alert('Template pausado com sucesso!');
    } catch (error) {
      console.error('Erro ao pausar template:', error);
      alert('Erro ao pausar template: ' + (error.errors?.[0]?.msg || error.message || 'Erro desconhecido'));
    } finally {
      setActionLoading(prev => ({ ...prev, [`pause_${template.id}`]: false }));
    }
  };

  // Reativar template
  const handleResumeTemplate = async (template) => {
    if (!window.confirm(`Reativar o template de ${template.patient_name}?`)) return;

    try {
      setActionLoading(prev => ({ ...prev, [`resume_${template.id}`]: true }));

      const result = await recurringAppointmentApi.resumeTemplate(template.id);

      // Recarregar lista
      await loadTemplates();

      alert(`Template reativado! ${result.generated_appointments || 0} novos agendamentos gerados.`);
    } catch (error) {
      console.error('Erro ao reativar template:', error);
      alert('Erro ao reativar template: ' + (error.errors?.[0]?.msg || error.message || 'Erro desconhecido'));
    } finally {
      setActionLoading(prev => ({ ...prev, [`resume_${template.id}`]: false }));
    }
  };

  // Gerar mais agendamentos
  const handleGenerateMore = async (template) => {
    const weeks = prompt('Quantas semanas gerar?', '4');
    if (!weeks || isNaN(weeks) || weeks < 1) return;

    try {
      setActionLoading(prev => ({ ...prev, [`generate_${template.id}`]: true }));

      const result = await recurringAppointmentApi.generateMoreAppointments(
        template.id,
        parseInt(weeks)
      );

      // Recarregar lista
      await loadTemplates();

      alert(`Geração concluída!\n${result.summary.total_generated} agendamentos criados\n${result.summary.total_conflicts} conflitos encontrados`);
    } catch (error) {
      console.error('Erro ao gerar agendamentos:', error);
      alert('Erro ao gerar agendamentos: ' + (error.errors?.[0]?.msg || error.message || 'Erro desconhecido'));
    } finally {
      setActionLoading(prev => ({ ...prev, [`generate_${template.id}`]: false }));
    }
  };

  // Desativar template
  const handleDeactivateTemplate = async (template) => {
    const reason = prompt(`Motivo para desativar permanentemente o template de ${template.patient_name}:`);
    if (!reason) return;

    if (!window.confirm('⚠️ Esta ação é irreversível! Deseja continuar?')) return;

    try {
      setActionLoading(prev => ({ ...prev, [`delete_${template.id}`]: true }));

      await recurringAppointmentApi.deactivateTemplate(template.id, reason);

      // Recarregar lista
      await loadTemplates();

      alert('Template desativado com sucesso!');
    } catch (error) {
      console.error('Erro ao desativar template:', error);
      alert('Erro ao desativar template: ' + (error.errors?.[0]?.msg || error.message || 'Erro desconhecido'));
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete_${template.id}`]: false }));
    }
  };

  // Ver detalhes do template
  const handleViewDetails = (template) => {
    setSelectedTemplate(template);
    setShowDetails(true);
  };

  // Aplicar filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      patient_id: '',
      therapist_id: '',
      status: ''
    });
  };

  // Obter cor do status
  const getStatusColor = (status) => {
    const colors = {
      'active': 'text-green-600 bg-green-100',
      'paused': 'text-yellow-600 bg-yellow-100',
      'expired': 'text-gray-600 bg-gray-100',
      'inactive': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  // Obter texto do status
  const getStatusText = (status) => {
    const texts = {
      'active': 'Ativo',
      'paused': 'Pausado',
      'expired': 'Expirado',
      'inactive': 'Inativo'
    };
    return texts[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Carregando templates recorrentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faRedoAlt} className="mr-2 text-blue-600" />
            Templates Recorrentes
          </h3>
          <p className="text-sm text-gray-600">
            Gerencie séries de agendamentos que se repetem automaticamente
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-1 w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={loadTemplates}
            disabled={isLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            <FontAwesomeIcon icon={faRefresh} className="mr-1 w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-1 w-4 h-4" />
            Novo Template
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="paused">Pausado</option>
                <option value="expired">Expirado</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Lista de templates */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FontAwesomeIcon icon={faRedoAlt} className="text-4xl text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum template encontrado</h3>
          <p className="text-gray-600 mb-4">
            Crie seu primeiro template recorrente para automatizar agendamentos repetitivos.
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Criar Primeiro Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                {/* Informações do template */}
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="text-lg font-medium text-gray-900 mr-3">
                      {template.patient_name}
                    </h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(template.status_calculated)}`}>
                      {getStatusText(template.status_calculated)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faCalendar} className="w-4 h-4 mr-2" />
                      {recurringAppointmentApi.formatRecurrenceDescription(template)}
                    </div>
                    <div>
                      <strong>Terapeuta:</strong> {template.therapist_name}
                    </div>
                    {template.discipline_name && (
                      <div>
                        <strong>Disciplina:</strong> {template.discipline_name}
                      </div>
                    )}
                    <div className="flex space-x-4 mt-2">
                      <span>
                        <strong>Total:</strong> {template.total_appointments || 0} agendamentos
                      </span>
                      <span>
                        <strong>Concluídos:</strong> {template.completed_appointments || 0}
                      </span>
                      {template.upcoming_dates && template.upcoming_dates.length > 0 && (
                        <span>
                          <strong>Próximos:</strong> {template.upcoming_dates.slice(0, 2).join(', ')}
                          {template.upcoming_dates.length > 2 && '...'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex space-x-2 ml-4">
                  {template.status_calculated === 'active' && (
                    <>
                      <button
                        onClick={() => handleGenerateMore(template)}
                        disabled={actionLoading[`generate_${template.id}`]}
                        className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Gerar mais agendamentos"
                      >
                        {actionLoading[`generate_${template.id}`] ? (
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faPlus} />
                        )}
                      </button>

                      <button
                        onClick={() => handlePauseTemplate(template)}
                        disabled={actionLoading[`pause_${template.id}`]}
                        className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Pausar template"
                      >
                        {actionLoading[`pause_${template.id}`] ? (
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faPause} />
                        )}
                      </button>
                    </>
                  )}

                  {template.status_calculated === 'paused' && (
                    <button
                      onClick={() => handleResumeTemplate(template)}
                      disabled={actionLoading[`resume_${template.id}`]}
                      className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Reativar template"
                    >
                      {actionLoading[`resume_${template.id}`] ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faPlay} />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleViewDetails(template)}
                    className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Ver detalhes e agendamentos"
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>

                  <button
                    onClick={() => handleDeactivateTemplate(template)}
                    disabled={actionLoading[`delete_${template.id}`]}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Desativar template"
                  >
                    {actionLoading[`delete_${template.id}`] ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faTrash} />
                    )}
                  </button>
                </div>
              </div>

              {/* Notas se existirem */}
              {template.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                  <strong>Observações:</strong> {template.notes}
                </div>
              )}

              {/* Motivo da pausa se existir */}
              {template.pause_reason && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>Pausado:</strong> {template.pause_reason}
                  {template.paused_until && (
                    <span> (até {new Date(template.paused_until).toLocaleDateString('pt-BR')})</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      {showDetails && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Template: {selectedTemplate.patient_name}
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Configuração</h3>
                  <div className="text-sm text-gray-600">
                    {recurringAppointmentApi.formatRecurrenceDescription(selectedTemplate)}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Estatísticas</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total: {selectedTemplate.total_appointments || 0}</div>
                    <div>Concluídos: {selectedTemplate.completed_appointments || 0}</div>
                    <div>Agendados: {selectedTemplate.scheduled_appointments || 0}</div>
                    <div>Perdidos: {selectedTemplate.missed_appointments || 0}</div>
                  </div>
                </div>

                {selectedTemplate.upcoming_dates && selectedTemplate.upcoming_dates.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Próximos Agendamentos</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      {selectedTemplate.upcoming_dates.slice(0, 5).map((date, index) => (
                        <div key={index}>{new Date(date).toLocaleDateString('pt-BR')}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (onViewAppointments) {
                      onViewAppointments(selectedTemplate);
                    }
                    setShowDetails(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ver Agendamentos
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringTemplatesList;