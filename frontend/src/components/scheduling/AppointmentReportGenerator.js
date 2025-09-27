// frontend/src/components/scheduling/AppointmentReportGenerator.js

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getAppointments, getClinicStatistics } from '../../api/schedulingApi';

/**
 * Classe para geração de relatórios de agendamento em PDF
 * Maximiza reutilização do código existente conforme especificação MVP
 */
export class AppointmentReportGenerator {

  /**
   * Gera relatório baseado na configuração fornecida
   * @param {Object} config - Configuração do relatório
   * @param {Object} config.period - Período do relatório
   * @param {Object} config.scope - Escopo do relatório (todos ou individual)
   */
  async generateReport(config) {
    try {
      // Buscar dados usando APIs existentes
      const appointmentsData = await this.fetchReportData(config);

      if (config.scope.type === 'all') {
        return this.generateGeneralReport(appointmentsData, config);
      } else {
        return this.generateIndividualReport(appointmentsData, config);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw new Error('Falha na geração do relatório');
    }
  }

  /**
   * Busca dados necessários para o relatório usando APIs existentes
   */
  async fetchReportData(config) {
    const filters = {
      start_date: config.period.startDate,
      end_date: config.period.endDate,
      therapist_id: config.scope.therapistId || undefined,
      limit: 1000 // Buscar todos os registros do período
    };

    // Buscar agendamentos
    const appointmentsResponse = await getAppointments(filters);
    const appointments = appointmentsResponse.appointments || [];

    // Buscar estatísticas da clínica
    const statistics = await getClinicStatistics(
      config.period.startDate,
      config.period.endDate
    );

    return {
      appointments,
      statistics,
      config
    };
  }

  /**
   * Gera relatório geral (todos os terapeutas) seguindo padrão dos PDFs existentes
   */
  generateGeneralReport(data, config) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { appointments, statistics } = data;
    const margin = 15;
    let yPosition = margin + 10;

    // Header do relatório
    yPosition = this.addReportHeader(doc, 'RELATORIO DE AGENDAMENTOS - GERAL', config);

    // Verificar se precisa de nova página
    const checkAndAddPage = (currentY, requiredHeight = 30) => {
      if (currentY > doc.internal.pageSize.getHeight() - margin - requiredHeight) {
        this.addReportFooter(doc);
        doc.addPage();
        return margin + 10;
      }
      return currentY;
    };

    // Resumo Executivo
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addExecutiveSummary(doc, statistics, yPosition);

    // Previsto vs Realizado
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addPredictedVsActual(doc, statistics, yPosition);

    // Performance por Terapeuta
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addTherapistPerformance(doc, appointments, yPosition);

    // Agenda Detalhada
    yPosition = checkAndAddPage(yPosition);
    this.addDetailedSchedule(doc, appointments, yPosition);

    // Footer final
    this.addReportFooter(doc);

    // Download do PDF
    const fileName = `relatorio_agendamentos_geral_${config.period.startDate}_${config.period.endDate}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  }

  /**
   * Gera relatório individual (terapeuta específico)
   */
  generateIndividualReport(data, config) {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const { appointments } = data;

    // Encontrar nome do terapeuta
    const therapistName = appointments.length > 0 ?
      appointments[0].therapist_name : 'Terapeuta Não Encontrado';

    // Header do relatório
    this.addReportHeader(doc, `RELATÓRIO INDIVIDUAL - ${therapistName.toUpperCase()}`, config);

    let yPosition = 60;

    // Performance Individual
    yPosition = this.addIndividualPerformance(doc, appointments, yPosition);

    // Detalhamento Estatístico
    yPosition = this.addStatisticalDetails(doc, appointments, yPosition);

    // Nova página se necessário
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    // Agenda Detalhada Individual
    yPosition = this.addIndividualDetailedSchedule(doc, appointments, yPosition);

    // Resumo para Pagamento
    yPosition = this.addPaymentSummary(doc, appointments, config, yPosition);

    // Footer
    this.addReportFooter(doc);

    // Download do PDF
    const fileName = `relatorio_individual_${therapistName.replace(/\s+/g, '_')}_${config.period.startDate}_${config.period.endDate}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  }

