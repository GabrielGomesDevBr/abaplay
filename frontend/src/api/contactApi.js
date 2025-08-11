import axios from 'axios';
import { API_URL } from '../config';

const CONTACT_API_URL = `${API_URL}/contacts`;

/**
 * Busca terapeutas atribuídos a um paciente
 * Para uso pelos pais ou terapeutas
 */
export const getTherapistContacts = async (patientId) => {
  try {
    console.log('[CONTACT-API] getTherapistContacts: Buscando para patientId:', patientId);
    const token = localStorage.getItem('token');
    const response = await axios.get(`${CONTACT_API_URL}/therapists/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    console.log('[CONTACT-API] getTherapistContacts: Sucesso - terapeutas encontrados:', response.data.therapists?.length || 0);
    return response.data;
  } catch (error) {
    console.error('[CONTACT-API] getTherapistContacts: Erro -', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Busca colegas terapeutas que trabalham com o mesmo paciente
 * Para uso em discussões de caso entre terapeutas
 */
export const getColleagueContacts = async (patientId) => {
  try {
    console.log('[CONTACT-API] getColleagueContacts: Buscando para patientId:', patientId);
    const token = localStorage.getItem('token');
    const response = await axios.get(`${CONTACT_API_URL}/colleagues/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    console.log('[CONTACT-API] getColleagueContacts: Sucesso - colegas encontrados:', response.data.colleagues?.length || 0);
    return response.data;
  } catch (error) {
    console.error('[CONTACT-API] getColleagueContacts: Erro -', error.response?.data || error.message);
    throw error;
  }
};