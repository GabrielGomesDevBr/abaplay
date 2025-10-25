import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { getLegendLevels } from './promptLevelColors';


// Site oficial do ABAplay para branding
const ABAPLAY_WEBSITE = 'www.abaplay.app.br';

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
            const footerY = doc.internal.pageSize.getHeight() - margin / 2;

            doc.setFontSize(8);
            doc.setTextColor(100);

            // Esquerda: Data de geração
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, footerY);

            // Centro: Página
            doc.text(`Página ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });

            // Direita: Site
            doc.text(ABAPLAY_WEBSITE, pageWidth - margin, footerY, { align: 'right' });

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

        // Adicionar rodapé na Folha de Registro
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerY = doc.internal.pageSize.getHeight() - margin / 2;

            doc.setFontSize(8);
            doc.setTextColor(100);

            // Esquerda: Data de geração
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, footerY);

            // Centro: Página
            doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });

            // Direita: Site
            doc.text(ABAPLAY_WEBSITE, pageWidth - margin, footerY, { align: 'right' });

            doc.setTextColor(0);
        }

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
            const footerY = doc.internal.pageSize.getHeight() - margin / 2;

            doc.setFontSize(8);
            doc.setTextColor(100);

            // Esquerda: Data de geração
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, footerY);

            // Centro: Página
            doc.text(`Página ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });

            // Direita: Site
            doc.text(ABAPLAY_WEBSITE, pageWidth - margin, footerY, { align: 'right' });

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
            const footerY = doc.internal.pageSize.getHeight() - margin / 2;

            doc.setFontSize(8);
            doc.setTextColor(100);

            // Esquerda: Data de geração
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, footerY);

            // Centro: Página
            doc.text(`Página ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });

            // Direita: Site
            doc.text(ABAPLAY_WEBSITE, pageWidth - margin, footerY, { align: 'right' });

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

/**
 * Gera PDF do Cadastro Completo do Paciente
 * Apenas administradores podem gerar este relatório
 * @param {object} patientData - Dados completos do paciente (básicos + expandidos)
 * @param {object} clinicData - Dados da clínica
 */
export const generatePatientRegistrationPDF = async (patientData, clinicData = null) => {
    if (!patientData) {
        alert("Nenhum paciente selecionado.");
        return;
    }

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - margin * 2;
        let y = margin + 10;
        let pageCount = 1;

        // Cores e configurações
        const colors = {
            primary: [79, 70, 229],
            lightGray: [240, 240, 240],
            darkGray: [100, 100, 100],
            black: [0, 0, 0],
            warning: [245, 158, 11]
        };

        const addFooter = (currentPage) => {
            doc.setFontSize(8);
            doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);

            // Texto de confidencialidade
            const confidentialText = 'DOCUMENTO CONFIDENCIAL - INFORMAÇÕES PROTEGIDAS PELA LGPD';
            doc.text(confidentialText, pageWidth / 2, doc.internal.pageSize.getHeight() - margin / 2 - 3, { align: 'center' });

            const footerText = `Página ${currentPage}`;
            doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - margin / 2, { align: 'center' });
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, doc.internal.pageSize.getHeight() - margin / 2);
            doc.setTextColor(0, 0, 0);
        };

        const checkAndAddPage = (currentY, requiredHeight = 20, preserveFormatting = true) => {
            if (currentY > doc.internal.pageSize.getHeight() - margin - requiredHeight - 15) {
                const currentFontSize = doc.internal.getFontSize();
                const currentFont = doc.internal.getFont();
                const currentTextColor = doc.internal.getTextColor();

                addFooter(pageCount);
                doc.addPage();
                pageCount++;

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
            if (!text || text === 'Não informado') return startY;
            const lines = doc.splitTextToSize(text, maxWidth);
            let currentY = startY;

            for (let i = 0; i < lines.length; i++) {
                currentY = checkAndAddPage(currentY, lineHeight + 5, true);
                doc.text(lines[i], x, currentY);
                currentY += lineHeight;
            }

            return currentY;
        };

        const addSectionHeader = (title, currentY) => {
            currentY = checkAndAddPage(currentY, 15);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
            doc.rect(margin, currentY - 4, contentWidth, 7, 'F');
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.text(title, margin + 2, currentY);
            doc.setTextColor(0, 0, 0);
            return currentY + 8;
        };

        const addField = (label, value, currentY) => {
            if (!value || value === '') return currentY;
            currentY = checkAndAddPage(currentY);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, margin, currentY);
            doc.setFont('helvetica', 'normal');
            currentY = addTextBlock(String(value), margin + 50, currentY, contentWidth - 50);
            return currentY + 2;
        };

        // CABEÇALHO
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('CADASTRO COMPLETO DO PACIENTE', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(14);
        doc.text('DOCUMENTAÇÃO CONFIDENCIAL', pageWidth / 2, y, { align: 'center' });
        y += 10;

        if (clinicData?.name) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Clínica: ${clinicData.name}`, pageWidth / 2, y, { align: 'center' });
            y += 6;
        }

        y += 3;
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // 1. DADOS BÁSICOS DO PACIENTE
        y = addSectionHeader('1. DADOS BÁSICOS DO PACIENTE', y);
        y = addField('Nome Completo', patientData.name, y);
        y = addField('Data de Nascimento', formatDate(patientData.dob), y);

        if (patientData.dob) {
            const age = Math.floor((new Date() - new Date(patientData.dob)) / (365.25 * 24 * 60 * 60 * 1000));
            y = addField('Idade', `${age} anos`, y);
        }

        y = addField('Diagnóstico', patientData.diagnosis, y);
        y += 5;

        // 2. DADOS DOS RESPONSÁVEIS
        y = addSectionHeader('2. DADOS DOS RESPONSÁVEIS', y);

        // Responsável Principal
        if (patientData.guardian_name || patientData.guardian_relationship) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            y = checkAndAddPage(y);
            doc.text('Responsável Principal:', margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');

            y = addField('Nome', patientData.guardian_name, y);
            y = addField('Parentesco', patientData.guardian_relationship, y);
            y = addField('Telefone', patientData.guardian_phone, y);
            y = addField('E-mail', patientData.guardian_email, y);
            y = addField('Profissão', patientData.guardian_occupation, y);
            y = addField('Escolaridade', patientData.guardian_education, y);
            y += 3;
        }

        // Segundo Responsável
        if (patientData.second_guardian_name) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            y = checkAndAddPage(y);
            doc.text('Segundo Responsável:', margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');

            y = addField('Nome', patientData.second_guardian_name, y);
            y = addField('Parentesco', patientData.second_guardian_relationship, y);
            y = addField('Telefone', patientData.second_guardian_phone, y);
            y = addField('E-mail', patientData.second_guardian_email, y);
            y = addField('Profissão', patientData.second_guardian_occupation, y);
            y += 3;
        }

        // 3. ENDEREÇO E CONTATO
        if (patientData.address_street || patientData.address_city) {
            y = addSectionHeader('3. ENDEREÇO E CONTATO', y);

            if (patientData.address_street) {
                const fullAddress = `${patientData.address_street}${patientData.address_number ? ', ' + patientData.address_number : ''}${patientData.address_complement ? ' - ' + patientData.address_complement : ''}`;
                y = addField('Logradouro', fullAddress, y);
            }

            y = addField('Bairro', patientData.address_neighborhood, y);
            y = addField('Cidade', patientData.address_city, y);
            y = addField('Estado', patientData.address_state, y);
            y = addField('CEP', patientData.address_zip, y);
            y += 5;
        }

        // 4. INFORMAÇÕES EDUCACIONAIS
        if (patientData.school_name || patientData.school_grade) {
            y = addSectionHeader('4. INFORMAÇÕES EDUCACIONAIS', y);

            y = addField('Nome da Escola', patientData.school_name, y);
            y = addField('Série/Ano', patientData.school_grade, y);
            y = addField('Período', patientData.school_period, y);
            y = addField('Telefone da Escola', patientData.school_phone, y);
            y = addField('E-mail da Escola', patientData.school_email, y);
            y = addField('Professor(a)', patientData.school_teacher, y);
            y = addField('Telefone do Professor(a)', patientData.school_teacher_phone, y);

            if (patientData.school_special_needs) {
                y = addField('Necessidades Especiais', 'Sim', y);
                y = addField('Adaptações Necessárias', patientData.school_adaptations, y);
            }
            y += 5;
        }

        // 5. DESENVOLVIMENTO E NASCIMENTO
        if (patientData.birth_weight || patientData.gestational_age || patientData.delivery_type) {
            y = addSectionHeader('5. DESENVOLVIMENTO E NASCIMENTO', y);

            if (patientData.birth_weight) {
                y = addField('Peso ao Nascer', `${patientData.birth_weight} kg`, y);
            }
            if (patientData.birth_height) {
                y = addField('Altura ao Nascer', `${patientData.birth_height} cm`, y);
            }
            if (patientData.gestational_age) {
                y = addField('Idade Gestacional', `${patientData.gestational_age} semanas`, y);
            }

            y = addField('Tipo de Parto', patientData.delivery_type, y);
            y = addField('Complicações no Parto', patientData.birth_complications, y);
            y = addField('Preocupações com Desenvolvimento', patientData.development_concerns, y);

            if (patientData.early_intervention) {
                y = addField('Intervenção Precoce', 'Sim', y);
            }
            y += 5;
        }

        // 6. DADOS MÉDICOS
        if (patientData.pediatrician_name || patientData.health_insurance) {
            y = addSectionHeader('6. DADOS MÉDICOS', y);

            y = addField('Pediatra', patientData.pediatrician_name, y);
            y = addField('Telefone do Pediatra', patientData.pediatrician_phone, y);
            y = addField('E-mail do Pediatra', patientData.pediatrician_email, y);
            y = addField('Plano de Saúde', patientData.health_insurance, y);
            y = addField('Número do Plano', patientData.health_insurance_number, y);
            y += 5;
        }

        // 7. MEDICAÇÕES ATUAIS
        if (patientData.medications && patientData.medications.length > 0) {
            y = addSectionHeader('7. MEDICAÇÕES ATUAIS', y);

            const medicationsTableData = patientData.medications.map(med => [
                med.name || 'N/A',
                med.dosage || 'N/A',
                med.frequency || 'N/A',
                med.prescribing_doctor || 'N/A'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Medicamento', 'Dosagem', 'Frequência', 'Médico']],
                body: medicationsTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: colors.primary,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 45 }
                },
                margin: { left: margin, right: margin }
            });

            y = doc.lastAutoTable.finalY + 5;
        }

        // 8. CONTATOS DE EMERGÊNCIA
        if (patientData.emergencyContacts && patientData.emergencyContacts.length > 0) {
            y = checkAndAddPage(y, 30);
            y = addSectionHeader('8. CONTATOS DE EMERGÊNCIA', y);

            const emergencyTableData = patientData.emergencyContacts.map(contact => [
                contact.name || 'N/A',
                contact.relationship || 'N/A',
                contact.phone || 'N/A',
                contact.is_primary ? 'Sim' : 'Não'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Nome', 'Parentesco', 'Telefone', 'Contato Principal']],
                body: emergencyTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: colors.primary,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 35, halign: 'center' }
                },
                margin: { left: margin, right: margin }
            });

            y = doc.lastAutoTable.finalY + 5;
        }

        // 9. HISTÓRICO MÉDICO
        if (patientData.medicalHistory && patientData.medicalHistory.length > 0) {
            y = checkAndAddPage(y, 30);
            y = addSectionHeader('9. HISTÓRICO MÉDICO', y);

            const historyTableData = patientData.medicalHistory.map(history => [
                history.condition || 'N/A',
                history.diagnosis_date ? formatDate(history.diagnosis_date) : 'N/A',
                history.treatment || 'N/A',
                history.status || 'N/A'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Condição', 'Data Diagnóstico', 'Tratamento', 'Status']],
                body: historyTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: colors.primary,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 50 },
                    3: { cellWidth: 35 }
                },
                margin: { left: margin, right: margin }
            });

            y = doc.lastAutoTable.finalY + 5;
        }

        // 10. PROFISSIONAIS DE ACOMPANHAMENTO
        if (patientData.professionalContacts && patientData.professionalContacts.length > 0) {
            y = checkAndAddPage(y, 30);
            y = addSectionHeader('10. PROFISSIONAIS DE ACOMPANHAMENTO', y);

            const professionalsTableData = patientData.professionalContacts.map(prof => [
                prof.name || 'N/A',
                prof.specialty || 'N/A',
                prof.phone || 'N/A',
                prof.email || 'N/A'
            ]);

            autoTable(doc, {
                startY: y,
                head: [['Nome', 'Especialidade', 'Telefone', 'E-mail']],
                body: professionalsTableData,
                theme: 'grid',
                headStyles: {
                    fillColor: colors.primary,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 40 }
                },
                margin: { left: margin, right: margin }
            });

            y = doc.lastAutoTable.finalY + 5;
        }

        // 11. OBSERVAÇÕES ESPECIAIS
        if (patientData.allergies || patientData.dietary_restrictions || patientData.behavioral_notes || patientData.communication_preferences) {
            y = checkAndAddPage(y, 30);
            y = addSectionHeader('11. OBSERVAÇÕES ESPECIAIS', y);

            y = addField('Alergias', patientData.allergies, y);
            y = addField('Restrições Alimentares', patientData.dietary_restrictions, y);
            y = addField('Observações Comportamentais', patientData.behavioral_notes, y);
            y = addField('Preferências de Comunicação', patientData.communication_preferences, y);
            y += 5;
        }

        // AVISO LGPD
        y = checkAndAddPage(y, 25);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
        doc.text('AVISO DE CONFIDENCIALIDADE', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);

        const lgpdText = 'Este documento contém informações confidenciais e protegidas pela Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). O acesso, uso, divulgação ou reprodução não autorizada das informações contidas neste documento são estritamente proibidos e podem resultar em sanções legais. Este documento deve ser mantido em local seguro e acessado apenas por profissionais autorizados envolvidos no tratamento do paciente.';

        y = addTextBlock(lgpdText, margin, y, contentWidth, 4);

        addFooter(pageCount);

        const filename = `Cadastro_Completo_${patientData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        doc.save(filename);

    } catch (error) {
        console.error('Erro ao gerar PDF de cadastro completo:', error);
        alert('Erro ao gerar o PDF de cadastro completo. Tente novamente.');
    }
};

/**
 * Gera PDF profissional com horários disponíveis
 * @param {Object} params - Parâmetros da geração
 * @param {Array} params.selectedSlots - Array de horários selecionados
 * @param {Object} params.filters - Filtros aplicados na busca
 * @param {Array} params.disciplines - Lista de disciplinas disponíveis
 * @param {string} params.clinicName - Nome da clínica (opcional)
 */
export const generateAvailabilityPDF = async ({ selectedSlots, filters, disciplines, clinicName = null }) => {
    if (!selectedSlots || selectedSlots.length === 0) {
        alert('Nenhum horário selecionado para gerar o PDF.');
        return;
    }

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margin * 2;
        let y = margin;
        let pageCount = 1;

        // ========================================
        // FUNÇÕES AUXILIARES
        // ========================================

        const addFooter = (currentPage) => {
            const footerY = pageHeight - margin / 2;
            doc.setFontSize(8);
            doc.setTextColor(100);

            // Esquerda: Data de geração
            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, footerY);

            // Centro: Página
            doc.text(`Página ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });

            // Direita: Site
            doc.text(ABAPLAY_WEBSITE, pageWidth - margin, footerY, { align: 'right' });

            doc.setTextColor(0);
        };

        const checkAndAddPage = (currentY, requiredHeight = 20) => {
            if (currentY > pageHeight - margin - requiredHeight) {
                addFooter(pageCount);
                doc.addPage();
                pageCount++;
                return margin;
            }
            return currentY;
        };

        const translateDayName = (dayName) => {
            const dayTranslations = {
                'Monday': 'Segunda-feira',
                'Tuesday': 'Terça-feira',
                'Wednesday': 'Quarta-feira',
                'Thursday': 'Quinta-feira',
                'Friday': 'Sexta-feira',
                'Saturday': 'Sábado',
                'Sunday': 'Domingo'
            };
            return dayTranslations[dayName] || dayName;
        };

        // ========================================
        // CABEÇALHO
        // ========================================

        // Título (REMOVIDO: nome ABAplay)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Horários Disponíveis', pageWidth / 2, y, { align: 'center' });
        y += 8;

        // Subtítulo com data
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Consulta realizada em ${formatDate(new Date().toISOString())}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Linha separadora
        doc.setLineWidth(0.3);
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // ========================================
        // TEXTO DE APRESENTAÇÃO
        // ========================================

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);

        const introText = `Prezado(a),

Identificamos os seguintes horários disponíveis que podem atender às suas necessidades terapêuticas. Nossa equipe está à disposição para auxiliar na escolha do melhor horário e esclarecer quaisquer dúvidas sobre os atendimentos.`;

        const introLines = doc.splitTextToSize(introText, contentWidth);
        doc.text(introLines, margin, y);
        y += introLines.length * 5 + 5;

        // ========================================
        // INFORMAÇÕES DA BUSCA
        // ========================================

        y = checkAndAddPage(y, 30);

        doc.setFillColor(245, 245, 250);
        doc.rect(margin, y - 3, contentWidth, 25, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Critérios da Consulta', margin + 3, y + 2);
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // Especialidades (CORRIGIDO: suporte a múltiplas)
        const disciplineName = filters.discipline_ids && filters.discipline_ids.length > 0
            ? filters.discipline_ids.map(id => disciplines.find(d => d.id === parseInt(id))?.name).filter(Boolean).join(', ')
            : 'Todas as especialidades';
        doc.text(`• Especialidade(s): ${disciplineName}`, margin + 5, y);
        y += 5;

        // Duração
        doc.text(`• Duração da sessão: ${filters.duration_minutes} minutos`, margin + 5, y);
        y += 5;

        // Período (se especificado)
        if (filters.time_period && filters.time_period !== 'all') {
            const periodMap = {
                'morning': 'Manhã',
                'afternoon': 'Tarde',
                'evening': 'Noite'
            };
            doc.text(`• Período preferencial: ${periodMap[filters.time_period] || filters.time_period}`, margin + 5, y);
            y += 5;
        }

        y += 8;

        // ========================================
        // HORÁRIOS DISPONÍVEIS
        // ========================================

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Horários Disponíveis', margin, y);
        y += 8;

        // Ordenar por data e horário
        const sortedSlots = [...selectedSlots].sort((a, b) => {
            if (a.available_date !== b.available_date) {
                return a.available_date.localeCompare(b.available_date);
            }
            return a.available_time.localeCompare(b.available_time);
        });

        // Agrupar por terapeuta
        const groupedByTherapist = sortedSlots.reduce((acc, slot) => {
            if (!acc[slot.therapist_id]) {
                acc[slot.therapist_id] = {
                    name: slot.therapist_name,
                    slots: []
                };
            }
            acc[slot.therapist_id].slots.push(slot);
            return acc;
        }, {});

        // Renderizar cada terapeuta
        Object.values(groupedByTherapist).forEach((group, groupIndex) => {
            y = checkAndAddPage(y, 25);

            // Header do terapeuta
            const hasSpecialty = group.slots.some(s => s.has_specialty);
            const headerHeight = hasSpecialty ? 12 : 8;

            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 3, contentWidth, headerHeight, 'F');

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(group.name, margin + 3, y + 2);

            // Badge de especialista abaixo do nome (não sobrepõe)
            if (hasSpecialty) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setFillColor(220, 255, 220);
                doc.setDrawColor(100, 180, 100);
                doc.setLineWidth(0.2);
                const badgeY = y + 6;
                doc.roundedRect(margin + 3, badgeY - 2, 20, 3.5, 0.8, 0.8, 'FD');
                doc.setTextColor(0, 100, 0);
                doc.text('Especialista', margin + 4, badgeY);
                doc.setTextColor(0);
            }

            y += headerHeight;

            // Tabela de horários (MELHORADO: layout mais limpo e organizado)
            const tableData = group.slots.map(slot => {
                const date = formatDate(slot.available_date);
                const dayName = translateDayName(slot.day_name);
                const time = slot.available_time.slice(0, 5);

                return [
                    date,
                    dayName,
                    time,
                    `${filters.duration_minutes} min`
                ];
            });

            autoTable(doc, {
                startY: y,
                head: [['Data', 'Dia da Semana', 'Horário', 'Duração']],
                body: tableData,
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 4,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1,
                    halign: 'left'
                },
                headStyles: {
                    fillColor: [70, 130, 180],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 9
                },
                columnStyles: {
                    0: { cellWidth: 35, halign: 'center' },
                    1: { cellWidth: 45, halign: 'left' },
                    2: { cellWidth: 30, halign: 'center' },
                    3: { cellWidth: contentWidth - 110, halign: 'center' }
                },
                margin: { left: margin, right: margin },
                didDrawPage: (data) => {
                    if (data.pageNumber > pageCount) {
                        pageCount = data.pageNumber;
                    }
                }
            });

            y = doc.lastAutoTable.finalY + 8;
        });

        // ========================================
        // RESUMO E PRÓXIMOS PASSOS
        // ========================================

        y = checkAndAddPage(y, 35);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo', margin, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total de horários disponíveis: ${selectedSlots.length}`, margin, y);
        y += 5;
        doc.text(`Profissionais disponíveis: ${Object.keys(groupedByTherapist).length}`, margin, y);
        y += 10;

        // Próximos passos
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Próximos Passos', margin, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const nextStepsText = `Para agendar um dos horários listados ou obter mais informações, entre em contato conosco. Estamos prontos para atendê-lo e esclarecer todas as suas dúvidas sobre os atendimentos.`;
        const nextStepsLines = doc.splitTextToSize(nextStepsText, contentWidth);
        doc.text(nextStepsLines, margin, y);
        y += nextStepsLines.length * 5;

        // ========================================
        // RODAPÉ FINAL
        // ========================================

        addFooter(pageCount);

        // ========================================
        // SALVAR PDF
        // ========================================

        const disciplineSlug = disciplineName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateSlug = new Date().toISOString().split('T')[0];
        const filename = `Disponibilidade_ABAplay_${disciplineSlug}_${dateSlug}.pdf`;

        doc.save(filename);

        return true;

    } catch (error) {
        console.error('Erro ao gerar PDF de disponibilidade:', error);
        alert('Erro ao gerar o PDF. Tente novamente.');
        return false;
    }
};

