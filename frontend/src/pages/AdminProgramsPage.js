// frontend/src/pages/admin/AdminProgramsPage.js

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext'; // Supondo que você tenha um AuthContext

const AdminProgramsPage = () => {
    const [programName, setProgramName] = useState('');
    const [areas, setAreas] = useState([{ name: '', objectives: [{ description: '', type: 'tentativa', goal: 10 }] }]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { user, token } = useAuth(); // Obter token do contexto de autenticação

    const handleAddArea = () => {
        setAreas([...areas, { name: '', objectives: [{ description: '', type: 'tentativa', goal: 10 }] }]);
    };

    const handleAddObjective = (areaIndex) => {
        const newAreas = [...areas];
        newAreas[areaIndex].objectives.push({ description: '', type: 'tentativa', goal: 10 });
        setAreas(newAreas);
    };

    const handleInputChange = (areaIndex, objectiveIndex, event) => {
        const { name, value } = event.target;
        const newAreas = [...areas];
        if (objectiveIndex === null) { // Mudança no nome da área
            newAreas[areaIndex][name] = value;
        } else { // Mudança em um objetivo
            newAreas[areaIndex].objectives[objectiveIndex][name] = value;
        }
        setAreas(newAreas);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!programName.trim()) {
            setError('O nome do programa é obrigatório.');
            return;
        }

        const newProgram = {
            name: programName,
            areas,
            is_public: false, // Programas criados por admins são específicos da clínica
        };

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Envia o token de autenticação
                },
            };
            await axios.post('http://localhost:5000/api/programs', newProgram, config);
            setMessage('Programa criado com sucesso!');
            // Limpar formulário
            setProgramName('');
            setAreas([{ name: '', objectives: [{ description: '', type: 'tentativa', goal: 10 }] }]);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao criar o programa.');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Criar Novo Programa de Intervenção</h1>
            {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
            
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="programName">
                        Nome do Programa
                    </label>
                    <input
                        id="programName"
                        type="text"
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>

                {areas.map((area, areaIndex) => (
                    <div key={areaIndex} className="mb-6 p-4 border rounded">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Nome da Área {areaIndex + 1}
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={area.name}
                            onChange={(e) => handleInputChange(areaIndex, null, e)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                        />
                        
                        {area.objectives.map((objective, objectiveIndex) => (
                            <div key={objectiveIndex} className="ml-4 mt-2 p-2 border-l-4">
                                <label className="block text-gray-700 text-xs font-bold mb-1">
                                    Objetivo {objectiveIndex + 1}
                                </label>
                                <textarea
                                    name="description"
                                    value={objective.description}
                                    onChange={(e) => handleInputChange(areaIndex, objectiveIndex, e)}
                                    placeholder="Descrição do objetivo"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 text-sm"
                                ></textarea>
                            </div>
                        ))}
                        <button type="button" onClick={() => handleAddObjective(areaIndex)} className="mt-2 text-sm text-blue-500 hover:text-blue-700">
                            + Adicionar Objetivo
                        </button>
                    </div>
                ))}
                
                <button type="button" onClick={handleAddArea} className="mb-4 text-blue-600 hover:text-blue-800 font-semibold">
                    + Adicionar Nova Área
                </button>

                <div className="flex items-center justify-between">
                    <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                        Salvar Programa
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminProgramsPage;
