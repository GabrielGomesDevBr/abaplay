import React, { useState } from 'react';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { generateProgramGradePDF, generateWeeklyRecordSheetPDF } from '../../utils/pdfGenerator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEdit, faTrashAlt, faFilePdf, faClipboardList, faChartPie,
    faCalendarAlt, faNotesMedical, faComments, faUsers, faStethoscope, faUserPlus
} from '@fortawesome/free-solid-svg-icons';
import ParentTherapistChat from '../chat/ParentTherapistChat';
import CaseDiscussionChat from '../chat/CaseDiscussionChat';
import ReportEvolutionModal from '../reports/ReportEvolutionModal';
import ExpandedPatientForm from './ExpandedPatientForm';

const formatDate = (dateString) => {
  if (!dateString) return 'Não informado';
  try {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return dateString.split('T')[0] || 'Data inválida';
  }
};

const DetailCard = ({ icon, label, value, colorClass = 'indigo' }) => {
  const colorMap = {
    indigo: { bg: 'bg-indigo-100', border: 'border-indigo-200', icon: 'text-indigo-600', text: 'text-indigo-800' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-200', icon: 'text-purple-600', text: 'text-purple-800' },
    blue: { bg: 'bg-blue-100', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' }
  };
  const colors = colorMap[colorClass] || colorMap.indigo;

  return (
    <div className={`${colors.bg} ${colors.border} border-l-4 p-4 rounded-r-lg`}>
      <div className="flex items-center mb-2">
        <FontAwesomeIcon icon={icon} className={`mr-3 ${colors.icon}`} />
        <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
      </div>
      <p className={`text-sm ${colors.text} font-medium`}>{value || 'Não informado'}</p>
    </div>
  );
};

const ActionCard = ({ icon, title, description, onClick, disabled, colorClass = 'gray' }) => {
  const colorMap = {
    red: { bg: 'bg-gradient-to-br from-red-50 to-red-100', hover: 'hover:from-red-100 hover:to-red-200', border: 'border-red-200', icon: 'text-red-600' },
    blue: { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', hover: 'hover:from-blue-100 hover:to-blue-200', border: 'border-blue-200', icon: 'text-blue-600' },
    green: { bg: 'bg-gradient-to-br from-green-50 to-green-100', hover: 'hover:from-green-100 hover:to-green-200', border: 'border-green-200', icon: 'text-green-600' },
    purple: { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', hover: 'hover:from-purple-100 hover:to-purple-200', border: 'border-purple-200', icon: 'text-purple-600' },
    gray: { bg: 'bg-gradient-to-br from-gray-50 to-gray-100', hover: 'hover:from-gray-100 hover:to-gray-200', border: 'border-gray-200', icon: 'text-gray-600' }
  };
  const colors = colorMap[colorClass] || colorMap.gray;

  return (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`text-left p-4 flex items-start space-x-4 ${colors.bg} ${colors.hover} rounded-lg border-2 ${colors.border} w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-wait transform hover:scale-105 shadow-sm hover:shadow-md`}
    >
        <div className="bg-white p-3 rounded-full shadow-sm">
            <FontAwesomeIcon icon={icon} className={`text-lg ${colors.icon}`} />
        </div>
        <div className="flex-1">
            <h5 className="font-semibold text-sm text-gray-800 mb-1">{title}</h5>
            <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
    </button>
  );
};

const PatientDetails = () => {
  const { selectedPatient, openPatientForm, removePatient, openReportModal } = usePatients();
  const { user } = useAuth();
  const [isParentChatVisible, setIsParentChatVisible] = useState(false);
  const [isDiscussionChatVisible, setIsDiscussionChatVisible] = useState(false);
  const [isEvolutionReportVisible, setIsEvolutionReportVisible] = useState(false);
  const [isExpandedFormVisible, setIsExpandedFormVisible] = useState(false);

  if (!selectedPatient) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
            <h3 className="text-lg font-semibold text-gray-700">Nenhum Cliente Selecionado</h3>
            <p className="text-sm text-gray-500 mt-2">Por favor, selecione um cliente na lista à esquerda para ver os detalhes.</p>
        </div>
    );
  }

  const handleEdit = () => openPatientForm(selectedPatient);
  const handleDelete = () => removePatient(selectedPatient.id);
  const handleGenerateGradePdf = () => generateProgramGradePDF(selectedPatient);
  const handleGenerateRecordSheet = () => generateWeeklyRecordSheetPDF(selectedPatient);
  const handleOpenEvolutionReport = () => setIsEvolutionReportVisible(true);
  const handleCloseEvolutionReport = () => setIsEvolutionReportVisible(false);
  const handleOpenExpandedForm = () => setIsExpandedFormVisible(true);
  const handleCloseExpandedForm = () => setIsExpandedFormVisible(false);
  
  const handleToggleParentChat = () => {
    setIsDiscussionChatVisible(false);
    setIsParentChatVisible(prevState => !prevState);
  };

  const handleToggleDiscussionChat = () => {
    setIsParentChatVisible(false);
    setIsDiscussionChatVisible(prevState => !prevState);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Cabeçalho redesenhado com gradiente */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedPatient.name}</h2>
                      <div className="flex items-center space-x-4">
                          <span className="text-indigo-100 text-sm font-mono bg-white bg-opacity-20 px-3 py-1 rounded-full">
                              ID: {selectedPatient.id}
                          </span>
                      </div>
                  </div>
                  <div className="flex space-x-3">
                      <button 
                          onClick={handleEdit} 
                          className="p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all text-white transform hover:scale-105" 
                          title="Editar Cliente"
                      >
                          <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                          onClick={handleDelete} 
                          className="p-3 rounded-full bg-red-500 bg-opacity-80 hover:bg-opacity-100 transition-all text-white transform hover:scale-105" 
                          title="Excluir Cliente"
                      >
                          <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                  </div>
              </div>
          </div>

          {/* Seção de informações básicas */}
          <div className="p-6">
              <div className="mb-6">
                  <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                      <h3 className="text-lg font-semibold text-gray-800">📋 Informações Básicas</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailCard icon={faCalendarAlt} label="Data de Nascimento" value={formatDate(selectedPatient.dob)} colorClass="indigo" />
                      <DetailCard icon={faNotesMedical} label="Diagnóstico" value={selectedPatient.diagnosis} colorClass="purple" />
                  </div>
              </div>

              {/* Seção de Anotações redesenhada */}
              {selectedPatient.general_notes && (
                  <div className="mb-6">
                      <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                          <h3 className="text-lg font-semibold text-gray-800">📝 Anotações Gerais</h3>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPatient.general_notes}</p>
                      </div>
                  </div>
              )}
              {/* Seção de Comunicação redesenhada */}
              <div className="mb-6">
                  <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <h3 className="text-lg font-semibold text-gray-800">💬 Comunicação</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 p-4 rounded-lg">
                          <button
                              onClick={handleToggleDiscussionChat}
                              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-sm hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105"
                          >
                              <FontAwesomeIcon icon={faUsers} className="mr-2" />
                              <span className="font-medium text-sm">Discussão de Caso</span>
                          </button>
                          <p className="text-xs text-gray-600 mt-2 text-center leading-relaxed">
                              {isDiscussionChatVisible ? '✅ Chat da equipe aberto' : 'Chat interno entre terapeutas'}
                          </p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-4 rounded-lg">
                          <button
                              onClick={handleToggleParentChat}
                              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105"
                          >
                              <FontAwesomeIcon icon={faComments} className="mr-2" />
                              <span className="font-medium text-sm">Comunicação com os Pais</span>
                          </button>
                          <p className="text-xs text-gray-600 mt-2 text-center leading-relaxed">
                              {isParentChatVisible ? '✅ Chat com pais aberto' : 'Comunicação com responsáveis'}
                          </p>
                      </div>
                  </div>
              </div>

          {/* Renderização condicional para AMBOS os chats */}
          {isDiscussionChatVisible && (
              <div className="my-5 animate-fade-in max-w-4xl mx-auto w-full">
                  <CaseDiscussionChat 
                      patientId={selectedPatient.id} 
                      patientName={selectedPatient.name} 
                  />
              </div>
          )}

          {isParentChatVisible && (
              <div className="my-5 animate-fade-in max-w-4xl mx-auto w-full">
                  <ParentTherapistChat 
                      patientId={selectedPatient.id} 
                      patientName={selectedPatient.name} 
                  />
              </div>
          )}

              {/* Seção Admin - Dados Expandidos */}
              {user?.is_admin && (
                <div className="mb-6">
                  <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    <h3 className="text-lg font-semibold text-gray-800">👑 Administração</h3>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 p-4 rounded-lg">
                    <button
                      onClick={handleOpenExpandedForm}
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg shadow-sm hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105"
                    >
                      <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                      <span className="font-medium text-sm">Editar Dados Expandidos</span>
                    </button>
                    <p className="text-xs text-gray-600 mt-2 text-center leading-relaxed">
                      Acesso completo aos dados expandidos (responsáveis, escola, médicos, contatos de emergência)
                    </p>
                  </div>
                </div>
              )}

              {/* Seção de Documentos redesenhada */}
              <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <h3 className="text-lg font-semibold text-gray-800">📄 Documentos e Relatórios</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <ActionCard 
                          icon={faFilePdf}
                          title="Grade de Programas"
                          description="Gera um PDF detalhado com a lista dos programas atribuídos ao cliente."
                          onClick={handleGenerateGradePdf}
                          colorClass="red"
                      />
                      <ActionCard 
                          icon={faClipboardList}
                          title="Folha de Registro"
                          description="Cria uma folha de registro em branco para anotações manuais durante as sessões."
                          onClick={handleGenerateRecordSheet}
                          colorClass="blue"
                      />
                      <ActionCard 
                          icon={faStethoscope}
                          title="Evolução Terapêutica"
                          description="Gera relatório de evolução profissional detalhado com análise do progresso do paciente."
                          onClick={handleOpenEvolutionReport}
                          colorClass="green"
                      />
                      <ActionCard 
                          icon={faChartPie}
                          title="Relatório Consolidado"
                          description="Gera um relatório completo com análise do progresso e gráficos."
                          onClick={openReportModal}
                          colorClass="purple"
                      />
                  </div>
              </div>
          </div>
      </div>
      
      {/* Modal do Relatório de Evolução Terapêutica */}
      <ReportEvolutionModal
        patient={selectedPatient}
        isOpen={isEvolutionReportVisible}
        onClose={handleCloseEvolutionReport}
      />

      {/* Modal de Dados Expandidos (apenas para Admin) */}
      {user?.is_admin && (
        <ExpandedPatientForm
          patient={selectedPatient}
          isOpen={isExpandedFormVisible}
          onClose={handleCloseExpandedForm}
        />
      )}
    </>
  );
};

export default PatientDetails;