/**
 * Gera PDF consolidado de atendimentos/presenças do paciente
 * @param {Object} data - Dados do relatório retornados pelo backend
 */
export const generatePatientAttendanceReportPDF = async (data) => {
    if (!data || !data.patient) {
        alert('Dados insuficientes para gerar o relatório.');
        return false;
    }

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margin * 2;
        let y = margin;
        let pageCount = 1;

        const { patient, period, summary, by_discipline, all_sessions } = data;

        // ========================================
        // FUNÇÕES AUXILIARES
        // ========================================

        const addFooter = (currentPage) => {
            const footerY = pageHeight - margin / 2;
            doc.setFontSize(8);
            doc.setTextColor(100);

            doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, margin, footerY);
            doc.text(`Página ${currentPage}`, pageWidth / 2, footerY, { align: 'center' });
            doc.text(ABAPLAY_WEBSITE, pageWidth - margin, footerY, { align: 'right' });

            doc.setTextColor(0);
        };

        const checkAndAddPage = (currentY, requiredHeight = 20) => {
            if (currentY > pageHeight - margin - requiredHeight) {
                addFooter(pageCount);
                doc.addPage();
                pageCount++;
                return margin;
            }
            return currentY;
        };

        const translateStatus = (status) => {
            const statusMap = {
                'completed': 'Realizada',
                'no_show': 'Falta',
                'cancelled': 'Cancelada',
                'scheduled': 'Agendada',
                'rescheduled': 'Remarcada'
            };
            return statusMap[status] || status;
        };

        const getStatusColor = (status) => {
            const colorMap = {
                'completed': [34, 139, 34],      // Verde
                'no_show': [220, 20, 60],        // Vermelho
                'cancelled': [255, 140, 0],      // Laranja
                'scheduled': [70, 130, 180],     // Azul
                'rescheduled': [147, 112, 219]   // Roxo
            };
            return colorMap[status] || [100, 100, 100];
        };

        // ========================================
        // CABEÇALHO
        // ========================================

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 180);
        doc.text('ABAplay', pageWidth / 2, y, { align: 'center' });
        y += 8;

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Relatório de Presenças do Paciente', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Linha separadora
        doc.setLineWidth(0.3);
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // ========================================
        // INFORMAÇÕES DO PACIENTE
        // ========================================

        doc.setFillColor(245, 245, 250);
        doc.rect(margin, y - 3, contentWidth, 20, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Paciente', margin + 3, y + 2);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Nome: ${patient.name}`, margin + 5, y);
        y += 5;
        if (patient.dob) {
            doc.text(`Data de Nascimento: ${formatDate(patient.dob)}`, margin + 5, y);
            y += 5;
        }
        if (patient.diagnosis) {
            doc.text(`Diagnóstico: ${patient.diagnosis}`, margin + 5, y);
            y += 5;
        }
        doc.text(`Período: ${formatDate(period.start_date)} a ${formatDate(period.end_date)}`, margin + 5, y);
        y += 10;

        // ========================================
        // RESUMO EXECUTIVO
        // ========================================

        y = checkAndAddPage(y, 40);

        doc.setFillColor(240, 248, 255);
        doc.rect(margin, y - 3, contentWidth, 35, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo Executivo', margin + 3, y + 2);
        y += 8;

        // Tabela de resumo
        const summaryData = [
            ['Total de Sessões', summary.total_sessions.toString()],
            ['Sessões Realizadas', summary.completed_sessions.toString()],
            ['Faltas', summary.no_show_sessions.toString()],
            ['Cancelamentos', summary.cancelled_sessions.toString()],
            ['Taxa de Comparecimento', `${summary.attendance_rate}%`],
            ['Horas Totais de Atendimento', `${summary.total_hours}h`]
        ];

        autoTable(doc, {
            startY: y,
            head: [],
            body: summaryData,
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: 2
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: contentWidth * 0.6 },
                1: { halign: 'right', cellWidth: contentWidth * 0.4 }
            },
            margin: { left: margin + 5, right: margin + 5 }
        });

        y = doc.lastAutoTable.finalY + 10;

        // ========================================
        // RESUMO POR ESPECIALIDADE
        // ========================================

        y = checkAndAddPage(y, 30);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo por Especialidade', margin, y);
        y += 6;

        const disciplineTableData = Object.values(by_discipline).map(disc => [
            disc.discipline_name,
            disc.total.toString(),
            disc.completed.toString(),
            disc.no_show.toString()
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Especialidade', 'Total', 'Realizadas', 'Faltas']],
            body: disciplineTableData,
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [220, 220, 220],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [250, 250, 250],
                textColor: [80, 80, 80],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: contentWidth * 0.5 },
                1: { halign: 'center', cellWidth: contentWidth * 0.17 },
                2: { halign: 'center', cellWidth: contentWidth * 0.17 },
                3: { halign: 'center', cellWidth: contentWidth * 0.16 }
            },
            margin: { left: margin, right: margin }
        });

        y = doc.lastAutoTable.finalY + 10;

        // ========================================
        // DETALHAMENTO POR ESPECIALIDADE
        // ========================================

        y = checkAndAddPage(y, 30);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalhamento por Especialidade', margin, y);
        y += 8;

        Object.values(by_discipline).forEach((disc, index) => {
            y = checkAndAddPage(y, 40);

            // Header da disciplina
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 3, contentWidth, 8, 'F');

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(`${disc.discipline_name} (${disc.completed} sessões realizadas)`, margin + 3, y + 2);
            y += 6;

            // Profissionais
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Profissionais: ${disc.therapists.join(', ')}`, margin + 3, y);
            doc.setTextColor(0);
            y += 6;

            // Tabela de sessões
            const sessionTableData = disc.sessions.map(session => {
                const date = formatDate(session.scheduled_date);
                const time = session.scheduled_time.slice(0, 5);
                const duration = `${session.duration_minutes} min`;
                const status = translateStatus(session.status);

                return [date, time, duration, status];
            });

            autoTable(doc, {
                startY: y,
                head: [['Data', 'Horário', 'Duração', 'Status']],
                body: sessionTableData,
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [220, 220, 220],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [250, 250, 250],
                    textColor: [80, 80, 80],
                    fontStyle: 'bold',
                    fontSize: 8
                },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 20, halign: 'center' },
                    2: { cellWidth: 25, halign: 'center' },
                    3: { cellWidth: contentWidth - 75 }
                },
                margin: { left: margin, right: margin },
                didParseCell: (data) => {
                    // Colorir status
                    if (data.column.index === 3 && data.section === 'body') {
                        const session = disc.sessions[data.row.index];
                        const color = getStatusColor(session.status);
                        data.cell.styles.textColor = color;
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                didDrawPage: (data) => {
                    if (data.pageNumber > pageCount) {
                        pageCount = data.pageNumber;
                    }
                }
            });

            y = doc.lastAutoTable.finalY + 8;
        });

        // ========================================
        // OBSERVAÇÕES
        // ========================================

        y = checkAndAddPage(y, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Observações', margin, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const totalProfessionals = new Set(all_sessions.map(s => s.therapist_name)).size;
        const disciplines = Object.keys(by_discipline).length;

        doc.text(`• Taxa de comparecimento: ${summary.attendance_rate}%`, margin, y);
        y += 5;
        doc.text(`• Profissionais envolvidos: ${totalProfessionals}`, margin, y);
        y += 5;
        doc.text(`• Especialidades: ${disciplines}`, margin, y);
        y += 5;
        doc.text(`• Horas totais de atendimento: ${summary.total_hours}h`, margin, y);

        // ========================================
        // RODAPÉ FINAL
        // ========================================

        addFooter(pageCount);

        // ========================================
        // SALVAR PDF
        // ========================================

        const patientSlug = patient.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateSlug = new Date().toISOString().split('T')[0];
        const filename = `Relatorio_Presencas_${patientSlug}_${dateSlug}.pdf`;

        doc.save(filename);

        return true;

    } catch (error) {
        console.error('Erro ao gerar PDF de presenças:', error);
        alert('Erro ao gerar o PDF. Tente novamente.');
        return false;
    }
};
