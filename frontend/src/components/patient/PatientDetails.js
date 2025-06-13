import React from 'react';
// <<< CAMINHOS DE IMPORTAÇÃO CORRIGIDOS >>>
import { usePatients } from '../../context/PatientContext';
// A importação 'useAuth' foi removida, pois não era utilizada.
import { usePrograms } from '../../context/ProgramContext'; 
import { generateProgramGradePDF, generateWeeklyRecordSheetPDF } from '../../utils/pdfGenerator'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt, faFilePdf, faClipboardList, faChartPie, faCalendarAlt, faNotesMedical } from '@fortawesome/free-solid-svg-icons';

// A função de formatação de data original é mantida.
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

// Componente auxiliar para padronizar a exibição dos detalhes.
const DetailItem = ({ icon, label, value }) => (
    <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
            <FontAwesomeIcon icon={icon} className="mr-2 text-indigo-400" />
            {label}
        </h4>
        <p className="text-sm text-gray-800 mt-1">{value || 'Não informado'}</p>
    </div>
);

const ActionButton = ({ icon, title, description, onClick, disabled, iconClassName }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className="text-left p-3 flex items-start space-x-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 w-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait disabled:hover:bg-gray-50"
    >
        <FontAwesomeIcon icon={icon} className={`fa-lg mt-1 ${iconClassName || 'text-gray-400'}`} />
        <div>
            <h5 className="font-semibold text-sm text-gray-800">{title}</h5>
            <p className="text-xs text-gray-600">{description}</p>
        </div>
    </button>
);


const PatientDetails = () => {
  const { selectedPatient, openPatientForm, removePatient, openReportModal } = usePatients();
  const { allProgramsData, isLoading: programsAreLoading, getProgramById } = usePrograms();

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
  const handleGenerateGradePdf = () => generateProgramGradePDF(selectedPatient, allProgramsData);
  const handleGenerateRecordSheet = () => generateWeeklyRecordSheetPDF(selectedPatient, getProgramById, allProgramsData);

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex flex-col">
        <div className="flex justify-between items-start pb-4 border-b border-gray-200 mb-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedPatient.name}</h2>
                <p className="text-xs text-gray-500 mt-1">ID: <span className="font-mono">{selectedPatient.id}</span></p>
            </div>
            <div className="flex space-x-2">
                <button onClick={handleEdit} className="p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-blue-600 hover:bg-blue-100" title="Editar Cliente">
                    <FontAwesomeIcon icon={faEdit} />
                </button>
                <button onClick={handleDelete} className="p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-red-600 hover:bg-red-100" title="Excluir Cliente">
                    <FontAwesomeIcon icon={faTrashAlt} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 mb-4">
            <DetailItem icon={faCalendarAlt} label="Data de Nascimento" value={formatDate(selectedPatient.dob)} />
            <DetailItem icon={faNotesMedical} label="Diagnóstico" value={selectedPatient.diagnosis} />
        </div>

        {selectedPatient.general_notes && (
            <div className="mb-5">
                 <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Anotações Gerais</h4>
                 <div className="bg-gray-50 p-3 rounded-md border border-gray-200 min-h-[100px]">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPatient.general_notes}</p>
                 </div>
            </div>
        )}
        
        <div className="mt-auto border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Documentos e Relatórios</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <ActionButton 
                    icon={faFilePdf}
                    title="Grade de Programas"
                    description="Gera um PDF com a lista dos programas atribuídos."
                    onClick={handleGenerateGradePdf}
                    disabled={programsAreLoading}
                    iconClassName="text-red-500"
                />
                <ActionButton 
                    icon={faClipboardList}
                    title="Folha de Registro"
                    description="Cria uma folha de registro para anotações manuais."
                    onClick={handleGenerateRecordSheet}
                    disabled={programsAreLoading}
                    iconClassName="text-blue-500"
                />
                <ActionButton 
                    icon={faChartPie}
                    title="Geração de Relatório"
                    description="Abre o modal para gerar um relatório de progresso."
                    onClick={openReportModal}
                    disabled={programsAreLoading}
                    iconClassName="text-green-500"
                />
            </div>
        </div>
    </div>
  );
};

export default PatientDetails;