  /**
   * Adiciona header padrão do relatório (seguindo padrão dos PDFs existentes)
   */
  addReportHeader(doc, title, config) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título principal
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, margin + 10, { align: 'center' });

    // Informações do período
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${this.formatDate(config.period.startDate)} a ${this.formatDate(config.period.endDate)}`, margin, margin + 20);

    const scopeText = config.scope.type === 'all' ?
      'Escopo: Todos os Terapeutas' :
      'Escopo: Terapeuta Individual';
    doc.text(scopeText, margin, margin + 26);

    // Data de geração
    doc.text(`Gerado em: ${this.formatDate(new Date().toISOString())}`, pageWidth - margin, margin + 20, { align: 'right' });

    // Linha separadora
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(margin, margin + 35, pageWidth - margin, margin + 35);

    return margin + 45; // Retorna posição Y após header
  }

  /**
   * Adiciona resumo executivo (seguindo padrão dos PDFs existentes)
   */
  addExecutiveSummary(doc, statistics, yPosition) {
    const margin = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO EXECUTIVO', margin, yPosition);

    yPosition += 8;

    const summaryData = [
      ['Total de Agendamentos', `${statistics.total_appointments || 0}`],
      ['Sessoes Realizadas', `${statistics.completed_appointments || 0} (${this.calculatePercentage(statistics.completed_appointments, statistics.total_appointments)}%)`],
      ['Faltas', `${statistics.missed_appointments || 0} (${this.calculatePercentage(statistics.missed_appointments, statistics.total_appointments)}%)`],
      ['Cancelamentos', `${statistics.cancelled_appointments || 0} (${this.calculatePercentage(statistics.cancelled_appointments, statistics.total_appointments)}%)`],
      ['Taxa de Comparecimento', `${statistics.attendance_rate || 0}%`]
    ];

    // Usar autoTable para formatação consistente
    doc.autoTable({
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'plain',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'center' }
      },
      margin: { left: margin }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona seção Previsto vs Realizado (seguindo padrão dos PDFs existentes)
   */
  addPredictedVsActual(doc, statistics, yPosition) {
    const margin = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PREVISTO vs REALIZADO', margin, yPosition);

    yPosition += 8;

    const scheduled = statistics.total_appointments || 0;
    const completed = statistics.completed_appointments || 0;
    const difference = scheduled - completed;
    const effectiveRate = this.calculatePercentage(completed, scheduled);
    const diffPercentage = this.calculatePercentage(Math.abs(difference), scheduled);

    const predictedData = [
      ['Agendamentos Previstos', `${scheduled} sessoes`],
      ['Sessoes Efetivamente Realizadas', `${completed} sessoes`],
      ['Diferenca', `${difference >= 0 ? '-' : '+'}${Math.abs(difference)} sessoes (${difference >= 0 ? '-' : '+'}${diffPercentage}%)`],
      ['Taxa de Efetivacao', `${effectiveRate}%`]
    ];

    // Usar autoTable para formatação consistente
    doc.autoTable({
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: predictedData,
      theme: 'plain',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'center' }
      },
      margin: { left: margin }
    });

    return doc.lastAutoTable.finalY + 10;
  }

  /**
   * Adiciona tabela de performance por terapeuta (seguindo padrão dos PDFs existentes)
   */
  addTherapistPerformance(doc, appointments, yPosition) {
    const margin = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE POR TERAPEUTA', margin, yPosition);

    yPosition += 8;

    // Agrupar dados por terapeuta
    const therapistStats = this.groupAppointmentsByTherapist(appointments);

    const tableData = therapistStats.map(therapist => [
      therapist.name,
      therapist.scheduled.toString(),
      therapist.completed.toString(),
      therapist.missed.toString(),
      `${therapist.rate}%`
    ]);

    // Adicionar linha de total
    const totals = this.calculateTotals(therapistStats);
    tableData.push([
      'TOTAL CLINICA',
      totals.scheduled.toString(),
      totals.completed.toString(),
      totals.missed.toString(),
      `${totals.rate}%`
    ]);

    doc.autoTable({
      head: [['Terapeuta', 'Agend', 'Real', 'Faltas', 'Taxa%']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: margin }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  /**
   * Adiciona agenda detalhada (seguindo padrão dos PDFs existentes)
   */
  addDetailedSchedule(doc, appointments, yPosition) {
    const margin = 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AGENDA DETALHADA', margin, yPosition);

    yPosition += 8;

    // Ordenar agendamentos por data e hora
    const sortedAppointments = appointments.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA - dateB;
    });

    const tableData = sortedAppointments.slice(0, 50).map(appointment => [
      this.formatDate(appointment.scheduled_date),
      appointment.scheduled_time,
      appointment.patient_name || 'N/A',
      appointment.therapist_name || 'N/A',
      this.formatStatus(appointment.status)
    ]);

    doc.autoTable({
      head: [['Data', 'Hora', 'Paciente', 'Terapeuta', 'Status']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 25 }
      }
    });

    if (sortedAppointments.length > 50) {
      doc.setFontSize(8);
      doc.text(`Nota: Mostrando apenas os primeiros 50 registros de ${sortedAppointments.length} total.`, 20, doc.lastAutoTable.finalY + 5);
    }
  }

  /**
   * Adiciona performance individual
   */
  addIndividualPerformance(doc, appointments, yPosition) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 PERFORMANCE INDIVIDUAL', 20, yPosition);

    yPosition += 10;

    const stats = this.calculateIndividualStats(appointments);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const performanceData = [
      [`Total de Agendamentos`, `${stats.total}`],
      [`Sessões Realizadas`, `${stats.completed} (${stats.completedRate}%)`],
      [`Faltas`, `${stats.missed} (${stats.missedRate}%)`],
      [`Cancelamentos`, `${stats.cancelled} (${stats.cancelledRate}%)`],
      [`Taxa de Comparecimento`, `${stats.attendanceRate}%`]
    ];

    performanceData.forEach(([label, value]) => {
      doc.text(`├── ${label}: ${value}`, 25, yPosition);
      yPosition += 6;
    });

    return yPosition + 10;
  }

  /**
   * Adiciona detalhamento estatístico
   */
  addStatisticalDetails(doc, appointments, yPosition) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📈 DETALHAMENTO ESTATÍSTICO', 20, yPosition);

    yPosition += 10;

    const stats = this.calculateAdvancedStats(appointments);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const statisticalData = [
      [`Agendamentos por Semana`, `${stats.avgPerWeek} (média)`],
      [`Sessões Realizadas por Semana`, `${stats.completedPerWeek} (média)`],
      [`Maior Sequência de Sucessos`, `${stats.longestSuccessStreak} sessões`],
      [`Última Falta Registrada`, stats.lastMissed || 'Nenhuma falta no período'],
      [`Pontualidade Geral`, `${stats.punctuality}%`]
    ];

    statisticalData.forEach(([label, value]) => {
      doc.text(`├── ${label}: ${value}`, 25, yPosition);
      yPosition += 6;
    });

    return yPosition + 10;
  }

  /**
   * Adiciona agenda detalhada individual
   */
  addIndividualDetailedSchedule(doc, appointments, yPosition) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📅 AGENDA DETALHADA - TERAPEUTA', 20, yPosition);

    yPosition += 10;

    const sortedAppointments = appointments.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA - dateB;
    });

    const tableData = sortedAppointments.map(appointment => [
      this.formatDate(appointment.scheduled_date),
      appointment.scheduled_time,
      appointment.patient_name || 'N/A',
      appointment.program_name || 'N/A',
      this.formatStatus(appointment.status)
    ]);

    doc.autoTable({
      head: [['Data', 'Hora', 'Paciente', 'Programa', 'Status']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 25 }
      }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  /**
   * Adiciona resumo para pagamento
   */
  addPaymentSummary(doc, appointments, config, yPosition) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 RESUMO PARA PAGAMENTO', 20, yPosition);

    yPosition += 10;

    const stats = this.calculateIndividualStats(appointments);
    const justifiedMissed = appointments.filter(a => a.status === 'missed' && a.justified_at).length;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const paymentData = [
      [`Total de Sessões Efetivamente Realizadas`, `${stats.completed}`],
      [`Período de Referência`, `${this.formatDate(config.period.startDate)} a ${this.formatDate(config.period.endDate)}`],
      [`Taxa de Efetivação`, `${stats.attendanceRate}%`],
      [`Observações`, `${justifiedMissed} falta(s) justificada(s)`]
    ];

    paymentData.forEach(([label, value]) => {
      doc.text(`├── ${label}: ${value}`, 25, yPosition);
      yPosition += 6;
    });

    return yPosition + 10;
  }

  /**
   * Adiciona footer do relatório seguindo padrão dos PDFs existentes
   */
  addReportFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);

      // Página atual
      const footerText = `Pagina ${i} de ${pageCount}`;
      doc.text(footerText, pageWidth / 2, pageHeight - margin / 2, { align: 'center' });

      // Data de geração
      doc.text(`Gerado em: ${this.formatDate(new Date().toISOString())}`, margin, pageHeight - margin / 2);

      doc.setTextColor(0);
    }
  }

  // Métodos auxiliares
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  formatStatus(status) {
    const statusMap = {
      'completed': 'Realizada',
      'missed': 'Falta',
      'cancelled': 'Cancelada',
      'scheduled': 'Agendada'
    };
    return statusMap[status] || status;
  }

  calculatePercentage(value, total) {
    if (!total || total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  }

  groupAppointmentsByTherapist(appointments) {
    const therapistMap = new Map();

    appointments.forEach(appointment => {
      const therapistId = appointment.therapist_id;
      const therapistName = appointment.therapist_name || 'Terapeuta Desconhecido';

      if (!therapistMap.has(therapistId)) {
        therapistMap.set(therapistId, {
          name: therapistName,
          scheduled: 0,
          completed: 0,
          missed: 0,
          cancelled: 0
        });
      }

      const stats = therapistMap.get(therapistId);
      stats.scheduled++;

      switch (appointment.status) {
        case 'completed':
          stats.completed++;
          break;
        case 'missed':
          stats.missed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    });

    return Array.from(therapistMap.values()).map(therapist => ({
      ...therapist,
      rate: this.calculatePercentage(therapist.completed, therapist.scheduled)
    }));
  }

  calculateTotals(therapistStats) {
    const totals = therapistStats.reduce(
      (acc, therapist) => ({
        scheduled: acc.scheduled + therapist.scheduled,
        completed: acc.completed + therapist.completed,
        missed: acc.missed + therapist.missed,
        cancelled: acc.cancelled + therapist.cancelled
      }),
      { scheduled: 0, completed: 0, missed: 0, cancelled: 0 }
    );

    return {
      ...totals,
      rate: this.calculatePercentage(totals.completed, totals.scheduled)
    };
  }

  calculateIndividualStats(appointments) {
    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const missed = appointments.filter(a => a.status === 'missed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;

    return {
      total,
      completed,
      missed,
      cancelled,
      completedRate: this.calculatePercentage(completed, total),
      missedRate: this.calculatePercentage(missed, total),
      cancelledRate: this.calculatePercentage(cancelled, total),
      attendanceRate: this.calculatePercentage(completed, total)
    };
  }

  calculateAdvancedStats(appointments) {
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const weeks = this.getWeeksInPeriod(appointments);

    return {
      avgPerWeek: (appointments.length / Math.max(weeks, 1)).toFixed(1),
      completedPerWeek: (completedAppointments.length / Math.max(weeks, 1)).toFixed(1),
      longestSuccessStreak: this.calculateSuccessStreak(appointments),
      lastMissed: this.getLastMissed(appointments),
      punctuality: this.calculatePercentage(completedAppointments.length, appointments.length)
    };
  }

  getWeeksInPeriod(appointments) {
    if (appointments.length === 0) return 1;

    const dates = appointments.map(a => new Date(a.scheduled_date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const timeDiff = maxDate.getTime() - minDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return Math.max(Math.ceil(daysDiff / 7), 1);
  }

  calculateSuccessStreak(appointments) {
    const sortedAppointments = appointments.sort((a, b) =>
      new Date(`${a.scheduled_date}T${a.scheduled_time}`) - new Date(`${b.scheduled_date}T${b.scheduled_time}`)
    );

    let maxStreak = 0;
    let currentStreak = 0;

    sortedAppointments.forEach(appointment => {
      if (appointment.status === 'completed') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return maxStreak;
  }

  getLastMissed(appointments) {
    const missedAppointments = appointments
      .filter(a => a.status === 'missed')
      .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));

    return missedAppointments.length > 0
      ? this.formatDate(missedAppointments[0].scheduled_date)
      : null;
  }
}

// Função utilitária para uso direto
export const generateAppointmentReport = async (config) => {
  const generator = new AppointmentReportGenerator();
  return await generator.generateReport(config);
};

export default AppointmentReportGenerator;