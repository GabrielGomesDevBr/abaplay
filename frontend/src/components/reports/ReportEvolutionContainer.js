import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ReportEvolutionModal from './ReportEvolutionModal';
import ReportPreview from './ReportPreview';
import {
  getEvolutionReportData,
  updateProfessionalData,
  updatePatientData,
  getAutomaticAnalysis
} from '../../api/reportApi';

// Função auxiliar para processar opções de período
const processPeriodOptions = (periodOptions) => {
  const now = new Date();
  let startDate, endDate;

  switch (periodOptions.period_type) {
    case 'last_30_days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      endDate = now;
      break;
    case 'last_60_days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 60);
      endDate = now;
      break;
    case 'last_90_days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      endDate = now;
      break;
    case 'custom':
      startDate = periodOptions.start_date ? new Date(periodOptions.start_date) : null;
      endDate = periodOptions.end_date ? new Date(periodOptions.end_date) : null;
      break;
    default:
      // Default para últimos 30 dias
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      endDate = now;
  }

  return {
    startDate: startDate ? startDate.toISOString().split('T')[0] : null,
    endDate: endDate ? endDate.toISOString().split('T')[0] : null
  };
};

const ReportEvolutionContainer = ({ patient, isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState('config'); // config, preview
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados de dados
  const [reportData, setReportData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [patientConfigData, setPatientConfigData] = useState(null);
  const [professionalConfigData, setProfessionalConfigData] = useState(null);
  const [customizations, setCustomizations] = useState({});

  const handleConfigurationComplete = async (configData) => {
    setIsLoading(true);
    
    try {
      const { professionalData, patientData, needsProfessionalData, periodOptions } = configData;
      
      // 1. Atualizar dados profissionais se necessário
      if (needsProfessionalData && professionalData) {
        await updateProfessionalData(professionalData);
        setProfessionalConfigData({
          professional_name: user?.name || user?.full_name,
          professional_id: professionalData.professional_id,
          qualifications: professionalData.qualifications,
          professional_signature: professionalData.professional_signature
        });
      } else {
        setProfessionalConfigData({
          professional_name: user?.name || user?.full_name,
          professional_id: user?.professional_id,
          qualifications: user?.qualifications,
          professional_signature: user?.professional_signature
        });
      }
      
      // 2. Atualizar dados complementares do paciente
      await updatePatientData(patient.id, patientData);
      setPatientConfigData(patientData);
      
      // 3. Buscar dados completos do relatório
      const completeReportData = await getEvolutionReportData(patient.id);
      setReportData(completeReportData);
      
      // 4. Processar opções de período
      const processedPeriodOptions = processPeriodOptions(periodOptions);
      
      // 5. Gerar análise automática com opções de período
      const analysis = await getAutomaticAnalysis(patient.id, processedPeriodOptions);
      setAnalysisData(analysis);
      
      // 6. Avançar para o preview
      setCurrentStep('preview');
      
    } catch (error) {
      console.error('Erro ao processar configuração:', error);
      alert('Erro ao processar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewClose = () => {
    // Voltar para configuração ou fechar completamente
    setCurrentStep('config');
    setReportData(null);
    setAnalysisData(null);
    onClose();
  };

  const handleUpdateCustomizations = (newCustomizations) => {
    setCustomizations(newCustomizations);
  };

  if (!isOpen) return null;

  return (
    <>
      {currentStep === 'config' && (
        <ReportEvolutionModal
          isOpen={true}
          onClose={onClose}
          onContinue={handleConfigurationComplete}
          patient={patient}
          currentUser={user}
          isLoading={isLoading}
        />
      )}
      
      {currentStep === 'preview' && (
        <ReportPreview
          isOpen={true}
          onClose={handlePreviewClose}
          reportData={reportData}
          analysisData={analysisData}
          patientData={patientConfigData}
          professionalData={professionalConfigData}
          customizations={customizations}
          onUpdateCustomizations={handleUpdateCustomizations}
        />
      )}
    </>
  );
};

export default ReportEvolutionContainer;