// frontend/src/components/admin/RoomsManager.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDoorOpen,
  faPlus,
  faEdit,
  faTrash,
  faSave,
  faTimes,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faEye,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import availabilityApi from '../../api/availabilityApi';

/**
 * Componente para gerenciar salas da clínica
 * Permite criar, editar, visualizar e desativar salas
 */
const RoomsManager = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    room_type: 'therapy',
    capacity: 1,
    has_mirror: false,
    has_sensory_equipment: false,
    equipment_notes: ''
  });

  useEffect(() => {
    loadRooms();
  }, [showInactive]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await availabilityApi.getRooms(!showInactive);
      setRooms(response.rooms || []);
    } catch (error) {
      console.error('Erro ao carregar salas:', error);
      toast.error('Erro ao carregar salas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      room_type: 'therapy',
      capacity: 1,
      has_mirror: false,
      has_sensory_equipment: false,
      equipment_notes: ''
    });
    setEditingRoom(null);
    setShowForm(false);
  };

  const handleEdit = (room) => {
    setFormData({
      name: room.name,
      room_type: room.room_type || 'therapy',
      capacity: room.capacity || 1,
      has_mirror: room.has_mirror || false,
      has_sensory_equipment: room.has_sensory_equipment || false,
      equipment_notes: room.equipment_notes || ''
    });
    setEditingRoom(room);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação
    const errors = availabilityApi.validateRoomData(formData);
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    try {
      setSaving(true);

      if (editingRoom) {
        // Atualizar sala existente
        await availabilityApi.updateRoom(editingRoom.id, formData);
        toast.success('Sala atualizada com sucesso!');
      } else {
        // Criar nova sala
        await availabilityApi.createRoom(formData);
        toast.success('Sala criada com sucesso!');
      }

      resetForm();
      loadRooms();
    } catch (error) {
      console.error('Erro ao salvar sala:', error);
      toast.error(error.message || 'Erro ao salvar sala');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja desativar a sala "${room.name}"?\n\nA sala será marcada como inativa e não poderá ser usada em novos agendamentos.`
    );

    if (!confirmDelete) return;

    try {
      await availabilityApi.deleteRoom(room.id);
      toast.success('Sala desativada com sucesso!');
      loadRooms();
    } catch (error) {
      console.error('Erro ao desativar sala:', error);
      toast.error(error.message || 'Erro ao desativar sala');
    }
  };

  const getRoomTypeLabel = (type) => {
    const types = {
      therapy: 'Terapia',
      observation: 'Observação',
      sensory: 'Sensorial',
      meeting: 'Reunião',
      other: 'Outro'
    };
    return types[type] || type;
  };

  const getRoomTypeBadgeClass = (type) => {
    const classes = {
      therapy: 'bg-blue-100 text-blue-800',
      observation: 'bg-purple-100 text-purple-800',
      sensory: 'bg-green-100 text-green-800',
      meeting: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faDoorOpen} className="mr-3 text-blue-600" />
            Gestão de Salas
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Gerencie as salas disponíveis para agendamento
          </p>
        </div>

        <div className="flex gap-3">
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
            />
            Mostrar inativas
          </label>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Nova Sala
            </button>
          )}
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="mb-6 bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingRoom ? 'Editar Sala' : 'Nova Sala'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Sala *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Sala 1, Sala Azul, etc."
                  required
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Sala
                </label>
                <select
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="therapy">Terapia</option>
                  <option value="observation">Observação</option>
                  <option value="sensory">Sensorial</option>
                  <option value="meeting">Reunião</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              {/* Capacidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidade (sessões simultâneas)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número de sessões que podem ocorrer simultaneamente
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.has_mirror}
                  onChange={(e) => setFormData({ ...formData, has_mirror: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Possui espelho de observação
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.has_sensory_equipment}
                  onChange={(e) => setFormData({ ...formData, has_sensory_equipment: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Possui equipamentos sensoriais
                </span>
              </label>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações sobre Equipamentos
              </label>
              <textarea
                value={formData.equipment_notes}
                onChange={(e) => setFormData({ ...formData, equipment_notes: e.target.value })}
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva equipamentos disponíveis, restrições, etc."
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {editingRoom ? 'Atualizar' : 'Criar'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Salas */}
      {loading ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600 text-3xl" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FontAwesomeIcon icon={faDoorOpen} size="3x" className="mb-4 text-gray-300" />
          <p className="text-lg">Nenhuma sala cadastrada</p>
          <p className="text-sm mt-2">Clique em "Nova Sala" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`border rounded-lg p-4 transition-all ${
                room.is_active
                  ? 'border-gray-300 hover:border-blue-400 hover:shadow-md'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    {room.name}
                    {!room.is_active && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                        Inativa
                      </span>
                    )}
                  </h3>
                  <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${getRoomTypeBadgeClass(room.room_type)}`}>
                    {getRoomTypeLabel(room.room_type)}
                  </span>
                </div>

                {room.is_active && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(room)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Editar"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => handleDelete(room)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Desativar"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faUsers} className="mr-2 text-gray-400 w-4" />
                  <span>Capacidade: {room.capacity} sessão{room.capacity !== 1 ? 'ões' : ''}</span>
                </div>

                {room.has_mirror && (
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-green-600 w-4" />
                    <span>Espelho de observação</span>
                  </div>
                )}

                {room.has_sensory_equipment && (
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-green-600 w-4" />
                    <span>Equipamentos sensoriais</span>
                  </div>
                )}

                {room.equipment_notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <strong>Equipamentos:</strong>
                    <p className="mt-1 text-gray-600">{room.equipment_notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomsManager;
