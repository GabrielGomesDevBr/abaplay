import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { getLegendLevels } from './promptLevelColors';

// Função auxiliar para formatar a data
const formatDate = (dateString, format = 'long') => {
  if (!dateString) return 'Não informado';
  try {
    const date = new Date(dateString);
    // Ajusta para o fuso horário local para evitar problemas de "um dia a menos"
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    
    if (format === 'short') {
        return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    
    return adjustedDate.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return dateString.split('T')[0] || 'Data inválida';
  }
};

/**
 * Gera um PDF da Grade de Programas de um paciente, organizado por ESPECIALIDADE.
 * Esta versão busca os dados diretamente da API usando o novo endpoint.
 * @param {object} patient - O objeto do paciente selecionado.
 */
export const generateProgramGradePDF = async (patient) => {
    if (!patient) {
        alert("Nenhum cliente selecionado.");
        return;
    }
    
    try {
        // Importa a função da API dinamicamente para evitar circular imports
        const { getPatientProgramsGrade } = await import('../api/programApi');
        
        // Busca os programas organizados para a grade
        const programsByArea = await getPatientProgramsGrade(patient.id);

        if (Object.keys(programsByArea).length === 0) {
            alert("Nenhum programa ativo para gerar a Grade.");
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - margin * 2;
        let y = margin + 10;
        let pageCount = 1;

        const addFooter = (currentPage) => {
            doc.setFontSize(8);
            doc.setTextColor(100);
            const footerText = `Página ${currentPage}`;
            doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - margin / 2, { align: 'center' });
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, doc.internal.pageSize.getHeight() - margin / 2);
            doc.setTextColor(0);
        };

        const checkAndAddPage = (currentY, requiredHeight = 20) => {
            if (currentY > doc.internal.pageSize.getHeight() - margin - requiredHeight) {
                addFooter(pageCount);
                doc.addPage();
                pageCount++;
                return margin + 10;
            }
            return currentY;
        };
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Grade de Programas Ativos - ${patient.name}`, pageWidth / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`ID: ${patient.id}`, margin, y);
        doc.text(`Nasc: ${formatDate(patient.dob)}`, pageWidth - margin, y, { align: 'right' });
        y += 6;
        doc.text(`Diagnóstico: ${patient.diagnosis || 'Não informado'}`, margin, y);
        y += 10;
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        const sortedAreas = Object.keys(programsByArea).sort();

        for (const area of sortedAreas) {
            y = checkAndAddPage(y, 15);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 4, contentWidth, 7, 'F');
            doc.text(area, margin + 2, y);
            y += 8;

            for (const program of programsByArea[area]) {
                y = checkAndAddPage(y);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`• ${program.title} (Tag: ${program.tag || 'N/A'})`, margin + 4, y);
                y += 5;

                y = checkAndAddPage(y);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                let objectiveLines = doc.splitTextToSize(`Objetivo: ${program.objective || 'Não definido'}`, contentWidth - 8);
                doc.text(objectiveLines, margin + 8, y);
                y += objectiveLines.length * 4 + 2;

                if (program.criteria_for_advancement) {
                    y = checkAndAddPage(y);
                    doc.setFont('helvetica', 'italic');
                    let criteriaLines = doc.splitTextToSize(`Critério de Avanço: ${program.criteria_for_advancement}`, contentWidth - 8);
                    doc.text(criteriaLines, margin + 8, y);
                    y += criteriaLines.length * 4 + 2;
                    doc.setFont('helvetica', 'normal');
                }
                y += 5;
            }
        }
        addFooter(pageCount);
        const filename = `Grade_Programas_Ativos_${patient.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        doc.save(filename);
    } catch (error) {
        console.error('Erro ao gerar PDF da grade de programas:', error);
        alert('Erro ao gerar o PDF da grade de programas. Tente novamente.');
    }
};

export const generateWeeklyRecordSheetPDF = async (patient) => {
    if (!patient) {
        alert("Nenhum cliente selecionado.");
        return;
    }

    try {
        // Importa a função da API dinamicamente para usar os mesmos dados da grade
        const { getPatientProgramsGrade } = await import('../api/programApi');
        
        // Busca os programas organizados da mesma forma que a grade
        const programsByArea = await getPatientProgramsGrade(patient.id);

        if (Object.keys(programsByArea).length === 0) {
            alert("Nenhum programa ativo para gerar a Folha de Registro.");
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();
        let finalY = margin;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Folha de Registro Semanal - ${patient.name}`, pageWidth / 2, finalY + 5, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`ID: ${patient.id}`, margin, finalY + 12);
        doc.text(`Semana de: ______ / ______ / ________`, pageWidth - margin, finalY + 12, { align: 'right' });
        finalY += 20;

        const sortedAreas = Object.keys(programsByArea).sort();
        
        const body = [];
        sortedAreas.forEach(area => {
            if (programsByArea[area].length > 0) {
                // Usa o nome da área completo (ex: "Fonoaudiologia - Articulação/Fonologia")
                body.push([{ 
                    content: area, 
                    colSpan: 8, 
                    styles: { 
                        fontStyle: 'bold', 
                        fillColor: [230, 230, 230], 
                        textColor: [0,0,0], 
                        halign: 'left' 
                    } 
                }]);
                
                programsByArea[area].forEach(program => {
                    const effectiveTrials = program.trials || 'N/A';
                    const trialsText = `(${effectiveTrials} tentativas)`;
                    const customText = program.custom_trials !== null && program.custom_trials !== undefined ? ' *' : '';
                    const programCell = `${program.title}\n${trialsText}${customText}`;
                    body.push([programCell, '', '', '', '', '', '', '']);
                });
            }
        });

        autoTable(doc, {
            startY: finalY,
            head: [['Programa', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']],
            body: body,
            theme: 'grid',
            headStyles: { 
                fillColor: [79, 70, 229], 
                textColor: [255, 255, 255], 
                fontStyle: 'bold', 
                halign: 'center' 
            },
            columnStyles: { 
                0: { cellWidth: 80, fontStyle: 'bold' }, 
                1: { cellWidth: 'auto', halign: 'center' }, 
                2: { cellWidth: 'auto', halign: 'center' }, 
                3: { cellWidth: 'auto', halign: 'center' }, 
                4: { cellWidth: 'auto', halign: 'center' }, 
                5: { cellWidth: 'auto', halign: 'center' }, 
                6: { cellWidth: 'auto', halign: 'center' }, 
                7: { cellWidth: 'auto', halign: 'center' }
            },
            didParseCell: function(data) {
                if (data.cell.raw.colSpan === 8) { 
                    data.cell.styles.fontSize = 9; 
                    data.cell.styles.cellPadding = 2; 
                } else { 
                    data.cell.styles.fontSize = 8; 
                    data.cell.styles.valign = 'middle'; 
                }
            }
        });

        const filename = `Folha_Registro_${patient.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        doc.save(filename);
    } catch (error) {
        console.error('Erro ao gerar Folha de Registro:', error);
        alert('Erro ao gerar a Folha de Registro. Tente novamente.');
    }
};

export const generateConsolidatedReportPDF = async (patient, reportText, professionalData = null) => {
     if (!patient) {
        alert("Nenhum cliente selecionado.");
        return;
    }

    try {
        let programsByArea = {};
        
        // Se o paciente já tem sessionData (vem do modal), usa diretamente
        if (patient.sessionData && patient.sessionData.length > 0 && patient.assigned_programs) {
            console.log('PDF: Usando dados completos do paciente:', patient.assigned_programs.length, 'programas');
            
            // Usa os programas atribuídos que já têm todas as informações corretas
            const programsWithSessions = patient.assigned_programs.filter(program => {
                // Verifica se este programa tem sessões no período
                const hasSessions = patient.sessionData.some(session => 
                    session.program_id === program.program_id || session.program_id === program.id
                );
                return hasSessions;
            });
            
            // Organiza por área usando os dados completos dos programas
            programsWithSessions.forEach(program => {
                const areaKey = program.discipline_name || program.area_name || 'Área não especificada';
                if (!programsByArea[areaKey]) {
                    programsByArea[areaKey] = [];
                }
                programsByArea[areaKey].push({
                    ...program,
                    area: areaKey,
                    title: program.program_name || program.title || `Programa ${program.program_id || program.id}`
                });
            });
        } else {
            // Fallback: busca dados via API se não há sessionData
            console.log('PDF: Buscando dados via API - sem sessionData disponível');
            const { getPatientProgramsGrade } = await import('../api/programApi');
            programsByArea = await getPatientProgramsGrade(patient.id);
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - margin * 2;
        let y = margin + 10;
        let pageCount = 1;

        const addFooter = (currentPage) => {
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Página ${currentPage}`, pageWidth / 2, doc.internal.pageSize.getHeight() - margin / 2, { align: 'center' });
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, doc.internal.pageSize.getHeight() - margin / 2);
            doc.setTextColor(0);
        };

        // Controle melhorado de quebra de página (consistente com relatório de evolução)
        const checkAndAddPage = (currentY, requiredHeight = 20, forceNewPage = false, preserveFormatting = true) => {
            if (forceNewPage || currentY > doc.internal.pageSize.getHeight() - margin - requiredHeight) {
                // Capturar configurações atuais de fonte ANTES de quebrar a página
                const currentFontSize = doc.internal.getFontSize();
                const currentFont = doc.internal.getFont();
                const currentTextColor = doc.internal.getTextColor();
                
                addFooter(pageCount);
                doc.addPage();
                pageCount++;
                
                // Restaurar configurações de fonte se solicitado
                if (preserveFormatting) {
                    doc.setFontSize(currentFontSize);
                    doc.setFont(currentFont.fontName, currentFont.fontStyle);
                    doc.setTextColor(currentTextColor);
                }
                
                return margin + 10;
            }
            return currentY;
        };

        // Função addTextBlock para quebra automática de linha (consistente com relatório de evolução)
        const addTextBlock = (text, x, startY, maxWidth, lineHeight = 5) => {
            if (!text) return startY;
            const lines = doc.splitTextToSize(text, maxWidth);
            let currentY = startY;

            for (let i = 0; i < lines.length; i++) {
                currentY = checkAndAddPage(currentY, lineHeight + 5, false, true);
                doc.text(lines[i], x, currentY);
                currentY += lineHeight;
            }

            return currentY;
        };

        // Função para processar markdown e aplicar formatação consistente com relatório de evolução
        const processMarkdownText = (text, x, startY, maxWidth, lineHeight = 5) => {
            if (!text) return startY;
            
            let currentY = startY;
            const lines = text.split('\n');
            
            for (const line of lines) {
                if (line.trim() === '') {
                    currentY += lineHeight * 0.7;
                    continue;
                }
                
                // Processar listas com bullets (consistente com relatório de evolução)
                if (line.trim().startsWith('• ')) {
                    const listText = line.trim().substring(2);
                    currentY = checkAndAddPage(currentY, lineHeight + 5, false, true);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.text('•', x, currentY);
                    
                    const bulletLines = doc.splitTextToSize(listText, maxWidth - 10);
                    for (let i = 0; i < bulletLines.length; i++) {
                        if (i > 0) {
                            currentY += lineHeight;
                            currentY = checkAndAddPage(currentY, lineHeight + 5, false, true);
                        }
                        doc.text(bulletLines[i], x + 5, currentY);
                    }
                    currentY += lineHeight;
                    continue;
                }
                
                // Processar listas numeradas
                const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
                if (numberedMatch) {
                    const [, number, listText] = numberedMatch;
                    currentY = checkAndAddPage(currentY, lineHeight + 5, false, true);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.text(`${number}.`, x, currentY);
                    
                    const numberedLines = doc.splitTextToSize(listText, maxWidth - 15);
                    for (let i = 0; i < numberedLines.length; i++) {
                        if (i > 0) {
                            currentY += lineHeight;
                            currentY = checkAndAddPage(currentY, lineHeight + 5, false, true);
                        }
                        doc.text(numberedLines[i], x + 10, currentY);
                    }
                    currentY += lineHeight;
                    continue;
                }
                
                // Processar texto com formatação inline (negrito/itálico)
                const processedLine = processInlineFormattingLine(line, x, currentY, maxWidth, lineHeight);
                currentY = processedLine.newY;
            }
            
            return currentY;
        };
        
        // Função auxiliar para processar formatação inline em uma linha
        const processInlineFormattingLine = (text, x, startY, maxWidth, lineHeight) => {
            // Substituir formatação markdown por texto simples por enquanto
            // (implementação completa seria mais complexa para jsPDF)
            let processedText = text
                .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove negrito (mantém texto)
                .replace(/\*(.*?)\*/g, '$1');     // Remove itálico (mantém texto)
            
            const lines = doc.splitTextToSize(processedText, maxWidth);
            let currentY = startY;
            
            for (let i = 0; i < lines.length; i++) {
                currentY = checkAndAddPage(currentY, lineHeight + 5);
                doc.text(lines[i], x, currentY);
                currentY += lineHeight;
            }
            
            return { newY: currentY };
        };

        // Função para quebrar texto em múltiplas linhas respeitando limites
        // eslint-disable-next-line no-unused-vars
        const addTextWithPageBreaks = (text, x, startY, maxWidth, lineHeight = 5) => {
            const lines = doc.splitTextToSize(text, maxWidth);
            let currentY = startY;
            
            for (let i = 0; i < lines.length; i++) {
                currentY = checkAndAddPage(currentY, lineHeight + 5);
                doc.text(lines[i], x, currentY);
                currentY += lineHeight;
            }
            
            return currentY;
        };
        
        // CABEÇALHO OFICIAL (consistente com relatório de evolução)
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO CONSOLIDADO', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(14);
        doc.text('ANÁLISE COMPORTAMENTAL', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Informações da clínica e profissional (como no relatório de evolução)
        if (professionalData) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            if (patient.clinic_name) {
                const clinicText = `Clínica: ${patient.clinic_name}`;
                const clinicLines = doc.splitTextToSize(clinicText, contentWidth);
                for (const line of clinicLines) {
                    doc.text(line, pageWidth / 2, y, { align: 'center' });
                    y += 5;
                }
            }
            if (professionalData.professional_name) {
                const profText = `Profissional: ${professionalData.professional_name}`;
                const profLines = doc.splitTextToSize(profText, contentWidth);
                for (const line of profLines) {
                    doc.text(line, pageWidth / 2, y, { align: 'center' });
                    y += 5;
                }
                if (professionalData.professional_id) {
                    const idLines = doc.splitTextToSize(professionalData.professional_id, contentWidth);
                    for (const line of idLines) {
                        doc.text(line, pageWidth / 2, y, { align: 'center' });
                        y += 5;
                    }
                    y += 1;
                }
            }
        }

        y += 5;
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // IDENTIFICAÇÃO DO PACIENTE
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('1. IDENTIFICAÇÃO DO USUÁRIO', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Nome do paciente com quebra automática
        const patientName = `Nome: ${patient.name}`;
        y = addTextBlock(patientName, margin, y, contentWidth);
        y += 5;

        if (patient.dob) {
            const birthDate = new Date(patient.dob);
            const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
            const birthInfo = `Data de Nascimento: ${formatDate(patient.dob)} (${age} anos)`;
            y = addTextBlock(birthInfo, margin, y, contentWidth);
            y += 5;
        }

        if (patient.diagnosis) {
            const diagnosisText = `Diagnóstico: ${patient.diagnosis}`;
            y = addTextBlock(diagnosisText, margin, y, contentWidth);
            y += 5;
        }

        doc.text(`Data do Relatório: ${formatDate(new Date().toISOString())}`, margin, y);
        y += 6;

        if (patient.sessionData && patient.sessionData.length > 0) {
            const firstSession = patient.sessionData[0];
            const lastSession = patient.sessionData[patient.sessionData.length - 1];
            if (firstSession && lastSession) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                const periodText = `Período dos dados: de ${formatDate(firstSession.session_date)} a ${formatDate(lastSession.session_date)}`;
                y = addTextBlock(periodText, margin, y, contentWidth, 4);
                y += 2;
            }
        }
        
        y += 4;
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        
        // 2. ANÁLISE E INTERPRETAÇÃO (consistente com relatório de evolução)
        y = checkAndAddPage(y, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. ANÁLISE E INTERPRETAÇÃO', margin, y);
        y += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        // Usa a nova função para controlar quebras de página no texto com formatação
        y = processMarkdownText(reportText || "Nenhuma observação fornecida.", margin, y, contentWidth, 5);
        y += 10;

        // Força nova página para os gráficos se há texto suficiente
        const shouldStartChartsOnNewPage = y > margin + 100; // Se já passou de ~100mm da margem
        if (shouldStartChartsOnNewPage) {
            y = checkAndAddPage(y, 0, true); // Força nova página
        } else {
            y = checkAndAddPage(y, 15);
        }
        
        // 3. REGISTRO DA EVOLUÇÃO DAS SESSÕES (consistente com relatório de evolução)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. REGISTRO DA EVOLUÇÃO DAS SESSÕES', margin, y);
        y += 8;

        // Converte os dados organizados por área em array para chart promises
        const allPrograms = [];
        Object.keys(programsByArea).forEach(area => {
            programsByArea[area].forEach(program => {
                allPrograms.push({
                    ...program,
                    area: area,
                    title: program.program_name || program.title || `Programa ${program.program_id || program.id}`
                });
            });
        });
        
        const chartPromises = allPrograms.map(program => {
            // Volta à lógica original: busca sessões do paciente filtradas por programa
            const programSessionData = (patient.sessionData || [])
                .filter(session => session.program_id === program.program_id || session.program_id === program.id);
            // Dados já vêm ordenados do backend

            if (programSessionData.length === 0) return Promise.resolve(null);
            
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 300;

            const chartData = {
                labels: programSessionData.map(s => formatDate(s.session_date, 'short')),
                datasets: [{
                    label: 'Pontuação (%)',
                    data: programSessionData.map(s => s.score),
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    pointRadius: programSessionData.map(session => {
                      // Linha de base = estrela maior
                      return session.is_baseline ? 6 : 5;
                    }),
                    pointBackgroundColor: programSessionData.map(session => {
                      // Prioridade: Linha de base > Nível de prompting > Padrão
                      if (session.is_baseline) {
                        return '#f59e0b'; // Amarelo para linha de base
                      } else if (session.details && session.details.promptLevelColor) {
                        return session.details.promptLevelColor; // Cor específica do nível de prompting
                      } else {
                        return '#4f46e5'; // Cor padrão (azul)
                      }
                    }),
                    pointBorderColor: programSessionData.map(session => {
                      // Linha de base = borda amarela mais grossa
                      return session.is_baseline ? '#f59e0b' : '#ffffff';
                    }),
                    pointBorderWidth: programSessionData.map(session => {
                      // Linha de base = borda mais grossa para efeito estrela
                      return session.is_baseline ? 3 : 2;
                    }),
                    pointStyle: programSessionData.map(session => {
                      // Linha de base = estrela, outros = círculo
                      return session.is_baseline ? 'star' : 'circle';
                    }),
                    fill: true,
                    tension: 0.3,
                }]
            };
            
            const chartOptions = {
                animation: false,
                responsive: false,
                devicePixelRatio: 2,
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        max: 105,
                        grid: {
                            display: true,
                            color: 'rgba(156, 163, 175, 0.3)',
                            drawBorder: false,
                        },
                        ticks: {
                            padding: 8,
                            font: { size: 12, weight: 500 },
                            color: '#4b5563',
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        border: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(156, 163, 175, 0.3)',
                            drawBorder: false,
                        },
                        ticks: {
                            padding: 8,
                            font: { size: 12, weight: 500 },
                            color: '#4b5563'
                        },
                        border: {
                            display: false
                        }
                    }
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            };

            return new Promise(resolve => {
                new Chart(canvas.getContext('2d'), {
                    type: 'line',
                    data: chartData,
                    options: chartOptions,
                    plugins: [{
                        id: 'customCanvasBackgroundColor',
                        beforeDraw: (chart) => {
                            const {ctx} = chart;
                            ctx.save();
                            ctx.globalCompositeOperation = 'destination-over';
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, chart.width, chart.height);
                            ctx.restore();
                        }
                    }]
                });
                
                setTimeout(() => {
                    resolve({
                        title: program.title || program.program_name || `Programa ${program.program_id || program.id}`,
                        area: program.area || program.area_name || program.discipline_name || 'Área',
                        imageData: canvas.toDataURL('image/png', 0.95)
                    });
                }, 100);
            });
        });

        Promise.all(chartPromises).then(charts => {
            const validCharts = charts.filter(c => c);

            if (validCharts.length === 0) {
                y = checkAndAddPage(y);
                doc.setFont('helvetica', 'italic');
                doc.text("Nenhum dado de progresso para os programas ativos no período selecionado.", margin, y);
                y += 10;
            } else {
                // Agrupa gráficos por área
                const chartsByArea = validCharts.reduce((acc, chart) => {
                    if (!acc[chart.area]) {
                        acc[chart.area] = [];
                    }
                    acc[chart.area].push(chart);
                    return acc;
                }, {});

                const sortedAreas = Object.keys(chartsByArea).sort();

                sortedAreas.forEach(area => {
                    y = checkAndAddPage(y, 15);
                    // Adiciona o cabeçalho da área
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setFillColor(240, 240, 240);
                    doc.rect(margin, y - 4, contentWidth, 7, 'F');
                    doc.text(area, margin + 2, y);
                    y += 10;

                    // Desenha os gráficos para esta área com controle rigoroso de página
                    const chartsInArea = chartsByArea[area];
                    let chartsOnCurrentPage = 0;
                    const maxChartsPerPage = 2;
                    
                    for (let i = 0; i < chartsInArea.length; i++) {
                        const chartInfo = chartsInArea[i];
                        const chartHeight = 60; 
                        const chartWidth = contentWidth;
                        const titleHeight = 8;
                        const legendHeight = 20;
                        const totalChartHeight = titleHeight + chartHeight + legendHeight + 15; // 15 = espaço entre gráficos
                        
                        // Verifica se já tem o máximo de gráficos na página OU não há espaço suficiente
                        const needsNewPage = chartsOnCurrentPage >= maxChartsPerPage || 
                                           (y + totalChartHeight > doc.internal.pageSize.getHeight() - margin - 20);
                        
                        if (needsNewPage) {
                            addFooter(pageCount);
                            doc.addPage();
                            pageCount++;
                            y = margin + 10;
                            chartsOnCurrentPage = 0;
                            
                            // Reimprime o cabeçalho da área na nova página
                            doc.setFontSize(12);
                            doc.setFont('helvetica', 'bold');
                            doc.setFillColor(240, 240, 240);
                            doc.rect(margin, y - 4, contentWidth, 7, 'F');
                            doc.text(area + ' (continuação)', margin + 2, y);
                            y += 10;
                        }
                        
                        // Título do programa mais destacado
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(79, 70, 229); // Cor indigo
                        doc.text(chartInfo.title, margin, y);
                        doc.setTextColor(0); // Volta para preto
                        y += titleHeight;
                        
                        // Gráfico
                        doc.addImage(chartInfo.imageData, 'PNG', margin, y, chartWidth, chartHeight);
                        y += chartHeight + 8;
                        
                        // Legenda compacta e organizada
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Níveis de Prompting:', margin, y);
                        y += 4;
                        
                        doc.setFont('helvetica', 'normal');
                        // Items da legenda usando cores centralizadas
                        const legendItems = getLegendLevels().map(level => ({
                            color: level.rgb,
                            text: level.name
                        }));
                        
                        // Legenda em duas linhas compactas
                        const itemsPerRow = 3;
                        for (let j = 0; j < legendItems.length; j += itemsPerRow) {
                            let xPos = margin;
                            const rowItems = legendItems.slice(j, j + itemsPerRow);
                            const currentY = y; // Capturar valor atual de y

                            rowItems.forEach((item) => {
                                doc.setFillColor(item.color[0], item.color[1], item.color[2]);
                                doc.circle(xPos + 1, currentY - 0.5, 1, 'F');
                                doc.setTextColor(0);
                                doc.text(item.text, xPos + 4, currentY);
                                xPos += 60;
                            });
                            y += 4;
                        }
                        
                        // Símbolos especiais como legenda visual
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0);
                        doc.text('Símbolos:', margin, y);
                        y += 4;
                        
                        doc.setFont('helvetica', 'normal');
                        
                        // Estrela para linha de base (usando linhas para formar estrela)
                        const starX = margin + 2;
                        const starY = y - 1;
                        const starSize = 1.5;
                        doc.setDrawColor(245, 158, 11);
                        doc.setLineWidth(1.5);
                        
                        // Desenha estrela usando linhas (formato X com linha vertical e horizontal)
                        doc.line(starX - starSize, starY - starSize, starX + starSize, starY + starSize); // diagonal \
                        doc.line(starX + starSize, starY - starSize, starX - starSize, starY + starSize); // diagonal /
                        doc.line(starX, starY - starSize, starX, starY + starSize); // vertical |
                        doc.line(starX - starSize, starY, starX + starSize, starY); // horizontal -
                        doc.setTextColor(0);
                        doc.text('Linha de Base', starX + 8, y);
                        
                        // Círculo para sessão regular
                        const circleX = margin + 80;
                        doc.setFillColor(79, 70, 229); // Azul padrão
                        doc.circle(circleX, y - 1, 1.5, 'F');
                        doc.text('Sessão Regular', circleX + 6, y);
                        
                        y += 12; // Espaço entre gráficos
                        
                        chartsOnCurrentPage++;
                    }
                    
                    // Adiciona espaço entre áreas diferentes
                    y += 5;
                });
            }

            addFooter(pageCount);

            const filename = `Relatorio_${patient.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            doc.save(filename);
        });

    } catch (error) {
        console.error('Erro ao gerar Relatório Consolidado:', error);
        alert('Erro ao gerar o Relatório Consolidado. Tente novamente.');
    }
};

/**
 * Gera PDF do Relatório de Evolução Terapêutica
 * @param {object} data - Dados completos do relatório
 */
export const generateEvolutionReportPDF = async (data) => {
    const {
        reportData,
        analysisData,
        patientData,
        professionalData,
        customizations = {}
    } = data;

    if (!reportData || !analysisData) {
        alert("Dados insuficientes para gerar o relatório.");
        return;
    }

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - margin * 2;
        let y = margin + 10;
        let pageCount = 1;

        const addFooter = (currentPage) => {
            doc.setFontSize(8);
            doc.setTextColor(100);
            const footerText = `Página ${currentPage}`;
            doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - margin / 2, { align: 'center' });
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, doc.internal.pageSize.getHeight() - margin / 2);
            doc.text('Relatório Profissional Detalhado', pageWidth - margin, doc.internal.pageSize.getHeight() - margin / 2, { align: 'right' });
            doc.setTextColor(0);
        };

        const checkAndAddPage = (currentY, requiredHeight = 20, preserveFormatting = true) => {
            if (currentY > doc.internal.pageSize.getHeight() - margin - requiredHeight - 10) {
                // Capturar configurações atuais de fonte
                const currentFontSize = doc.internal.getFontSize();
                const currentFont = doc.internal.getFont();
                const currentTextColor = doc.internal.getTextColor();
                
                addFooter(pageCount);
                doc.addPage();
                pageCount++;
                
                // Restaurar configurações de fonte se solicitado
                if (preserveFormatting) {
                    doc.setFontSize(currentFontSize);
                    doc.setFont(currentFont.fontName, currentFont.fontStyle);
                    doc.setTextColor(currentTextColor);
                }
                
                return margin + 10;
            }
            return currentY;
        };

        const addTextBlock = (text, x, startY, maxWidth, lineHeight = 5) => {
            if (!text) return startY;
            const lines = doc.splitTextToSize(text, maxWidth);
            let currentY = startY;
            
            for (let i = 0; i < lines.length; i++) {
                currentY = checkAndAddPage(currentY, lineHeight + 5, true);
                doc.text(lines[i], x, currentY);
                currentY += lineHeight;
            }
            
            return currentY;
        };

        // CABEÇALHO OFICIAL
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RELATÓRIO DE EVOLUÇÃO TERAPÊUTICA', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(14);
        doc.text('ANÁLISE COMPORTAMENTAL', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Informações da clínica e profissional
        if (reportData.clinic_name || professionalData.professional_name) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            if (reportData.clinic_name) {
                doc.text(`Clínica: ${reportData.clinic_name}`, pageWidth / 2, y, { align: 'center' });
                y += 5;
            }
            if (professionalData.professional_name) {
                doc.text(`Profissional: ${professionalData.professional_name}`, pageWidth / 2, y, { align: 'center' });
                y += 5;
                if (professionalData.professional_id) {
                    doc.text(`${professionalData.professional_id}`, pageWidth / 2, y, { align: 'center' });
                    y += 6;
                }
            }
        }

        y += 5;
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // 1. IDENTIFICAÇÃO DO USUÁRIO
        y = checkAndAddPage(y, 25);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('1. IDENTIFICAÇÃO DO USUÁRIO', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nome: ${reportData.name}`, margin, y);
        y += 5;
        doc.text(`Data de Nascimento: ${formatDate(reportData.dob)}`, margin, y);
        y += 5;
        doc.text(`Idade: ${reportData.dob ? Math.floor((new Date() - new Date(reportData.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'} anos`, margin, y);
        y += 5;
        const diagnosis = `Diagnóstico: ${reportData.diagnosis || 'Não informado'}`;
        y = addTextBlock(diagnosis, margin, y, contentWidth);
        y += 5;
        if (patientData.guardian_name) {
            const guardian = `Responsável: ${patientData.guardian_name} (${patientData.guardian_relationship})`;
            y = addTextBlock(guardian, margin, y, contentWidth);
            y += 5;
        }
        if (patientData.patient_occupation) {
            doc.text(`Ocupação: ${patientData.patient_occupation}`, margin, y);
            y += 5;
        }
        y += 5;

        // 2. DESCRIÇÃO DA DEMANDA
        y = checkAndAddPage(y, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. DESCRIÇÃO DA DEMANDA', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setFont('helvetica', 'bold');
        doc.text('Queixa Principal:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const mainComplaint = customizations.demand?.main_complaint || patientData.main_complaint || 'Não informado';
        y = addTextBlock(mainComplaint, margin, y, contentWidth);
        y += 5;

        doc.setFont('helvetica', 'bold');
        doc.text('Objetivos do Tratamento:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const objectives = customizations.demand?.treatment_objectives || patientData.treatment_objectives || 'A serem definidos com base na avaliação inicial';
        y = addTextBlock(objectives, margin, y, contentWidth);
        y += 8;

        // 3. OBJETIVOS ESPECÍFICOS DOS PROGRAMAS
        y = checkAndAddPage(y, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. OBJETIVOS ESPECÍFICOS DOS PROGRAMAS', margin, y);
        y += 8;

        if (reportData.active_programs && reportData.active_programs.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            // Agrupa por disciplina
            const programsByDiscipline = reportData.active_programs.reduce((acc, program) => {
                if (!acc[program.discipline_name]) {
                    acc[program.discipline_name] = [];
                }
                acc[program.discipline_name].push(program);
                return acc;
            }, {});

            Object.keys(programsByDiscipline).sort().forEach(discipline => {
                y = checkAndAddPage(y, 15);
                doc.setFont('helvetica', 'bold');
                doc.text(`${discipline}:`, margin, y);
                y += 5;
                
                programsByDiscipline[discipline].forEach(program => {
                    y = checkAndAddPage(y, 10);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`• ${program.program_name}`, margin + 5, y);
                    y += 4;
                    if (program.objective) {
                        doc.setFont('helvetica', 'italic');
                        y = addTextBlock(`Objetivo: ${program.objective}`, margin + 10, y, contentWidth - 10, 4);
                        y += 2;
                    }
                });
                y += 3;
            });
        } else {
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhum programa ativo no período analisado.', margin, y);
            y += 5;
        }
        y += 5;

        // 4. REGISTRO DA EVOLUÇÃO DAS SESSÕES
        y = checkAndAddPage(y, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('4. REGISTRO DA EVOLUÇÃO DAS SESSÕES', margin, y);
        y += 8;

        // Período analisado
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (analysisData.period) {
            doc.text(`Período analisado: ${formatDate(analysisData.period.start_date)} a ${formatDate(analysisData.period.end_date)}`, margin, y);
            y += 5;
        }

        // Estatísticas resumidas
        if (analysisData.statistics) {
            const stats = analysisData.statistics;
            doc.setFont('helvetica', 'normal');
            doc.text(`• Total de sessões realizadas: ${stats.total_sessions}`, margin + 3, y);
            y += 5;
            doc.text(`• Programas trabalhados: ${stats.programs_worked}`, margin + 3, y);
            y += 5;
            doc.text(`• Média geral de acertos: ${stats.avg_score.toFixed(1)}%`, margin + 3, y);
            y += 5;
            doc.text(`• Nível de independência: ${stats.independence_percentage.toFixed(1)}%`, margin + 3, y);
            y += 5;
            
            // Tendência
            let trendText = '• Tendência: ';
            switch (stats.improvement_trend) {
                case 'significant_improvement':
                    trendText += 'Melhoria significativa observada';
                    break;
                case 'moderate_improvement':
                    trendText += 'Melhoria gradual observada';
                    break;
                case 'stable':
                    trendText += 'Desempenho estável mantido';
                    break;
                case 'moderate_decline':
                    trendText += 'Declínio moderado observado';
                    break;
                case 'significant_decline':
                    trendText += 'Declínio significativo observado';
                    break;
                default:
                    trendText += 'Dados insuficientes para análise de tendência';
            }
            doc.text(trendText, margin + 3, y);
            y += 7;
        }

        // Observações qualitativas
        if (analysisData.frequent_observations && analysisData.frequent_observations.length > 0) {
            y = checkAndAddPage(y, 15);
            doc.setFont('helvetica', 'bold');
            doc.text('Observações Registradas nas Sessões:', margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            
            analysisData.frequent_observations.slice(0, 8).forEach(obs => {
                y = checkAndAddPage(y, 15); // Aumentar espaço reservado para textos longos
                const observationText = `• "${obs.note}" (observado em ${obs.frequency} sessão${obs.frequency > 1 ? 'ões' : ''})`;
                y = addTextBlock(observationText, margin + 3, y, contentWidth - 3);
                y += 3; // Espaçamento entre observações
            });
            y += 3;
        }

        // Performance por área
        if (analysisData.area_performance && analysisData.area_performance.length > 0) {
            y = checkAndAddPage(y, 15);
            doc.setFont('helvetica', 'bold');
            doc.text('Desempenho por Área de Intervenção:', margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            
            analysisData.area_performance.forEach(area => {
                y = checkAndAddPage(y, 8);
                doc.text(`• ${area.area_name}: ${area.avg_score.toFixed(1)}% (${area.session_count} sessões)`, margin + 3, y);
                y += 5;
            });
            y += 6;
        }

        // 5. ANÁLISE E INTERPRETAÇÃO
        y = checkAndAddPage(y, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('5. ANÁLISE E INTERPRETAÇÃO', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (customizations.analysis?.clinical_interpretation) {
            y = addTextBlock(customizations.analysis.clinical_interpretation, margin, y, contentWidth);
        } else {
            // Análise automática baseada nos insights
            if (analysisData.insights && analysisData.insights.length > 0) {
                y = addTextBlock('Com base nos dados coletados e na análise comportamental, observa-se:', margin, y, contentWidth);
                y += 6;

                analysisData.insights.forEach(insight => {
                    y = checkAndAddPage(y, 15); // Aumentar espaço reservado para textos longos
                    // Usar addTextBlock para quebrar linhas adequadamente
                    const insightText = `• ${insight.text}`;
                    y = addTextBlock(insightText, margin + 3, y, contentWidth - 3);
                    y += 3; // Espaçamento entre insights
                });
            } else {
                y = addTextBlock('Análise em desenvolvimento com base nos dados coletados.', margin, y, contentWidth);
                y += 5;
            }
        }
        y += 8;

        // 6. CONCLUSÃO E ENCAMINHAMENTOS
        y = checkAndAddPage(y, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('6. CONCLUSÃO E ENCAMINHAMENTOS', margin, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Síntese
        doc.setFont('helvetica', 'bold');
        doc.text('Síntese do Período:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        
        if (customizations.conclusions?.summary) {
            y = addTextBlock(customizations.conclusions.summary, margin, y, contentWidth);
        } else {
            // Síntese automática
            const summary = `Durante o período analisado, foram realizadas ${analysisData.statistics?.total_sessions || 0} sessões terapêuticas abrangendo ${analysisData.statistics?.programs_worked || 0} programa(s) de intervenção. O desempenho médio apresentado foi de ${analysisData.statistics?.avg_score?.toFixed(1) || 0}% de acertos, com ${analysisData.statistics?.independence_percentage?.toFixed(1) || 0}% das respostas em nível independente.`;
            y = addTextBlock(summary, margin, y, contentWidth);
        }
        y += 6;

        // Recomendações
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendações:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        
        if (customizations.conclusions?.recommendations) {
            y = addTextBlock(customizations.conclusions.recommendations, margin, y, contentWidth);
        } else {
            // Recomendações baseadas na tendência
            let recommendations = 'Recomenda-se continuidade do programa de intervenção com ';
            if (analysisData.statistics?.improvement_trend === 'significant_improvement' || 
                analysisData.statistics?.improvement_trend === 'moderate_improvement') {
                recommendations += 'manutenção das estratégias atuais e consideração de aumento da complexidade dos objetivos trabalhados.';
            } else if (analysisData.statistics?.improvement_trend === 'stable') {
                recommendations += 'revisão das estratégias para promover maior avanço no desenvolvimento das habilidades.';
            } else {
                recommendations += 'revisão criteriosa dos procedimentos e estratégias utilizadas, bem como investigação de possíveis variáveis interferentes.';
            }
            y = addTextBlock(recommendations, margin, y, contentWidth);
        }
        y += 10;

        // Assinatura profissional
        y = checkAndAddPage(y, 25);
        doc.setLineWidth(0.3);
        doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(professionalData.professional_name || 'Profissional Responsável', pageWidth - margin - 30, y, { align: 'center' });
        y += 3;
        doc.text(professionalData.professional_id || 'Registro Profissional', pageWidth - margin - 30, y, { align: 'center' });
        if (professionalData.qualifications) {
            y += 3;
            const qualifications = doc.splitTextToSize(professionalData.qualifications, 60);
            qualifications.forEach(line => {
                doc.text(line, pageWidth - margin - 30, y, { align: 'center' });
                y += 3;
            });
        }

        // Footer da última página
        addFooter(pageCount);

        // Salvar PDF
        const filename = `Relatorio_Evolucao_Terapeutica_${reportData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        doc.save(filename);

    } catch (error) {
        console.error('Erro ao gerar Relatório de Evolução Terapêutica:', error);
        alert('Erro ao gerar o Relatório de Evolução Terapêutica. Tente novamente.');
    }
};
