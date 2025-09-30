// frontend/src/components/patient/ExpandedPatientForm.js

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser, faHome, faGraduationCap, faHeartbeat,
    faPhone, faExclamationTriangle, faSave, faTimes, faSpinner,
    faUserMd, faPlus, faTrash, faCheck, faExclamationCircle,
    faInfoCircle, faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import { expandedPatientApi } from '../../api/expandedPatientApi';
import { createPatient, updatePatient } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

const ExpandedPatientForm = ({ isOpen, onClose, onSave, patient }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('basic');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [errors, setErrors] = useState([]);
    // REMOVIDO: const [completeness, setCompleteness] = useState({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // DEBUG: Log para verificar condições do botão PDF
    useEffect(() => {
        console.log('[PDF-BUTTON-DEBUG] Verificando condições:');
        console.log('- user?.role:', user?.role);
        console.log('- user?.is_admin:', user?.is_admin);
        console.log('- patient?.id:', patient?.id);
        console.log('- Deve mostrar botão:', user?.is_admin && patient?.id);
    }, [user, patient]);

    const [formData, setFormData] = useState({
        // Dados básicos do paciente
        name: '',
        dob: '',
        diagnosis: '',
        general_notes: '',

        main: {
            // Dados dos responsáveis expandidos
            guardian_name: '',
            guardian_relationship: '',
            guardian_phone: '',
            guardian_email: '',
            guardian_occupation: '',
            guardian_education: '',

            // Segundo responsável
            second_guardian_name: '',
            second_guardian_relationship: '',
            second_guardian_phone: '',
            second_guardian_email: '',
            second_guardian_occupation: '',

            // Endereço
            address_street: '',
            address_number: '',
            address_complement: '',
            address_neighborhood: '',
            address_city: '',
            address_state: '',
            address_zip: '',

            // Educação
            school_name: '',
            school_phone: '',
            school_email: '',
            school_teacher: '',
            school_teacher_phone: '',
            school_grade: '',
            school_period: 'manhã',
            school_special_needs: false,
            school_adaptations: '',

            // Desenvolvimento
            birth_weight: '',
            birth_height: '',
            birth_complications: '',
            gestational_age: '',
            delivery_type: '',
            development_concerns: '',
            early_intervention: false,

            // Médico
            pediatrician_name: '',
            pediatrician_phone: '',
            pediatrician_email: '',
            health_insurance: '',
            health_insurance_number: '',

            // Observações
            allergies: '',
            dietary_restrictions: '',
            behavioral_notes: '',
            communication_preferences: ''
        },
        medications: [],
        emergencyContacts: [],
        medicalHistory: [],
        professionalContacts: []
    });

    const tabs = [
        { id: 'basic', name: 'Dados Básicos', icon: faUser, description: 'Nome, data nascimento, diagnóstico' },
        { id: 'personal', name: 'Responsáveis', icon: faUser, description: 'Dados dos responsáveis' },
        { id: 'address', name: 'Endereço', icon: faHome, description: 'Localização e contato' },
        { id: 'education', name: 'Educação', icon: faGraduationCap, description: 'Escola e adaptações' },
        { id: 'development', name: 'Desenvolvimento', icon: faHeartbeat, description: 'Nascimento e marcos' },
        { id: 'medical', name: 'Dados Médicos', icon: faUserMd, description: 'Informações médicas gerais' },
        { id: 'medications', name: 'Medicações', icon: faHeartbeat, description: 'Medicações atuais' },
        { id: 'emergency', name: 'Emergência', icon: faExclamationTriangle, description: 'Contatos de emergência' },
        { id: 'history', name: 'Histórico Médico', icon: faUserMd, description: 'Condições e tratamentos' },
        { id: 'professionals', name: 'Profissionais', icon: faPhone, description: 'Outros profissionais' }
    ];

    // Carregar dados quando abrir o modal
    useEffect(() => {
        if (isOpen) {
            if (patient?.id) {
                // Modo edição - carregar dados existentes
                loadExpandedData();
                // loadCompleteness(); // DESABILITADO: Todos os campos são opcionais, exceto dados básicos
            } else {
                // Modo criação - limpar formulário
                resetFormData();
            }
        }
    }, [isOpen, patient?.id]);

    const resetFormData = () => {
        setFormData({
            // Dados básicos do paciente
            name: '',
            dob: '',
            diagnosis: '',
            general_notes: '',

            main: expandedPatientApi.createEmptyExpandedData().main,
            medications: [],
            emergencyContacts: [],
            medicalHistory: [],
            professionalContacts: []
        });
        setHasUnsavedChanges(false);
        setErrors([]);
        // REMOVIDO: setCompleteness({});
    };

    const loadExpandedData = async () => {
        try {
            setIsLoading(true);
            setErrors([]);

            const data = await expandedPatientApi.getExpandedData(patient.id);

            if (data.success && data.patient) {
                const patientData = data.patient;

                setFormData({
                    // Dados básicos do paciente
                    name: patientData.name || '',
                    dob: patientData.dob ? patientData.dob.split('T')[0] : '',
                    diagnosis: patientData.diagnosis || '',
                    general_notes: patientData.general_notes || '',

                    main: {
                        guardian_name: patientData.guardian_name || '',
                        guardian_relationship: patientData.guardian_relationship || '',
                        guardian_phone: patientData.guardian_phone || '',
                        guardian_email: patientData.guardian_email || '',
                        guardian_occupation: patientData.guardian_occupation || '',
                        guardian_education: patientData.guardian_education || '',

                        second_guardian_name: patientData.second_guardian_name || '',
                        second_guardian_relationship: patientData.second_guardian_relationship || '',
                        second_guardian_phone: patientData.second_guardian_phone || '',
                        second_guardian_email: patientData.second_guardian_email || '',
                        second_guardian_occupation: patientData.second_guardian_occupation || '',

                        address_street: patientData.address_street || '',
                        address_number: patientData.address_number || '',
                        address_complement: patientData.address_complement || '',
                        address_neighborhood: patientData.address_neighborhood || '',
                        address_city: patientData.address_city || '',
                        address_state: patientData.address_state || '',
                        address_zip: patientData.address_zip || '',

                        school_name: patientData.school_name || '',
                        school_phone: patientData.school_phone || '',
                        school_email: patientData.school_email || '',
                        school_teacher: patientData.school_teacher || '',
                        school_teacher_phone: patientData.school_teacher_phone || '',
                        school_grade: patientData.school_grade || '',
                        school_period: patientData.school_period || 'manhã',
                        school_special_needs: patientData.school_special_needs || false,
                        school_adaptations: patientData.school_adaptations || '',

                        birth_weight: patientData.birth_weight || '',
                        birth_height: patientData.birth_height || '',
                        birth_complications: patientData.birth_complications || '',
                        gestational_age: patientData.gestational_age || '',
                        delivery_type: patientData.delivery_type || '',
                        development_concerns: patientData.development_concerns || '',
                        early_intervention: patientData.early_intervention || false,

                        pediatrician_name: patientData.pediatrician_name || '',
                        pediatrician_phone: patientData.pediatrician_phone || '',
                        pediatrician_email: patientData.pediatrician_email || '',
                        health_insurance: patientData.health_insurance || '',
                        health_insurance_number: patientData.health_insurance_number || '',

                        allergies: patientData.allergies || '',
                        dietary_restrictions: patientData.dietary_restrictions || '',
                        behavioral_notes: patientData.behavioral_notes || '',
                        communication_preferences: patientData.communication_preferences || ''
                    },
                    medications: patientData.medications || [],
                    emergencyContacts: patientData.emergencyContacts || [],
                    medicalHistory: patientData.medicalHistory || [],
                    professionalContacts: patientData.professionalContacts || []
                });
            }
        } catch (error) {
            console.error('Erro ao carregar dados expandidos:', error);
            if (error.errors) {
                setErrors(error.errors);
            } else {
                setErrors([{ msg: 'Erro ao carregar dados expandidos' }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // FUNÇÃO REMOVIDA: loadCompleteness
    // Motivo: Funcionalidade de completude removida - todos os campos são opcionais

    const handleBasicDataChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setHasUnsavedChanges(true);
    };

    const handleMainDataChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            main: {
                ...prev.main,
                [field]: value
            }
        }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setErrors([]);

            // Validar campos obrigatórios
            if (!formData.name?.trim()) {
                setErrors([{ msg: 'Nome é obrigatório' }]);
                return;
            }

            const basicData = {
                name: formData.name,
                dob: formData.dob || null,
                diagnosis: formData.diagnosis || '',
                general_notes: formData.general_notes || ''
            };

            const expandedData = {
                main: formData.main,
                medications: formData.medications || [],
                emergencyContacts: formData.emergencyContacts || [],
                medicalHistory: formData.medicalHistory || [],
                professionalContacts: formData.professionalContacts || []
            };

            if (patient?.id) {
                // Modo edição - atualizar paciente existente
                // Primeiro atualiza dados básicos via adminApi (se necessário implementar updatePatient)
                // Por enquanto, vamos só atualizar dados expandidos
                await expandedPatientApi.updateExpandedData(patient.id, expandedData);
            } else {
                // Modo criação - criar novo paciente
                const token = localStorage.getItem('token');
                await createPatient(basicData, token);
                // Após criar, buscar ID do paciente criado e salvar dados expandidos
                // Por simplicidade, vamos assumir que os dados expandidos serão salvos posteriormente
            }

            setHasUnsavedChanges(false);

            if (onSave) {
                onSave();
            }

            // Recarregar dados atuais da página
            if (window.location.reload) {
                window.location.reload();
            }

            onClose();

        } catch (error) {
            console.error('Erro ao salvar:', error);
            if (error.errors) {
                setErrors(error.errors);
            } else {
                setErrors([{ msg: error.message || 'Erro ao salvar dados' }]);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (hasUnsavedChanges) {
            if (window.confirm('Existem alterações não salvas. Deseja sair mesmo assim?')) {
                setHasUnsavedChanges(false);
                onClose();
            }
        } else {
            onClose();
        }
    };

    const handleGeneratePDF = async () => {
        if (!patient?.id) {
            alert('É necessário salvar o paciente antes de gerar o PDF.');
            return;
        }

        if (hasUnsavedChanges) {
            alert('Existem alterações não salvas. Por favor, salve antes de gerar o PDF.');
            return;
        }

        try {
            setIsGeneratingPDF(true);

            // Dados básicos do paciente
            const patientBasicData = {
                name: formData.name,
                dob: formData.dob,
                diagnosis: formData.diagnosis
            };

            // Dados da clínica (se disponível)
            const clinicData = user?.clinic_name ? { name: user.clinic_name } : null;

            // Gera o PDF
            await expandedPatientApi.generateRegistrationPDF(patient.id, patientBasicData, clinicData);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar o PDF. Por favor, tente novamente.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    // Auto-save a cada 30 segundos
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const interval = setInterval(async () => {
            try {
                await expandedPatientApi.updateExpandedData(patient.id, formData);
                setHasUnsavedChanges(false);
                console.log('[AUTO-SAVE] Dados salvos automaticamente');
            } catch (error) {
                console.error('[AUTO-SAVE] Erro no salvamento automático:', error);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [hasUnsavedChanges, formData, patient?.id]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return <BasicSection formData={formData} onChange={handleBasicDataChange} />;
            case 'personal':
                return <PersonalSection formData={formData} onChange={handleMainDataChange} />;
            case 'address':
                return <AddressSection formData={formData} onChange={handleMainDataChange} />;
            case 'education':
                return <EducationSection formData={formData} onChange={handleMainDataChange} />;
            case 'development':
                return <DevelopmentSection formData={formData} onChange={handleMainDataChange} />;
            case 'medical':
                return <MedicalSection formData={formData} onChange={handleMainDataChange} />;
            case 'medications':
                return <MedicationsSection
                    medications={formData.medications}
                    onChange={(medications) => {
                        setFormData(prev => ({ ...prev, medications }));
                        setHasUnsavedChanges(true);
                    }}
                />;
            case 'emergency':
                return <EmergencyContactsSection
                    contacts={formData.emergencyContacts}
                    onChange={(emergencyContacts) => {
                        setFormData(prev => ({ ...prev, emergencyContacts }));
                        setHasUnsavedChanges(true);
                    }}
                />;
            case 'history':
                return <MedicalHistorySection
                    history={formData.medicalHistory}
                    onChange={(medicalHistory) => {
                        setFormData(prev => ({ ...prev, medicalHistory }));
                        setHasUnsavedChanges(true);
                    }}
                />;
            case 'professionals':
                return <ProfessionalContactsSection
                    contacts={formData.professionalContacts}
                    onChange={(professionalContacts) => {
                        setFormData(prev => ({ ...prev, professionalContacts }));
                        setHasUnsavedChanges(true);
                    }}
                />;
            default:
                return null;
        }
    };

    // FUNÇÃO REMOVIDA: getTabCompleteness
    // Motivo: Funcionalidade de completude removida - todos os campos são opcionais

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold">
                                Cadastro Expandido - {patient?.name}
                            </h2>
                            <p className="text-blue-100 mt-1">
                                Complete os dados para um cadastro profissional
                            </p>
                            {hasUnsavedChanges && (
                                <div className="flex items-center mt-2 text-yellow-200">
                                    <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                                    <span className="text-sm">Alterações não salvas</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                    </div>
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
                        <div className="flex">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-3 mt-1" />
                            <div>
                                <h3 className="text-sm font-medium text-red-800">
                                    Erros encontrados:
                                </h3>
                                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                                    {errors.map((error, index) => (
                                        <li key={index}>{error.msg}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex h-[calc(95vh-180px)]">
                    {/* Navegação em Abas */}
                    <div className="w-80 bg-gray-50 border-r overflow-y-auto">
                        <nav className="p-4">
                            {tabs.map((tab) => {
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full text-left p-4 rounded-lg mb-2 flex items-center transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-blue-500 text-white shadow-md'
                                                : 'hover:bg-gray-200 text-gray-700'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={tab.icon} className="mr-3" />
                                        <div>
                                            <div className="font-medium">{tab.name}</div>
                                            <div className={`text-xs ${activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {tab.description}
                                            </div>
                                        </div>
                                        {/* REMOVIDO: Indicador de completude - todos os campos são opcionais */}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Conteúdo das Abas */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500" />
                                <span className="ml-3 text-gray-600">Carregando dados...</span>
                            </div>
                        ) : (
                            renderTabContent()
                        )}
                    </div>
                </div>

                {/* Footer com Ações */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
                    <div className="flex items-center text-sm text-gray-600">
                        <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                        {hasUnsavedChanges ?
                            "Salvamento automático ativo" :
                            "Todas as alterações foram salvas"
                        }
                    </div>

                    <div className="flex space-x-3">
                        {/* Botão de Gerar PDF - Apenas para Administradores */}
                        {user?.is_admin && patient?.id && (
                            <button
                                onClick={handleGeneratePDF}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                disabled={isGeneratingPDF || isSaving || hasUnsavedChanges}
                                title={hasUnsavedChanges ? "Salve as alterações antes de gerar o PDF" : "Gerar PDF do Cadastro Completo"}
                            >
                                {isGeneratingPDF ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                        Gerando PDF...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
                                        Gerar PDF
                                    </>
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={isSaving}
                        >
                            <FontAwesomeIcon icon={faTimes} className="mr-2" />
                            {hasUnsavedChanges ? 'Cancelar' : 'Fechar'}
                        </button>

                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                                    Salvar e Finalizar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente para seção de dados pessoais
const BasicSection = ({ formData, onChange }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome completo do paciente"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Nascimento
                </label>
                <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => onChange('dob', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnóstico
            </label>
            <input
                type="text"
                value={formData.diagnosis}
                onChange={(e) => onChange('diagnosis', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Diagnóstico principal"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações Gerais
            </label>
            <textarea
                rows={4}
                value={formData.general_notes}
                onChange={(e) => onChange('general_notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observações gerais sobre o paciente..."
            />
        </div>
    </div>
);

const PersonalSection = ({ formData, onChange }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados dos Responsáveis</h3>

            {/* Primeiro Responsável */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-blue-900 mb-3">Responsável Principal</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo
                        </label>
                        <input
                            type="text"
                            value={formData.main.guardian_name}
                            onChange={(e) => onChange('guardian_name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nome completo do responsável"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Relacionamento
                        </label>
                        <select
                            value={formData.main.guardian_relationship}
                            onChange={(e) => onChange('guardian_relationship', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecionar...</option>
                            <option value="pai">Pai</option>
                            <option value="mae">Mãe</option>
                            <option value="avo_avoa">Avô/Avó</option>
                            <option value="tio_tia">Tio/Tia</option>
                            <option value="responsavel_legal">Responsável Legal</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            value={formData.main.guardian_phone}
                            onChange={(e) => onChange('guardian_phone', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.main.guardian_email}
                            onChange={(e) => onChange('guardian_email', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="email@exemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Profissão
                        </label>
                        <input
                            type="text"
                            value={formData.main.guardian_occupation}
                            onChange={(e) => onChange('guardian_occupation', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Profissão"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Escolaridade
                        </label>
                        <select
                            value={formData.main.guardian_education}
                            onChange={(e) => onChange('guardian_education', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecionar...</option>
                            <option value="fundamental">Ensino Fundamental</option>
                            <option value="medio">Ensino Médio</option>
                            <option value="superior">Ensino Superior</option>
                            <option value="pos_graduacao">Pós-graduação</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Segundo Responsável */}
            <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">Segundo Responsável</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo
                        </label>
                        <input
                            type="text"
                            value={formData.main.second_guardian_name}
                            onChange={(e) => onChange('second_guardian_name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nome do segundo responsável"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Relacionamento
                        </label>
                        <select
                            value={formData.main.second_guardian_relationship}
                            onChange={(e) => onChange('second_guardian_relationship', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecionar...</option>
                            <option value="pai">Pai</option>
                            <option value="mae">Mãe</option>
                            <option value="avo">Avô/Avó</option>
                            <option value="tio">Tio/Tia</option>
                            <option value="tutor">Tutor Legal</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            value={formData.main.second_guardian_phone}
                            onChange={(e) => onChange('second_guardian_phone', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.main.second_guardian_email}
                            onChange={(e) => onChange('second_guardian_email', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="email@exemplo.com"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Profissão
                        </label>
                        <input
                            type="text"
                            value={formData.main.second_guardian_occupation}
                            onChange={(e) => onChange('second_guardian_occupation', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Profissão do segundo responsável"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Componente para seção de endereço
const AddressSection = ({ formData, onChange }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço Residencial</h3>

            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Logradouro
                        </label>
                        <input
                            type="text"
                            value={formData.main.address_street}
                            onChange={(e) => onChange('address_street', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Rua, Avenida, etc."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número
                        </label>
                        <input
                            type="text"
                            value={formData.main.address_number}
                            onChange={(e) => onChange('address_number', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="123"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Complemento
                        </label>
                        <input
                            type="text"
                            value={formData.main.address_complement}
                            onChange={(e) => onChange('address_complement', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Apto, Bloco, etc."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bairro
                        </label>
                        <input
                            type="text"
                            value={formData.main.address_neighborhood}
                            onChange={(e) => onChange('address_neighborhood', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nome do bairro"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cidade
                        </label>
                        <input
                            type="text"
                            value={formData.main.address_city}
                            onChange={(e) => onChange('address_city', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nome da cidade"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                        </label>
                        <select
                            value={formData.main.address_state}
                            onChange={(e) => onChange('address_state', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecionar...</option>
                            <option value="AC">Acre</option>
                            <option value="AL">Alagoas</option>
                            <option value="AP">Amapá</option>
                            <option value="AM">Amazonas</option>
                            <option value="BA">Bahia</option>
                            <option value="CE">Ceará</option>
                            <option value="DF">Distrito Federal</option>
                            <option value="ES">Espírito Santo</option>
                            <option value="GO">Goiás</option>
                            <option value="MA">Maranhão</option>
                            <option value="MT">Mato Grosso</option>
                            <option value="MS">Mato Grosso do Sul</option>
                            <option value="MG">Minas Gerais</option>
                            <option value="PA">Pará</option>
                            <option value="PB">Paraíba</option>
                            <option value="PR">Paraná</option>
                            <option value="PE">Pernambuco</option>
                            <option value="PI">Piauí</option>
                            <option value="RJ">Rio de Janeiro</option>
                            <option value="RN">Rio Grande do Norte</option>
                            <option value="RS">Rio Grande do Sul</option>
                            <option value="RO">Rondônia</option>
                            <option value="RR">Roraima</option>
                            <option value="SC">Santa Catarina</option>
                            <option value="SP">São Paulo</option>
                            <option value="SE">Sergipe</option>
                            <option value="TO">Tocantins</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            CEP
                        </label>
                        <input
                            type="text"
                            value={formData.main.address_zip}
                            onChange={(e) => onChange('address_zip', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="00000-000"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Seção de educação
const EducationSection = ({ formData, onChange }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Educacionais</h3>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome da Escola
                        </label>
                        <input
                            type="text"
                            value={formData.main.school_name}
                            onChange={(e) => onChange('school_name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nome da instituição de ensino"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone da Escola
                        </label>
                        <input
                            type="tel"
                            value={formData.main.school_phone}
                            onChange={(e) => onChange('school_phone', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="(11) 9999-9999"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email da Escola
                    </label>
                    <input
                        type="email"
                        value={formData.main.school_email}
                        onChange={(e) => onChange('school_email', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="contato@escola.com"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Professor(a) Responsável
                        </label>
                        <input
                            type="text"
                            value={formData.main.school_teacher}
                            onChange={(e) => onChange('school_teacher', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nome do professor"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone do Professor
                        </label>
                        <input
                            type="tel"
                            value={formData.main.school_teacher_phone}
                            onChange={(e) => onChange('school_teacher_phone', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="(11) 99999-9999"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Série/Ano
                        </label>
                        <input
                            type="text"
                            value={formData.main.school_grade}
                            onChange={(e) => onChange('school_grade', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ex: 2º ano, 5ª série"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Período
                        </label>
                        <select
                            value={formData.main.school_period}
                            onChange={(e) => onChange('school_period', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="manhã">Manhã</option>
                            <option value="tarde">Tarde</option>
                            <option value="integral">Integral</option>
                            <option value="noite">Noite</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="school_special_needs"
                            checked={formData.main.school_special_needs}
                            onChange={(e) => onChange('school_special_needs', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="school_special_needs" className="ml-2 block text-sm text-gray-700">
                            Possui necessidades especiais na escola
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adaptações Necessárias
                        </label>
                        <textarea
                            value={formData.main.school_adaptations}
                            onChange={(e) => onChange('school_adaptations', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Descreva as adaptações necessárias no ambiente escolar..."
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Seção de desenvolvimento
const DevelopmentSection = ({ formData, onChange }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados de Nascimento e Desenvolvimento</h3>

            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Nascimento</h4>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso ao Nascer (kg)
                            </label>
                            <input
                                type="number"
                                step="0.001"
                                value={formData.main.birth_weight}
                                onChange={(e) => onChange('birth_weight', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="3.500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Altura ao Nascer (cm)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.main.birth_height}
                                onChange={(e) => onChange('birth_height', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="50.0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Idade Gestacional (semanas)
                            </label>
                            <input
                                type="number"
                                value={formData.main.gestational_age}
                                onChange={(e) => onChange('gestational_age', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="40"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Parto
                        </label>
                        <select
                            value={formData.main.delivery_type}
                            onChange={(e) => onChange('delivery_type', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Selecionar...</option>
                            <option value="normal">Normal</option>
                            <option value="cesariana">Cesariana</option>
                            <option value="fórceps">Fórceps</option>
                            <option value="vácuo">Vácuo</option>
                        </select>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Complicações no Parto
                        </label>
                        <textarea
                            value={formData.main.birth_complications}
                            onChange={(e) => onChange('birth_complications', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Descreva quaisquer complicações durante o parto..."
                        />
                    </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3">Desenvolvimento</h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Preocupações com o Desenvolvimento
                            </label>
                            <textarea
                                value={formData.main.development_concerns}
                                onChange={(e) => onChange('development_concerns', e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Marcos do desenvolvimento, preocupações, observações..."
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="early_intervention"
                                checked={formData.main.early_intervention}
                                onChange={(e) => onChange('early_intervention', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="early_intervention" className="ml-2 block text-sm text-gray-700">
                                Participou de programa de intervenção precoce
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Seção médica
const MedicalSection = ({ formData, onChange }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Médicas Gerais</h3>

            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Pediatra</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do Pediatra
                            </label>
                            <input
                                type="text"
                                value={formData.main.pediatrician_name}
                                onChange={(e) => onChange('pediatrician_name', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Dr. João Silva"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefone do Pediatra
                            </label>
                            <input
                                type="tel"
                                value={formData.main.pediatrician_phone}
                                onChange={(e) => onChange('pediatrician_phone', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="(11) 9999-9999"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email do Pediatra
                        </label>
                        <input
                            type="email"
                            value={formData.main.pediatrician_email}
                            onChange={(e) => onChange('pediatrician_email', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="dr.joao@clinica.com"
                        />
                    </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-3">Plano de Saúde</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome do Plano
                            </label>
                            <input
                                type="text"
                                value={formData.main.health_insurance}
                                onChange={(e) => onChange('health_insurance', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nome do plano de saúde"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número da Carteirinha
                            </label>
                            <input
                                type="text"
                                value={formData.main.health_insurance_number}
                                onChange={(e) => onChange('health_insurance_number', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Número da carteirinha"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-3">Alergias e Restrições</h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alergias
                            </label>
                            <textarea
                                value={formData.main.allergies}
                                onChange={(e) => onChange('allergies', e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Descreva alergias conhecidas (medicamentos, alimentos, etc.)..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Restrições Alimentares
                            </label>
                            <textarea
                                value={formData.main.dietary_restrictions}
                                onChange={(e) => onChange('dietary_restrictions', e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Restrições alimentares, dietas especiais, etc..."
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-3">Observações Adicionais</h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas Comportamentais
                            </label>
                            <textarea
                                value={formData.main.behavioral_notes}
                                onChange={(e) => onChange('behavioral_notes', e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Observações sobre comportamento, preferências, etc..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Preferências de Comunicação
                            </label>
                            <textarea
                                value={formData.main.communication_preferences}
                                onChange={(e) => onChange('communication_preferences', e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Como prefere receber comunicados, horários de contato, etc..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Componente para medicações
const MedicationsSection = ({ medications, onChange }) => {
    const addMedication = () => {
        const newMedication = {
            id: Date.now(),
            medication_name: '',
            dosage: '',
            frequency: '',
            administration_time: '',
            prescribing_doctor: '',
            doctor_phone: '',
            doctor_email: '',
            doctor_specialty: '',
            notes: '',
            is_current: true
        };
        onChange([...medications, newMedication]);
    };

    const removeMedication = (index) => {
        onChange(medications.filter((_, i) => i !== index));
    };

    const updateMedication = (index, field, value) => {
        const updated = medications.map((med, i) =>
            i === index ? { ...med, [field]: value } : med
        );
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Medicações Atuais</h3>
                <button
                    onClick={addMedication}
                    className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors"
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Adicionar Medicação
                </button>
            </div>

            {medications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faHeartbeat} size="2x" className="mb-3 opacity-50" />
                    <p>Nenhuma medicação cadastrada</p>
                    <p className="text-sm">Clique em "Adicionar Medicação" para começar</p>
                </div>
            ) : (
                medications.map((med, index) => (
                    <div key={med.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium text-gray-900">
                                Medicação {index + 1}
                            </h4>
                            <button
                                onClick={() => removeMedication(index)}
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome da Medicação
                                </label>
                                <input
                                    type="text"
                                    value={med.medication_name}
                                    onChange={(e) => updateMedication(index, 'medication_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome da medicação"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Dosagem
                                </label>
                                <input
                                    type="text"
                                    value={med.dosage}
                                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: 10mg, 1 comprimido"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Frequência
                                </label>
                                <input
                                    type="text"
                                    value={med.frequency}
                                    onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: 2x ao dia, 1x pela manhã"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Horário de Administração
                                </label>
                                <input
                                    type="text"
                                    value={med.administration_time}
                                    onChange={(e) => updateMedication(index, 'administration_time', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: 8h e 20h, junto às refeições"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Médico Prescritor
                                </label>
                                <input
                                    type="text"
                                    value={med.prescribing_doctor}
                                    onChange={(e) => updateMedication(index, 'prescribing_doctor', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome do médico"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Especialidade do Médico
                                </label>
                                <input
                                    type="text"
                                    value={med.doctor_specialty}
                                    onChange={(e) => updateMedication(index, 'doctor_specialty', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: Neurologista, Psiquiatra"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observações
                            </label>
                            <textarea
                                value={med.notes}
                                onChange={(e) => updateMedication(index, 'notes', e.target.value)}
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Observações importantes sobre a medicação..."
                            />
                        </div>

                        <div className="mt-4 flex items-center">
                            <input
                                type="checkbox"
                                id={`is_current_${index}`}
                                checked={med.is_current}
                                onChange={(e) => updateMedication(index, 'is_current', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`is_current_${index}`} className="ml-2 block text-sm text-gray-700">
                                Medicação em uso atualmente
                            </label>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// Componente para contatos de emergência
const EmergencyContactsSection = ({ contacts, onChange }) => {
    const addContact = () => {
        const newContact = {
            id: Date.now(),
            contact_name: '',
            relationship: '',
            phone_primary: '',
            phone_secondary: '',
            email: '',
            address: '',
            priority_order: contacts.length + 1,
            can_authorize_treatment: false,
            can_pick_up_patient: false,
            notes: ''
        };
        onChange([...contacts, newContact]);
    };

    const removeContact = (index) => {
        onChange(contacts.filter((_, i) => i !== index));
    };

    const updateContact = (index, field, value) => {
        const updated = contacts.map((contact, i) =>
            i === index ? { ...contact, [field]: value } : contact
        );
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Contatos de Emergência</h3>
                <button
                    onClick={addContact}
                    className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Adicionar Contato
                </button>
            </div>

            {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="mb-3 opacity-50" />
                    <p>Nenhum contato de emergência cadastrado</p>
                    <p className="text-sm">É importante ter pelo menos um contato de emergência</p>
                </div>
            ) : (
                contacts.map((contact, index) => (
                    <div key={contact.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium text-gray-900">
                                Contato de Emergência {index + 1}
                                {index === 0 && <span className="text-red-500 text-sm ml-2">(Prioritário)</span>}
                            </h4>
                            <button
                                onClick={() => removeContact(index)}
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome Completo                                </label>
                                <input
                                    type="text"
                                    value={contact.contact_name}
                                    onChange={(e) => updateContact(index, 'contact_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome do contato"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Relacionamento                                </label>
                                <select
                                    value={contact.relationship}
                                    onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecionar...</option>
                                    <option value="pai">Pai</option>
                                    <option value="mae">Mãe</option>
                                    <option value="avo">Avô/Avó</option>
                                    <option value="tio">Tio/Tia</option>
                                    <option value="primo">Primo/Prima</option>
                                    <option value="vizinho">Vizinho</option>
                                    <option value="amigo">Amigo da Família</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone Principal                                </label>
                                <input
                                    type="tel"
                                    value={contact.phone_primary}
                                    onChange={(e) => updateContact(index, 'phone_primary', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone Secundário
                                </label>
                                <input
                                    type="tel"
                                    value={contact.phone_secondary}
                                    onChange={(e) => updateContact(index, 'phone_secondary', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="(11) 9999-9999"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={contact.email}
                                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Endereço
                                </label>
                                <input
                                    type="text"
                                    value={contact.address}
                                    onChange={(e) => updateContact(index, 'address', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Endereço completo"
                                />
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`can_authorize_${index}`}
                                    checked={contact.can_authorize_treatment}
                                    onChange={(e) => updateContact(index, 'can_authorize_treatment', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`can_authorize_${index}`} className="ml-2 block text-sm text-gray-700">
                                    Pode autorizar tratamentos médicos
                                </label>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`can_pick_up_${index}`}
                                    checked={contact.can_pick_up_patient}
                                    onChange={(e) => updateContact(index, 'can_pick_up_patient', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`can_pick_up_${index}`} className="ml-2 block text-sm text-gray-700">
                                    Pode buscar o paciente
                                </label>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observações
                            </label>
                            <textarea
                                value={contact.notes}
                                onChange={(e) => updateContact(index, 'notes', e.target.value)}
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Informações adicionais sobre este contato..."
                            />
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// Componente para histórico médico
const MedicalHistorySection = ({ history, onChange }) => {
    const addHistoryItem = () => {
        const newItem = {
            id: Date.now(),
            condition_name: '',
            condition_type: '',
            diagnosis_date: '',
            treating_physician: '',
            physician_specialty: '',
            physician_phone: '',
            physician_email: '',
            treatment_status: 'ativo',
            notes: '',
            relevant_for_therapy: false
        };
        onChange([...history, newItem]);
    };

    const removeHistoryItem = (index) => {
        onChange(history.filter((_, i) => i !== index));
    };

    const updateHistoryItem = (index, field, value) => {
        const updated = history.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        );
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Histórico Médico</h3>
                <button
                    onClick={addHistoryItem}
                    className="px-3 py-1 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 transition-colors"
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Adicionar Condição
                </button>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faUserMd} size="2x" className="mb-3 opacity-50" />
                    <p>Nenhuma condição médica cadastrada</p>
                    <p className="text-sm">Adicione diagnósticos, cirurgias ou tratamentos relevantes</p>
                </div>
            ) : (
                history.map((item, index) => (
                    <div key={item.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium text-gray-900">
                                Condição Médica {index + 1}
                            </h4>
                            <button
                                onClick={() => removeHistoryItem(index)}
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome da Condição/Diagnóstico                                </label>
                                <input
                                    type="text"
                                    value={item.condition_name}
                                    onChange={(e) => updateHistoryItem(index, 'condition_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome da condição ou diagnóstico"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={item.condition_type}
                                    onChange={(e) => updateHistoryItem(index, 'condition_type', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecionar...</option>
                                    <option value="diagnóstico">Diagnóstico</option>
                                    <option value="cirurgia">Cirurgia</option>
                                    <option value="internação">Internação</option>
                                    <option value="exame">Exame</option>
                                    <option value="tratamento">Tratamento</option>
                                    <option value="acompanhamento">Acompanhamento</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data do Diagnóstico
                                </label>
                                <input
                                    type="date"
                                    value={item.diagnosis_date}
                                    onChange={(e) => updateHistoryItem(index, 'diagnosis_date', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status do Tratamento
                                </label>
                                <select
                                    value={item.treatment_status}
                                    onChange={(e) => updateHistoryItem(index, 'treatment_status', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="finalizado">Finalizado</option>
                                    <option value="suspenso">Suspenso</option>
                                    <option value="monitoramento">Em Monitoramento</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Médico Responsável
                                </label>
                                <input
                                    type="text"
                                    value={item.treating_physician}
                                    onChange={(e) => updateHistoryItem(index, 'treating_physician', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome do médico responsável"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Especialidade
                                </label>
                                <input
                                    type="text"
                                    value={item.physician_specialty}
                                    onChange={(e) => updateHistoryItem(index, 'physician_specialty', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Especialidade médica"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observações Detalhadas
                            </label>
                            <textarea
                                value={item.notes}
                                onChange={(e) => updateHistoryItem(index, 'notes', e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Detalhes sobre a condição, tratamentos, resultados, etc..."
                            />
                        </div>

                        <div className="mt-4 flex items-center">
                            <input
                                type="checkbox"
                                id={`relevant_${index}`}
                                checked={item.relevant_for_therapy}
                                onChange={(e) => updateHistoryItem(index, 'relevant_for_therapy', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`relevant_${index}`} className="ml-2 block text-sm text-gray-700">
                                Relevante para o tratamento terapêutico atual
                            </label>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// Componente para contatos profissionais
const ProfessionalContactsSection = ({ contacts, onChange }) => {
    const addContact = () => {
        const newContact = {
            id: Date.now(),
            professional_type: '',
            professional_name: '',
            clinic_name: '',
            phone: '',
            email: '',
            specialty: '',
            frequency_of_visits: '',
            last_appointment: '',
            next_appointment: '',
            notes: ''
        };
        onChange([...contacts, newContact]);
    };

    const removeContact = (index) => {
        onChange(contacts.filter((_, i) => i !== index));
    };

    const updateContact = (index, field, value) => {
        const updated = contacts.map((contact, i) =>
            i === index ? { ...contact, [field]: value } : contact
        );
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Outros Profissionais</h3>
                <button
                    onClick={addContact}
                    className="px-3 py-1 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition-colors"
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Adicionar Profissional
                </button>
            </div>

            {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faPhone} size="2x" className="mb-3 opacity-50" />
                    <p>Nenhum profissional cadastrado</p>
                    <p className="text-sm">Adicione psiquiatras, neurologistas, psicólogos, etc.</p>
                </div>
            ) : (
                contacts.map((contact, index) => (
                    <div key={contact.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-medium text-gray-900">
                                Profissional {index + 1}
                            </h4>
                            <button
                                onClick={() => removeContact(index)}
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Profissional                                </label>
                                <select
                                    value={contact.professional_type}
                                    onChange={(e) => updateContact(index, 'professional_type', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecionar...</option>
                                    <option value="psiquiatra">Psiquiatra</option>
                                    <option value="neurologista">Neurologista</option>
                                    <option value="psicologo">Psicólogo</option>
                                    <option value="fonoaudiologo">Fonoaudiólogo</option>
                                    <option value="terapeuta_ocupacional">Terapeuta Ocupacional</option>
                                    <option value="fisioterapeuta">Fisioterapeuta</option>
                                    <option value="nutricionista">Nutricionista</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome do Profissional                                </label>
                                <input
                                    type="text"
                                    value={contact.professional_name}
                                    onChange={(e) => updateContact(index, 'professional_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome completo do profissional"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Clínica/Instituição
                                </label>
                                <input
                                    type="text"
                                    value={contact.clinic_name}
                                    onChange={(e) => updateContact(index, 'clinic_name', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nome da clínica ou instituição"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Especialidade
                                </label>
                                <input
                                    type="text"
                                    value={contact.specialty}
                                    onChange={(e) => updateContact(index, 'specialty', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Especialidade específica"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone
                                </label>
                                <input
                                    type="tel"
                                    value={contact.phone}
                                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="(11) 9999-9999"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={contact.email}
                                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="email@clinica.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Frequência das Consultas
                                </label>
                                <select
                                    value={contact.frequency_of_visits}
                                    onChange={(e) => updateContact(index, 'frequency_of_visits', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecionar...</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="quinzenal">Quinzenal</option>
                                    <option value="mensal">Mensal</option>
                                    <option value="bimestral">Bimestral</option>
                                    <option value="semestral">Semestral</option>
                                    <option value="anual">Anual</option>
                                    <option value="conforme_necessario">Conforme necessário</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Última Consulta
                                </label>
                                <input
                                    type="date"
                                    value={contact.last_appointment}
                                    onChange={(e) => updateContact(index, 'last_appointment', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Próxima Consulta Agendada
                            </label>
                            <input
                                type="date"
                                value={contact.next_appointment}
                                onChange={(e) => updateContact(index, 'next_appointment', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observações
                            </label>
                            <textarea
                                value={contact.notes}
                                onChange={(e) => updateContact(index, 'notes', e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Informações importantes sobre o acompanhamento com este profissional..."
                            />
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ExpandedPatientForm;