import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, faUserMd, faGraduationCap, faNotesMedical, 
  faIdCard, faUsers, faSpinner, faTimes, faCheck, faCalendarAlt 
} from '@fortawesome/free-solid-svg-icons';

const ReportEvolutionModal = ({ 
  isOpen, 
  onClose, 
  onContinue, 
  patient, 
  currentUser,
  initialData = null 
}) => {
  // Estados para dados profissionais
  const [professionalData, setProfessionalData] = useState({
    professional_id: '',
    qualifications: '',
    professional_signature: ''
  });

  // Estados para dados do paciente
  const [patientData, setPatientData] = useState({
    guardian_name: '',
    guardian_relationship: '',
    patient_occupation: '',
    main_complaint: '',
    treatment_objectives: ''
  });

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Profissional, 2: Paciente
  const [needsProfessionalData, setNeedsProfessionalData] = useState(true);
  const [errors, setErrors] = useState({});

  // Estados para período de análise
  const [periodOptions, setPeriodOptions] = useState({
    period_type: 'last_30_days', // last_30_days, last_60_days, last_90_days, custom
    start_date: '',
    end_date: '',
    program_filter: 'all' // all, specific_programs
  });

  useEffect(() => {
    if (isOpen && currentUser) {
      // Verificar se o usuário já tem dados profissionais configurados
      setNeedsProfessionalData(
        !currentUser.professional_id || 
        !currentUser.qualifications
      );
      
      // Se já tem dados profissionais, pula para o step 2
      if (currentUser.professional_id && currentUser.qualifications) {
        setProfessionalData({
          professional_id: currentUser.professional_id,
          qualifications: currentUser.qualifications,
          professional_signature: currentUser.professional_signature || ''
        });
        setStep(2);
      }

      // Carregar dados existentes do paciente se houver
      if (patient) {
        setPatientData({
          guardian_name: patient.guardian_name || '',
          guardian_relationship: patient.guardian_relationship || '',
          patient_occupation: patient.patient_occupation || '',
          main_complaint: patient.main_complaint || '',
          treatment_objectives: patient.treatment_objectives || ''
        });
      }

      // Se há dados iniciais (edição), carregar
      if (initialData) {
        if (initialData.professionalData) {
          setProfessionalData(initialData.professionalData);
        }
        if (initialData.patientData) {
          setPatientData(initialData.patientData);
        }
      }
    }
  }, [isOpen, currentUser, patient, initialData]);

  const validateProfessionalData = () => {
    const newErrors = {};
    
    if (!professionalData.professional_id.trim()) {
      newErrors.professional_id = 'Registro profissional é obrigatório';
    }
    
    if (!professionalData.qualifications.trim()) {
      newErrors.qualifications = 'Qualificações são obrigatórias';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePatientData = () => {
    const newErrors = {};
    
    if (!patientData.guardian_name.trim()) {
      newErrors.guardian_name = 'Nome do responsável é obrigatório';
    }
    
    if (!patientData.guardian_relationship.trim()) {
      newErrors.guardian_relationship = 'Relação é obrigatória';
    }
    
    if (!patientData.main_complaint.trim()) {
      newErrors.main_complaint = 'Queixa principal é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (validateProfessionalData()) {
        setStep(2);
      }
    } else {
      if (validatePatientData()) {
        setLoading(true);
        try {
          await onContinue({
            professionalData,
            patientData,
            needsProfessionalData,
            periodOptions
          });
        } catch (error) {
          console.error('Erro ao processar dados:', error);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handlePrevStep = () => {
    if (step === 2 && needsProfessionalData) {
      setStep(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Relatório de Evolução Terapêutica
              </h2>
              <p className="text-indigo-100 text-sm">
                {step === 1 ? 'Configuração Profissional' : `Dados Complementares - ${patient?.name}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                {needsProfessionalData ? (
                  <FontAwesomeIcon icon={faUserMd} className="text-sm" />
                ) : (
                  <FontAwesomeIcon icon={faCheck} className="text-sm" />
                )}
              </div>
              <span className="font-medium">Dados Profissionais</span>
            </div>
            
            <div className={`flex-1 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'} rounded`}></div>
            
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>
                <FontAwesomeIcon icon={faUser} className="text-sm" />
              </div>
              <span className="font-medium">Dados do Paciente</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && needsProfessionalData && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FontAwesomeIcon icon={faUserMd} className="text-2xl text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Configuração Profissional
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Para gerar relatórios profissionais completos, precisamos dos seus dados profissionais. 
                  Estes dados serão reutilizados automaticamente.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-center">
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">⚠️ Sobre os Relatórios de Evolução</p>
                    <p>
                      Este sistema gera <strong>análises automáticas baseadas em dados quantitativos</strong> como suporte ao seu trabalho. 
                      É <strong>imprescindível</strong> que você revise, adapte e complemente com sua expertise clínica profissional.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faIdCard} className="mr-2 text-indigo-500" />
                    Registro Profissional *
                  </label>
                  <input
                    type="text"
                    value={professionalData.professional_id}
                    onChange={(e) => setProfessionalData(prev => ({
                      ...prev,
                      professional_id: e.target.value
                    }))}
                    placeholder="Ex: CRP 06/12345-6"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.professional_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.professional_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.professional_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faGraduationCap} className="mr-2 text-indigo-500" />
                    Qualificações e Formação *
                  </label>
                  <textarea
                    value={professionalData.qualifications}
                    onChange={(e) => setProfessionalData(prev => ({
                      ...prev,
                      qualifications: e.target.value
                    }))}
                    placeholder="Ex: Psicólogo, Especialista em ABA (BACB-BCaBA), Mestre em Análise do Comportamento"
                    rows="3"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                      errors.qualifications ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.qualifications && (
                    <p className="text-red-500 text-xs mt-1">{errors.qualifications}</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FontAwesomeIcon icon={faCheck} className="text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-blue-800">Configuração Única</h4>
                    <p className="text-blue-700 text-sm">
                      Estes dados serão salvos no seu perfil e reutilizados automaticamente 
                      em todos os futuros relatórios, sem necessidade de reconfiguração.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FontAwesomeIcon icon={faUser} className="text-2xl text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Dados Complementares do Paciente
                </h3>
                <p className="text-gray-600 text-sm">
                  Informações complementares necessárias para relatório profissional completo
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faUsers} className="mr-2 text-blue-500" />
                    Nome do Responsável *
                  </label>
                  <input
                    type="text"
                    value={patientData.guardian_name}
                    onChange={(e) => setPatientData(prev => ({
                      ...prev,
                      guardian_name: e.target.value
                    }))}
                    placeholder="Nome completo"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.guardian_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.guardian_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.guardian_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Relação com o Paciente *
                  </label>
                  <select
                    value={patientData.guardian_relationship}
                    onChange={(e) => setPatientData(prev => ({
                      ...prev,
                      guardian_relationship: e.target.value
                    }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.guardian_relationship ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecionar relação</option>
                    <option value="mãe">Mãe</option>
                    <option value="pai">Pai</option>
                    <option value="avó">Avó</option>
                    <option value="avô">Avô</option>
                    <option value="tia">Tia</option>
                    <option value="tio">Tio</option>
                    <option value="responsável legal">Responsável Legal</option>
                    <option value="outro">Outro</option>
                  </select>
                  {errors.guardian_relationship && (
                    <p className="text-red-500 text-xs mt-1">{errors.guardian_relationship}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ocupação do Paciente
                </label>
                <input
                  type="text"
                  value={patientData.patient_occupation}
                  onChange={(e) => setPatientData(prev => ({
                    ...prev,
                    patient_occupation: e.target.value
                  }))}
                  placeholder="Ex: Estudante, Pré-escolar, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faNotesMedical} className="mr-2 text-blue-500" />
                  Queixa Principal *
                </label>
                <textarea
                  value={patientData.main_complaint}
                  onChange={(e) => setPatientData(prev => ({
                    ...prev,
                    main_complaint: e.target.value
                  }))}
                  placeholder="Descreva a queixa principal que motivou o atendimento"
                  rows="3"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.main_complaint ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.main_complaint && (
                  <p className="text-red-500 text-xs mt-1">{errors.main_complaint}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Objetivos Gerais do Tratamento
                </label>
                <textarea
                  value={patientData.treatment_objectives}
                  onChange={(e) => setPatientData(prev => ({
                    ...prev,
                    treatment_objectives: e.target.value
                  }))}
                  placeholder="Descreva os objetivos gerais e metas do tratamento"
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Seletor de Período para Análise */}
              <div className="border-t border-gray-200 pt-6">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-blue-500" />
                    Período para Análise
                  </label>
                  <select
                    value={periodOptions.period_type}
                    onChange={(e) => setPeriodOptions(prev => ({
                      ...prev,
                      period_type: e.target.value,
                      start_date: '',
                      end_date: ''
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="last_30_days">Últimos 30 dias</option>
                    <option value="last_60_days">Últimos 60 dias</option>
                    <option value="last_90_days">Últimos 90 dias</option>
                    <option value="custom">Período personalizado</option>
                  </select>
                </div>

                {periodOptions.period_type === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        value={periodOptions.start_date}
                        onChange={(e) => setPeriodOptions(prev => ({
                          ...prev,
                          start_date: e.target.value
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        value={periodOptions.end_date}
                        onChange={(e) => setPeriodOptions(prev => ({
                          ...prev,
                          end_date: e.target.value
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-medium text-blue-800">Análise Baseada em Período</h4>
                      <p className="text-blue-700 text-sm">
                        O relatório incluirá apenas sessões realizadas no período selecionado. 
                        Períodos maiores fornecem análises mais abrangentes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FontAwesomeIcon icon={faCheck} className="text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-green-800">Dados Reutilizáveis</h4>
                    <p className="text-green-700 text-sm">
                      Essas informações serão salvas e reutilizadas automaticamente 
                      nos próximos relatórios deste paciente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {step === 2 && needsProfessionalData && (
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Voltar
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            <button
              onClick={handleNextStep}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>{step === 2 ? 'Gerar Relatório' : 'Continuar'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportEvolutionModal;