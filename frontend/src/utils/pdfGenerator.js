import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';

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
                    const trialsText = `(${program.trials || 'N/A'} tent.)`;
                    const programCell = `${program.title}\n${trialsText}`;
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

export const generateConsolidatedReportPDF = async (patient, reportText) => {
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

        // Controle melhorado de quebra de página
        const checkAndAddPage = (currentY, requiredHeight = 20, forceNewPage = false) => {
            if (forceNewPage || currentY > doc.internal.pageSize.getHeight() - margin - requiredHeight) {
                addFooter(pageCount);
                doc.addPage();
                pageCount++;
                return margin + 10;
            }
            return currentY;
        };
        
        // Função para quebrar texto em múltiplas linhas respeitando limites
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
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Relatório Consolidado - ${patient.name}`, pageWidth / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`ID: ${patient.id}`, margin, y);
        doc.text(`Data do Relatório: ${formatDate(new Date().toISOString())}`, pageWidth - margin, y, { align: 'right' });
        y += 6;

        if (patient.sessionData && patient.sessionData.length > 0) {
            const firstSession = patient.sessionData[0];
            const lastSession = patient.sessionData[patient.sessionData.length - 1];
            if (firstSession && lastSession) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.text(`Período dos dados: de ${formatDate(firstSession.session_date)} a ${formatDate(lastSession.session_date)}`, margin, y);
                y += 5;
            }
        }
        
        y += 4;
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        
        y = checkAndAddPage(y);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Análise e Observações do Terapeuta', margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        // Usa a nova função para controlar quebras de página no texto
        y = addTextWithPageBreaks(reportText || "Nenhuma observação fornecida.", margin, y, contentWidth, 5);
        y += 10;

        // Força nova página para os gráficos se há texto suficiente
        const shouldStartChartsOnNewPage = y > margin + 100; // Se já passou de ~100mm da margem
        if (shouldStartChartsOnNewPage) {
            y = checkAndAddPage(y, 0, true); // Força nova página
        } else {
            y = checkAndAddPage(y, 15);
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Progresso dos Programas Ativos', margin, y);
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
                        const legendItems = [
                            { color: [16, 185, 129], text: 'Independente' },
                            { color: [139, 92, 246], text: 'Verbal' },
                            { color: [245, 158, 11], text: 'Gestual' },
                            { color: [239, 68, 68], text: 'Física Parcial' },
                            { color: [220, 38, 38], text: 'Física Total' }
                        ];
                        
                        // Legenda em duas linhas compactas
                        const itemsPerRow = 3;
                        for (let j = 0; j < legendItems.length; j += itemsPerRow) {
                            let xPos = margin;
                            const rowItems = legendItems.slice(j, j + itemsPerRow);
                            
                            rowItems.forEach((item) => {
                                doc.setFillColor(item.color[0], item.color[1], item.color[2]);
                                doc.circle(xPos + 1, y - 0.5, 1, 'F');
                                doc.setTextColor(0);
                                doc.text(item.text, xPos + 4, y);
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
