// frontend/src/components/scheduling/AppointmentReportGenerator.js

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getAppointments, getClinicStatistics } from '../../api/schedulingApi';


// Site oficial do ABAplay
const ABAPLAY_WEBSITE = 'www.abaplay.app.br';

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
      patient_id: config.scope.patientId || undefined, // ✅ NOVO: Filtro de paciente
      limit: 1000 // Buscar todos os registros do período
    };

    // Buscar agendamentos
    const appointmentsResponse = await getAppointments(filters);
    const appointments = appointmentsResponse.appointments || [];

    // Buscar estatísticas da clínica
    const statisticsResponse = await getClinicStatistics(
      config.period.startDate,
      config.period.endDate
    );

    // Mapear para o formato esperado pelo relatório
    const statistics = statisticsResponse.clinic_statistics ? {
      total_appointments: statisticsResponse.clinic_statistics.total_appointments || 0,
      completed_appointments: statisticsResponse.clinic_statistics.completed || 0,
      missed_appointments: statisticsResponse.clinic_statistics.missed || 0,
      cancelled_appointments: statisticsResponse.clinic_statistics.cancelled || 0,
      scheduled_appointments: statisticsResponse.clinic_statistics.scheduled || 0,
      attendance_rate: statisticsResponse.clinic_statistics.attendance_rate || 0,
      completion_rate: statisticsResponse.clinic_statistics.completion_rate || 0
    } : {
      total_appointments: 0,
      completed_appointments: 0,
      missed_appointments: 0,
      cancelled_appointments: 0,
      scheduled_appointments: 0,
      attendance_rate: 0,
      completion_rate: 0
    };


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
    yPosition = this.addExecutiveSummary(doc, statistics, appointments, yPosition);

    // Previsto vs Realizado
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addPredictedVsActual(doc, statistics, yPosition);

    // Performance por Terapeuta
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addTherapistPerformance(doc, appointments, yPosition);

    // Agenda Detalhada
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addDetailedSchedule(doc, appointments, yPosition);

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
    const margin = 15;

    // Encontrar nome do terapeuta
    const therapistName = appointments.length > 0 ?
      appointments[0].therapist_name : 'Terapeuta Não Encontrado';

    // Header do relatório
    let yPosition = this.addReportHeader(doc, `RELATÓRIO INDIVIDUAL - ${therapistName.toUpperCase()}`, config);

    // Função para verificar e adicionar nova página (mesmo padrão do relatório geral)
    const checkAndAddPage = (currentY, requiredHeight = 30) => {
      if (currentY > doc.internal.pageSize.getHeight() - margin - requiredHeight) {
        this.addReportFooter(doc);
        doc.addPage();
        return margin + 10;
      }
      return currentY;
    };

    // Performance Individual
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addIndividualPerformance(doc, appointments, yPosition);

    // ✅ NOVO: Sessões Realizadas com Notas
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addCompletedSessionsWithNotes(doc, appointments, yPosition);

    // ✅ NOVO: Cancelamentos Detalhados
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addCancellationsDetails(doc, appointments, yPosition);

    // ✅ NOVO: Faltas com Justificativas (2 tabelas)
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addMissedSessionsDetails(doc, appointments, yPosition);

    // Detalhamento Estatístico
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addStatisticalDetails(doc, appointments, yPosition);

    // Agenda Detalhada Individual
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addIndividualDetailedSchedule(doc, appointments, yPosition);

    // Resumo para Pagamento
    yPosition = checkAndAddPage(yPosition);
    yPosition = this.addPaymentSummary(doc, appointments, config, yPosition);

    // Footer
    this.addReportFooter(doc);

    // Download do PDF
    const fileName = `relatorio_individual_${therapistName.replace(/\s+/g, '_')}_${config.period.startDate}_${config.period.endDate}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  }

  /**
   * Adiciona header simples seguindo padrão dos relatórios existentes
   */
  addReportHeader(doc, title, config) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = margin + 10;

    // Título principal centralizado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Informações básicas
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${this.formatDate(config.period.startDate)} a ${this.formatDate(config.period.endDate)}`, margin, y);
    doc.text(`Gerado em: ${this.formatDate(new Date().toISOString())}`, pageWidth - margin, y, { align: 'right' });
    y += 6;

    const scopeText = config.scope.type === 'all' ?
      'Escopo: Todos os Terapeutas' :
      'Escopo: Terapeuta Individual';
    doc.text(scopeText, margin, y);
    y += 10;

    // Linha separadora simples
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);

    return y + 8;
  }

  /**
   * Adiciona resumo executivo seguindo padrão dos relatórios existentes
   */
  addExecutiveSummary(doc, statistics, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor azul
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 248, 255); // Azul muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(25, 118, 210); // Azul escuro no texto
    doc.text('RESUMO EXECUTIVO', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    // ✅ NOVO: Separar faltas justificadas vs não justificadas
    const missedJustified = appointments.filter(a => a.status === 'missed' && a.justified_at).length;
    const missedNotJustified = (statistics.missed_appointments || 0) - missedJustified;

    const summaryData = [
      ['Total de Agendamentos', `${statistics.total_appointments || 0}`],
      ['Sessões Realizadas', `${statistics.completed_appointments || 0} (${this.calculatePercentage(statistics.completed_appointments, statistics.total_appointments)}%)`],
      ['Faltas Não Justificadas', `${missedNotJustified} (${this.calculatePercentage(missedNotJustified, statistics.total_appointments)}%)`],
      ['Faltas Justificadas', `${missedJustified} (${this.calculatePercentage(missedJustified, statistics.total_appointments)}%)`],
      ['Cancelamentos', `${statistics.cancelled_appointments || 0} (${this.calculatePercentage(statistics.cancelled_appointments, statistics.total_appointments)}%)`],
      ['Taxa de Comparecimento', `${statistics.attendance_rate || 0}%`]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Indicador', 'Resultado']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [25, 118, 210], // Azul para resumo executivo
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: {
          cellWidth: 110,
          halign: 'left',
          fontStyle: 'normal',
          textColor: [70, 70, 70]
        },
        1: {
          cellWidth: 70,
          halign: 'center',
          fontStyle: 'bold',
          textColor: [25, 118, 210] // Azul nos números
        }
      },
      margin: { left: margin, right: margin }
    });

    // ✅ NOVO: Nota explicativa sobre taxa de comparecimento
    let finalY = doc.lastAutoTable.finalY + 5;
    const totalNonCancelled = statistics.total_appointments - (statistics.cancelled_appointments || 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('* Taxa de Comparecimento calculada sobre agendamentos não cancelados', margin, finalY);
    doc.text(`  (${statistics.completed_appointments || 0} realizadas ÷ ${totalNonCancelled} não canceladas = ${statistics.attendance_rate || 0}%)`, margin, finalY + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    return finalY + 20;
  }

  /**
   * Adiciona seção de análise de efetividade seguindo padrão simples
   */
  addPredictedVsActual(doc, statistics, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor laranja
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(255, 247, 237); // Laranja muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(234, 88, 12); // Laranja escuro no texto
    doc.text('ANÁLISE DE EFETIVIDADE', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    // Para "previsto vs realizado", consideramos apenas agendamentos que já deveriam ter acontecido
    const totalPrevisto = (statistics.completed_appointments || 0) + (statistics.missed_appointments || 0);
    const completed = statistics.completed_appointments || 0;
    const missed = statistics.missed_appointments || 0;
    const effectiveRate = this.calculatePercentage(completed, totalPrevisto);

    const predictedData = [
      ['Sessões Programadas (Passadas)', `${totalPrevisto}`],
      ['Sessões Efetivamente Realizadas', `${completed}`],
      ['Ausências Registradas', `${missed}`],
      ['Taxa de Efetividade Geral', `${effectiveRate}%`]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Métrica', 'Resultado']],
      body: predictedData,
      theme: 'grid',
      headStyles: {
        fillColor: [234, 88, 12], // Laranja para efetividade
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: {
          cellWidth: 110,
          halign: 'left',
          fontStyle: 'normal',
          textColor: [70, 70, 70]
        },
        1: {
          cellWidth: 70,
          halign: 'center',
          fontStyle: 'bold',
          textColor: [234, 88, 12] // Laranja nos números
        }
      },
      margin: { left: margin, right: margin }
    });

    return doc.lastAutoTable.finalY + 20;
  }

  /**
   * Adiciona tabela de performance por terapeuta (seguindo padrão dos PDFs existentes)
   */
  addTherapistPerformance(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor verde
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 253, 244); // Verde muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(21, 128, 61); // Verde escuro no texto
    doc.text('PERFORMANCE POR TERAPEUTA', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    // Agrupar dados por terapeuta
    const therapistStats = this.groupAppointmentsByTherapist(appointments);

    if (therapistStats.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhum dado de performance encontrado para o período selecionado.', margin, yPosition + 10);
      return yPosition + 30;
    }

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
        fillColor: [21, 128, 61], // Verde para performance
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 90, halign: 'left', textColor: [70, 70, 70] },
        1: { cellWidth: 22, halign: 'center', textColor: [21, 128, 61] }, // Verde nos agendados
        2: { cellWidth: 22, halign: 'center', textColor: [21, 128, 61], fontStyle: 'bold' }, // Verde bold nos realizados
        3: { cellWidth: 22, halign: 'center', textColor: [185, 28, 28] }, // Vermelho nas faltas
        4: { cellWidth: 24, halign: 'center', textColor: [21, 128, 61], fontStyle: 'bold' } // Verde bold na taxa
      },
      margin: { left: margin, right: margin }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  /**
   * Adiciona agenda detalhada (seguindo padrão dos PDFs existentes)
   */
  addDetailedSchedule(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor roxa
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(250, 245, 255); // Roxo muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(124, 58, 237); // Roxo escuro no texto
    doc.text('AGENDA DETALHADA', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    // Ordenar agendamentos por data e hora
    const sortedAppointments = appointments.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA - dateB;
    });

    const tableData = sortedAppointments.slice(0, 50).map(appointment => [
      this.formatDate(appointment.scheduled_date),
      appointment.scheduled_time || '',
      appointment.patient_name || 'N/A',
      appointment.therapist_name || 'N/A',
      this.formatStatus(appointment.status, appointment.justified_at)
    ]);

    doc.autoTable({
      head: [['Data', 'Hora', 'Paciente', 'Terapeuta', 'Status']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [124, 58, 237], // Roxo para agenda
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 56, halign: 'left' },
        3: { cellWidth: 56, halign: 'left' },
        4: { cellWidth: 26, halign: 'center' }
      },
      didParseCell: function(data) {
        // Aplicar cores na coluna Status (índice 4)
        if (data.column.index === 4 && data.section === 'body') {
          const status = data.cell.raw;
          switch (status) {
            case 'Realizada':
              data.cell.styles.fillColor = [220, 252, 231]; // Verde claro
              data.cell.styles.textColor = [21, 128, 61]; // Verde escuro
              data.cell.styles.fontStyle = 'bold';
              break;
            case 'Falta / Just.':
              // ✅ NOVO: Faltas justificadas em azul (normal, não urgente)
              data.cell.styles.fillColor = [219, 234, 254]; // Azul claro
              data.cell.styles.textColor = [30, 64, 175]; // Azul escuro
              data.cell.styles.fontStyle = 'normal';
              break;
            case 'Falta':
              // ❌ Faltas não justificadas em vermelho (urgente)
              data.cell.styles.fillColor = [254, 226, 226]; // Vermelho claro
              data.cell.styles.textColor = [185, 28, 28]; // Vermelho escuro
              data.cell.styles.fontStyle = 'bold';
              break;
            case 'Cancelada':
              data.cell.styles.fillColor = [249, 250, 251]; // Cinza claro
              data.cell.styles.textColor = [107, 114, 128]; // Cinza escuro
              break;
            case 'Agendada':
              data.cell.styles.fillColor = [239, 246, 255]; // Azul claro
              data.cell.styles.textColor = [29, 78, 216]; // Azul escuro
              break;
            default:
              // Manter estilo padrão
              break;
          }
        }
      },
      margin: { left: margin, right: margin }
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    if (sortedAppointments.length > 50) {
      doc.setFontSize(8);
      doc.text(`Nota: Mostrando apenas os primeiros 50 registros de ${sortedAppointments.length} total.`, margin, finalY);
      finalY += 8;
    }

    return finalY;
  }

  /**
   * Adiciona performance individual
   */
  addIndividualPerformance(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor azul (mesmo padrão do resumo executivo)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 248, 255); // Azul muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(25, 118, 210); // Azul escuro no texto
    doc.text('RESUMO EXECUTIVO', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    const stats = this.calculateIndividualStats(appointments);

    // ✅ NOVO: Separar faltas justificadas vs não justificadas
    const missedJustified = appointments.filter(a => a.status === 'missed' && a.justified_at).length;
    const missedNotJustified = stats.missed - missedJustified;

    // ✅ NOVO: Calcular horas trabalhadas
    const completedSessions = appointments.filter(a => a.status === 'completed');
    const totalMinutes = completedSessions.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
    const hoursWorked = Math.floor(totalMinutes / 60);
    const minutesRemaining = totalMinutes % 60;
    const hoursDisplay = hoursWorked > 0
      ? `${hoursWorked}h ${minutesRemaining}m`
      : `${minutesRemaining}min`;

    const performanceData = [
      ['Total de Agendamentos', `${stats.total}`],
      ['Sessões Realizadas', `${stats.completed} (${stats.completedRate}%)`],
      ['Horas Trabalhadas', `${hoursDisplay}`],
      ['Faltas Sem Justificativa', `${missedNotJustified} (${this.calculatePercentage(missedNotJustified, stats.total)}%)`],
      ['Faltas Justificadas', `${missedJustified} (${this.calculatePercentage(missedJustified, stats.total)}%)`],
      ['Cancelamentos', `${stats.cancelled} (${stats.cancelledRate}%)`],
      ['Taxa de Comparecimento', `${stats.attendanceRate}%`]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Indicador', 'Resultado']],
      body: performanceData,
      theme: 'grid',
      headStyles: {
        fillColor: [25, 118, 210], // Azul para performance individual
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: {
          cellWidth: 110,
          halign: 'left',
          fontStyle: 'normal',
          textColor: [70, 70, 70]
        },
        1: {
          cellWidth: 70,
          halign: 'center',
          fontStyle: 'bold',
          textColor: [25, 118, 210] // Azul nos números
        }
      },
      margin: { left: margin, right: margin }
    });

    // ✅ NOVO: Nota explicativa sobre taxa de comparecimento
    let finalY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('* Taxa de Comparecimento calculada sobre agendamentos não cancelados', margin, finalY);
    doc.text(`  (${stats.completed} realizadas ÷ ${stats.total - stats.cancelled} não canceladas = ${stats.attendanceRate}%)`, margin, finalY + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    return finalY + 15;
  }

  /**
   * ✅ NOVO: Adiciona seção de sessões realizadas com notas
   */
  addCompletedSessionsWithNotes(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Filtrar apenas sessões completadas
    const completedSessions = appointments.filter(a => a.status === 'completed');

    if (completedSessions.length === 0) {
      return yPosition; // Pula esta seção se não houver sessões completadas
    }

    // Título da seção com cor verde
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 253, 244); // Verde muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(21, 128, 61); // Verde escuro no texto
    doc.text('SESSÕES REALIZADAS', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    // Ordenar por data
    const sortedSessions = completedSessions.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA - dateB;
    });

    // Preparar dados da tabela
    const tableData = sortedSessions.map(session => {
      const notes = session.notes && session.notes.trim() !== ''
        ? this.truncateText(session.notes, 50)
        : '(Sem anotações)';

      return [
        this.formatDate(session.scheduled_date),
        session.scheduled_time.substring(0, 5),
        session.patient_name || 'N/A',
        `${session.duration_minutes || 60}m`,
        notes
      ];
    });

    doc.autoTable({
      head: [['Data', 'Hora', 'Paciente', 'Dur.', 'Anotação']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [21, 128, 61], // Verde para sessões realizadas
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },  // Data
        1: { cellWidth: 16, halign: 'center' },  // Hora
        2: { cellWidth: 45, halign: 'left' },    // Paciente
        3: { cellWidth: 15, halign: 'center' },  // Duração
        4: { cellWidth: 82, halign: 'left', fontStyle: 'italic', textColor: [70, 70, 70] }  // Anotação
      },
      didParseCell: function(data) {
        // Estilizar células de "Sem anotações" em cinza
        if (data.column.index === 4 && data.section === 'body') {
          if (data.cell.raw === '(Sem anotações)') {
            data.cell.styles.textColor = [150, 150, 150];
            data.cell.styles.fontStyle = 'italic';
          }
        }
      },
      margin: { left: margin, right: margin }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  /**
   * ✅ NOVO: Adiciona seção de cancelamentos detalhados
   */
  addCancellationsDetails(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Filtrar apenas cancelamentos
    const cancelledSessions = appointments.filter(a => a.status === 'cancelled');

    if (cancelledSessions.length === 0) {
      return yPosition; // Pula esta seção se não houver cancelamentos
    }

    // Título da seção com cor cinza
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(249, 250, 251); // Cinza muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(107, 114, 128); // Cinza escuro no texto
    doc.text('CANCELAMENTOS DETALHADOS', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    // Ordenar por data
    const sortedCancellations = cancelledSessions.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA - dateB;
    });

    // Preparar dados da tabela
    const tableData = sortedCancellations.map(session => {
      const reasonType = this.formatCancellationReason(session.cancellation_reason_type);
      const cancelledBy = session.cancelled_by_name || 'N/A';
      const cancelledDate = session.cancelled_at
        ? this.formatDate(session.cancelled_at)
        : 'N/A';

      // Combinar tipo + descrição se houver
      let fullReason = reasonType;
      if (session.cancellation_reason_description && session.cancellation_reason_description.trim() !== '') {
        fullReason += ': ' + this.truncateText(session.cancellation_reason_description, 30);
      }

      return [
        this.formatDate(session.scheduled_date),
        session.scheduled_time.substring(0, 5),
        session.patient_name || 'N/A',
        fullReason,
        cancelledBy,
        cancelledDate
      ];
    });

    doc.autoTable({
      head: [['Data', 'Hora', 'Paciente', 'Motivo', 'Cancelado por', 'Data Canc.']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [107, 114, 128], // Cinza para cancelamentos
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },  // Data
        1: { cellWidth: 16, halign: 'center' },  // Hora
        2: { cellWidth: 40, halign: 'left' },    // Paciente
        3: { cellWidth: 52, halign: 'left', textColor: [70, 70, 70] },  // Motivo
        4: { cellWidth: 30, halign: 'left', fontSize: 7 },  // Cancelado por
        5: { cellWidth: 20, halign: 'center', fontSize: 7 }  // Data Cancelamento
      },
      margin: { left: margin, right: margin }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  /**
   * ✅ NOVO: Adiciona seção de faltas com justificativas (2 tabelas separadas)
   */
  addMissedSessionsDetails(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Filtrar faltas
    const missedSessions = appointments.filter(a => a.status === 'missed');

    if (missedSessions.length === 0) {
      return yPosition; // Pula se não houver faltas
    }

    // Separar em justificadas e não justificadas
    const justifiedMissed = missedSessions.filter(a => a.justified_at);
    const notJustifiedMissed = missedSessions.filter(a => !a.justified_at);

    // ===== TABELA 1: FALTAS JUSTIFICADAS (AZUL) =====
    if (justifiedMissed.length > 0) {
      // Título da seção com cor azul claro
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(219, 234, 254); // Azul claro
      doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
      doc.setTextColor(30, 64, 175); // Azul escuro no texto
      doc.text('FALTAS JUSTIFICADAS', margin + 2, yPosition);
      doc.setTextColor(0, 0, 0); // Reset para preto

      yPosition += 12;

      // Ordenar por data
      const sortedJustified = justifiedMissed.sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
        return dateA - dateB;
      });

      // Preparar dados da tabela
      const tableDataJustified = sortedJustified.map(session => {
        const reasonType = this.formatMissedReason(session.missed_reason_type);
        const justifiedBy = session.justified_by_name || 'N/A';
        const justifiedDate = session.justified_at
          ? this.formatDate(session.justified_at)
          : 'N/A';

        // Combinar tipo + descrição se houver
        let fullReason = reasonType;
        if (session.missed_reason_description && session.missed_reason_description.trim() !== '') {
          fullReason += ': ' + this.truncateText(session.missed_reason_description, 25);
        }

        return [
          this.formatDate(session.scheduled_date),
          session.scheduled_time.substring(0, 5),
          session.patient_name || 'N/A',
          fullReason,
          justifiedBy,
          justifiedDate
        ];
      });

      doc.autoTable({
        head: [['Data', 'Hora', 'Paciente', 'Motivo', 'Justif. por', 'Data Just.']],
        body: tableDataJustified,
        startY: yPosition,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 64, 175], // Azul para justificadas
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [60, 60, 60],
          lineColor: [200, 200, 200],
          lineWidth: 0.5
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },  // Data
          1: { cellWidth: 16, halign: 'center' },  // Hora
          2: { cellWidth: 40, halign: 'left' },    // Paciente
          3: { cellWidth: 50, halign: 'left', textColor: [70, 70, 70] },  // Motivo
          4: { cellWidth: 28, halign: 'left', fontSize: 7 },  // Justificado por
          5: { cellWidth: 24, halign: 'center', fontSize: 7 }  // Data Justificativa
        },
        margin: { left: margin, right: margin }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // ===== TABELA 2: FALTAS SEM JUSTIFICATIVA (VERMELHO - ALERTA) =====
    if (notJustifiedMissed.length > 0) {
      // Verificar se precisa de nova página
      if (yPosition > doc.internal.pageSize.getHeight() - margin - 50) {
        this.addReportFooter(doc);
        doc.addPage();
        yPosition = margin + 10;
      }

      // Título da seção com cor vermelha (alerta)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(254, 226, 226); // Vermelho claro
      doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
      doc.setTextColor(185, 28, 28); // Vermelho escuro no texto
      doc.text('FALTAS SEM JUSTIFICATIVA', margin + 2, yPosition);
      doc.setTextColor(0, 0, 0); // Reset para preto

      yPosition += 12;

      // Ordenar por data
      const sortedNotJustified = notJustifiedMissed.sort((a, b) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
        return dateA - dateB;
      });

      // Preparar dados da tabela
      const tableDataNotJustified = sortedNotJustified.map(session => {
        return [
          this.formatDate(session.scheduled_date),
          session.scheduled_time.substring(0, 5),
          session.patient_name || 'N/A',
          'PENDENTE JUSTIFICATIVA'
        ];
      });

      doc.autoTable({
        head: [['Data', 'Hora', 'Paciente', 'Status']],
        body: tableDataNotJustified,
        startY: yPosition,
        theme: 'grid',
        headStyles: {
          fillColor: [185, 28, 28], // Vermelho para não justificadas
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [60, 60, 60],
          lineColor: [200, 200, 200],
          lineWidth: 0.5
        },
        columnStyles: {
          0: { cellWidth: 24, halign: 'center' },  // Data
          1: { cellWidth: 18, halign: 'center' },  // Hora
          2: { cellWidth: 65, halign: 'left' },    // Paciente
          3: {
            cellWidth: 73,  // ✅ Ajustado para "PENDENTE JUSTIFICATIVA" (sem emoji)
            halign: 'center',
            fontStyle: 'bold',
            fontSize: 9,  // ✅ Fonte um pouco maior agora que removemos o emoji
            textColor: [185, 28, 28],  // Vermelho no status
            fillColor: [254, 226, 226]  // Fundo vermelho claro
          }
        },
        margin: { left: margin, right: margin }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    return yPosition;
  }

  /**
   * Adiciona detalhamento estatístico
   */
  addStatisticalDetails(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor verde (mesmo padrão da performance por terapeuta)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 253, 244); // Verde muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(21, 128, 61); // Verde escuro no texto
    doc.text('DETALHAMENTO ESTATÍSTICO', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    const stats = this.calculateAdvancedStats(appointments);

    const statisticalData = [
      ['Agendamentos por Semana', `${stats.avgPerWeek} (média)`],
      ['Sessões Realizadas por Semana', `${stats.completedPerWeek} (média)`],
      ['Maior Sequência de Sucessos', `${stats.longestSuccessStreak} sessões`],
      ['Última Falta Registrada', stats.lastMissed || 'Nenhuma falta no período'],
      ['Pontualidade Geral', `${stats.punctuality}%`]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Indicador Avançado', 'Valor']],
      body: statisticalData,
      theme: 'grid',
      headStyles: {
        fillColor: [21, 128, 61], // Verde para estatísticas avançadas
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: {
          cellWidth: 110,
          halign: 'left',
          fontStyle: 'normal',
          textColor: [70, 70, 70]
        },
        1: {
          cellWidth: 70,
          halign: 'center',
          fontStyle: 'bold',
          textColor: [21, 128, 61] // Verde nos números
        }
      },
      margin: { left: margin, right: margin }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  /**
   * ✅ MELHORADO: Adiciona agenda detalhada individual com coluna de observações
   */
  addIndividualDetailedSchedule(doc, appointments, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor roxa (mesmo padrão da agenda detalhada geral)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(250, 245, 255); // Roxo muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(124, 58, 237); // Roxo escuro no texto
    doc.text('AGENDA DETALHADA - TERAPEUTA', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    const sortedAppointments = appointments.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA - dateB;
    });

    // ✅ NOVO: Preparar dados com coluna de observações
    const tableData = sortedAppointments.map(appointment => {
      let observations = [];

      // Adicionar "COM NOTA" se houver anotação
      if (appointment.notes && appointment.notes.trim() !== '') {
        observations.push('COM NOTA');
      }

      // Adicionar "JUSTIFICADA" se falta justificada
      if (appointment.status === 'missed' && appointment.justified_at) {
        observations.push('JUSTIFICADA');
      }

      // Adicionar motivo de cancelamento se houver
      if (appointment.status === 'cancelled' && appointment.cancellation_reason_type) {
        const reason = this.formatCancellationReason(appointment.cancellation_reason_type);
        observations.push(`Canc: ${reason}`);
      }

      const observationsText = observations.length > 0 ? observations.join(' | ') : '-';

      return [
        this.formatDate(appointment.scheduled_date),
        appointment.scheduled_time.substring(0, 5),
        appointment.patient_name || 'N/A',
        appointment.discipline_name || 'Geral',
        this.formatStatus(appointment.status, appointment.justified_at),
        observationsText
      ];
    });

    doc.autoTable({
      head: [['Data', 'Hora', 'Paciente', 'Disciplina', 'Status', 'Observações']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      headStyles: {
        fillColor: [124, 58, 237], // Roxo para agenda detalhada (mesmo padrão)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },  // Data
        1: { cellWidth: 16, halign: 'center' },  // Hora
        2: { cellWidth: 38, halign: 'left' },    // Paciente
        3: { cellWidth: 32, halign: 'left' },    // Disciplina
        4: { cellWidth: 26, halign: 'center' },  // Status
        5: { cellWidth: 46, halign: 'left', fontSize: 7, textColor: [90, 90, 90] }  // Observações (menor, cinza)
      },
      didParseCell: function(data) {
        // Destacar "COM NOTA" e "JUSTIFICADA" na coluna de observações
        if (data.column.index === 5 && data.section === 'body') {
          if (data.cell.raw.includes('COM NOTA')) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [21, 128, 61]; // Verde
          }
          if (data.cell.raw.includes('JUSTIFICADA')) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [30, 64, 175]; // Azul
          }
        }
      },
      margin: { left: margin, right: margin }
    });

    return doc.lastAutoTable.finalY + 15;
  }

  /**
   * Adiciona resumo para pagamento
   */
  addPaymentSummary(doc, appointments, config, yPosition) {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título da seção com cor laranja (para destacar seção de pagamento)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(255, 247, 237); // Laranja muito claro
    doc.rect(margin, yPosition - 4, pageWidth - (margin * 2), 7, 'F');
    doc.setTextColor(194, 65, 12); // Laranja escuro no texto
    doc.text('RESUMO PARA PAGAMENTO', margin + 2, yPosition);
    doc.setTextColor(0, 0, 0); // Reset para preto

    yPosition += 12;

    const stats = this.calculateIndividualStats(appointments);
    const justifiedMissed = appointments.filter(a => a.status === 'missed' && a.justified_at).length;

    const paymentData = [
      ['Total de Sessões Efetivamente Realizadas', `${stats.completed}`],
      ['Período de Referência', `${this.formatDate(config.period.startDate)} a ${this.formatDate(config.period.endDate)}`],
      ['Taxa de Efetivação', `${stats.attendanceRate}%`],
      ['Observações', `${justifiedMissed} falta(s) justificada(s)`]
    ];

    doc.autoTable({
      startY: yPosition,
      head: [['Item', 'Valor']],
      body: paymentData,
      theme: 'grid',
      headStyles: {
        fillColor: [194, 65, 12], // Laranja para resumo de pagamento
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60],
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: {
          cellWidth: 110,
          halign: 'left',
          fontStyle: 'normal',
          textColor: [70, 70, 70]
        },
        1: {
          cellWidth: 70,
          halign: 'center',
          fontStyle: 'bold',
          textColor: [194, 65, 12] // Laranja nos números
        }
      },
      margin: { left: margin, right: margin }
    });

    return doc.lastAutoTable.finalY + 15;
  }


  /**
   * Adiciona footer com branding ABAplay seguindo padrão dos relatórios existentes
   */
  addReportFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const footerY = pageHeight - margin / 2;

      doc.setFontSize(8);
      doc.setTextColor(100);

      // Esquerda: Data de geração
      doc.text(`Gerado em: ${this.formatDate(new Date().toISOString())}`, margin, footerY);

      // Centro: Página atual
      const footerText = `Página ${i} de ${pageCount}`;
      doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

      // Direita: Site
      doc.text(ABAPLAY_WEBSITE, pageWidth - margin, footerY, { align: 'right' });

      doc.setTextColor(0);
    }
  }

  // Métodos auxiliares
  truncateText(text, maxLength) {
    if (!text || text.trim() === '') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  }

  formatStatus(status, justifiedAt = null) {
    const statusMap = {
      'completed': 'Realizada',
      'missed': justifiedAt ? 'Falta / Just.' : 'Falta',
      'cancelled': 'Cancelada',
      'scheduled': 'Agendada'
    };
    return statusMap[status] || status;
  }

  formatCancellationReason(reasonType) {
    const reasonMap = {
      'patient_illness': 'Paciente doente',
      'patient_travel': 'Viagem do paciente',
      'patient_no_show': 'Paciente não compareceu',
      'patient_family_emergency': 'Emergência familiar',
      'therapist_illness': 'Terapeuta doente',
      'therapist_emergency': 'Emergência do terapeuta',
      'therapist_training': 'Treinamento',
      'clinic_closure': 'Clínica fechada',
      'equipment_failure': 'Falha de equipamento',
      'scheduling_error': 'Erro de agendamento',
      'other': 'Outro motivo'
    };
    return reasonMap[reasonType] || reasonType || 'Não informado';
  }

  formatMissedReason(reasonType) {
    const reasonMap = {
      'patient_illness': 'Paciente doente',
      'patient_travel': 'Viagem',
      'patient_no_show': 'Não compareceu',
      'patient_family_emergency': 'Emergência familiar',
      'therapist_illness': 'Terapeuta doente',
      'therapist_emergency': 'Emergência',
      'therapist_training': 'Treinamento',
      'clinic_closure': 'Clínica fechada',
      'equipment_failure': 'Falha equipamento',
      'scheduling_error': 'Erro agendamento',
      'other': 'Outro'
    };
    return reasonMap[reasonType] || reasonType || 'Não informado';
  }

  calculatePercentage(value, total) {
    if (!total || total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  }

  groupAppointmentsByTherapist(appointments) {
    if (!appointments || appointments.length === 0) {
      return [];
    }

    const therapistMap = new Map();

    appointments.forEach(appointment => {
      const therapistId = appointment.therapist_id;
      const therapistName = appointment.therapist_name || 'Terapeuta Desconhecido';

      if (!therapistId) return; // Skip appointments without therapist ID

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
        default:
          // Status desconhecido - mantém apenas como scheduled
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

    // ✅ CORREÇÃO: Taxa de comparecimento exclui cancelamentos do denominador
    // Fórmula: completed / (total - cancelled)
    const totalNonCancelled = total - cancelled;

    return {
      total,
      completed,
      missed,
      cancelled,
      completedRate: this.calculatePercentage(completed, total),
      missedRate: this.calculatePercentage(missed, total),
      cancelledRate: this.calculatePercentage(cancelled, total),
      attendanceRate: this.calculatePercentage(completed, totalNonCancelled)
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