import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePatients } from '../../context/PatientContext';
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
  const { user, updateUser } = useAuth();
  const { refreshAndReselectPatient } = usePatients();
  const [currentStep, setCurrentStep] = useState('config'); // config, preview
  const [isLoading, setIsLoading] = useState(false);

  // Estados de dados
  const [reportData, setReportData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [patientConfigData, setPatientConfigData] = useState(null);
  const [professionalConfigData, setProfessionalConfigData] = useState(null);
  const [customizations, setCustomizations] = useState({});

  // Estado local para preservar dados do paciente durante o fluxo
  const [localPatient, setLocalPatient] = useState(null);

  // Estado de erro para não fechar modal
  const [error, setError] = useState('');

  // Effect para preservar dados do paciente
  useEffect(() => {
    if (patient && isOpen) {
      setLocalPatient(patient);
    }
  }, [patient, isOpen]);

  // Effect para limpar estado quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('config');
      setReportData(null);
      setAnalysisData(null);
      setPatientConfigData(null);
      setProfessionalConfigData(null);
      setCustomizations({});
      setLocalPatient(null);
      setIsLoading(false);
      setError(''); // Limpar erros quando modal fecha
    }
  }, [isOpen]);

  const handleConfigurationComplete = async (configData) => {
    setIsLoading(true);
    setError(''); // Limpar erros anteriores

    try {
      const { professionalData, patientData, needsProfessionalData, periodOptions } = configData;
      const currentPatient = localPatient || patient;

      if (!currentPatient) {
        throw new Error('Nenhum paciente selecionado');
      }

      console.log('🔄 Iniciando processamento do relatório de evolução para:', currentPatient.name);

      // 1. Atualizar dados profissionais se necessário
      if (needsProfessionalData && professionalData) {
        console.log('💼 Salvando dados profissionais:', professionalData);
        await updateProfessionalData(professionalData);

        // Atualizar contexto do usuário com dados salvos
        updateUser({
          professional_id: professionalData.professional_id,
          qualifications: professionalData.qualifications,
          professional_signature: professionalData.professional_signature
        });

        setProfessionalConfigData({
          professional_name: user?.name || user?.full_name,
          professional_id: professionalData.professional_id,
          qualifications: professionalData.qualifications,
          professional_signature: professionalData.professional_signature
        });
        console.log('✅ Dados profissionais salvos com sucesso e contexto atualizado');
      } else {
        setProfessionalConfigData({
          professional_name: user?.name || user?.full_name,
          professional_id: user?.professional_id,
          qualifications: user?.qualifications,
          professional_signature: user?.professional_signature
        });
        console.log('📋 Usando dados profissionais existentes');
      }

      // 2. Atualizar dados complementares do paciente
      console.log('👤 Salvando dados complementares do paciente:', patientData);
      await updatePatientData(currentPatient.id, patientData);
      setPatientConfigData(patientData);
      console.log('✅ Dados do paciente salvos com sucesso');

      // 2.1. Re-selecionar paciente após atualizar dados para manter sincronização
      if (refreshAndReselectPatient) {
        console.log('🔄 Re-selecionando paciente para manter sincronização...');
        try {
          await refreshAndReselectPatient(currentPatient.id);
          console.log('✅ Paciente re-selecionado com sucesso');
        } catch (reselectError) {
          console.warn('⚠️ Erro ao re-selecionar paciente (não crítico):', reselectError);
        }
      }

      // 3. Buscar dados completos do relatório
      console.log('📊 Buscando dados completos do relatório...');
      const completeReportData = await getEvolutionReportData(currentPatient.id);
      setReportData(completeReportData);
      console.log('✅ Dados do relatório carregados:', Object.keys(completeReportData));

      // 4. Processar opções de período
      const processedPeriodOptions = processPeriodOptions(periodOptions);
      console.log('📅 Período processado:', processedPeriodOptions);

      // 5. Gerar análise automática com opções de período
      console.log('🤖 Gerando análise automática...');
      const analysis = await getAutomaticAnalysis(currentPatient.id, processedPeriodOptions);
      setAnalysisData(analysis);
      console.log('✅ Análise gerada com sucesso');

      // 6. Avançar para o preview
      console.log('🎯 Avançando para preview...');
      setCurrentStep('preview');

    } catch (error) {
      console.error('❌ Erro ao processar configuração:', error);
      setError(`Erro ao processar dados: ${error.message || 'Erro desconhecido'}. Verifique os dados e tente novamente.`);
      // NÃO fechar modal - mantê-lo aberto para retry
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewClose = () => {
    // Voltar para configuração ou fechar completamente
    setCurrentStep('config');
    setReportData(null);
    setAnalysisData(null);
    // Limpar dados locais do paciente
    setLocalPatient(null);
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
          patient={localPatient || patient}
          currentUser={user}
          isLoading={isLoading}
          error={error}
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