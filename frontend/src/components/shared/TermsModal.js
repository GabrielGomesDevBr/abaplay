import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faSpinner, faCheckCircle, faScroll, faExclamationTriangle,
  faShieldAlt, faFileContract, faHandshake, faGavel
} from '@fortawesome/free-solid-svg-icons';

const TermsModal = ({ isOpen, onAccept, onDecline, isLoading = false, userInfo = null }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Resetar estado quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      setIsAccepting(false);
    }
  }, [isOpen]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px de margem
    setHasScrolledToBottom(isAtBottom);
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
              <FontAwesomeIcon icon={faFileContract} className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Termos de Serviço</h2>
              <p className="text-gray-600">AbaPlay - Plataforma de Gestão Terapêutica</p>
            </div>
          </div>
          <button
            onClick={onDecline}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="text-gray-500 hover:text-red-600" />
          </button>
        </div>

        {/* Welcome Message */}
        {userInfo && (
          <div className="p-6 bg-green-50 border-b border-green-100">
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon icon={faHandshake} className="text-green-600 text-xl" />
              <div>
                <p className="text-green-800 font-semibold">
                  Bem-vindo(a), {userInfo.fullName || userInfo.username}!
                </p>
                <p className="text-green-700 text-sm">
                  Para continuar, é necessário aceitar nossos Termos de Serviço.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* Scroll Indicator */}
          {!hasScrolledToBottom && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faScroll} className="text-yellow-600" />
                <p className="text-yellow-800 text-sm font-medium">
                  Por favor, role até o final para ler todos os termos
                </p>
              </div>
            </div>
          )}

          {/* Terms Content */}
          <div 
            className="flex-1 overflow-y-auto p-6 text-gray-700 leading-relaxed"
            onScroll={handleScroll}
          >
            <div className="prose max-w-none">
              
              {/* Header do documento */}
              <div className="text-center mb-8 pb-6 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Termos de Serviço da Plataforma AbaPlay
                </h1>
                <p className="text-gray-600">
                  Última atualização: 27 de agosto de 2025
                </p>
              </div>

              {/* Introdução */}
              <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-100">
                <div className="flex items-start space-x-4">
                  <FontAwesomeIcon icon={faShieldAlt} className="text-blue-600 text-2xl mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">Importante</h3>
                    <p className="text-blue-700">
                      Bem-vindo à AbaPlay! Ao criar uma conta ou utilizar nossa Plataforma, você concorda com estes Termos de Serviço. Leia-os com atenção.
                    </p>
                    <p className="text-blue-700 mt-2">
                      Estes Termos representam os pontos essenciais do nosso acordo. Para consultar o Contrato de Prestação de Serviços na versão integral, por favor, solicite através do nosso e-mail de suporte.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seções dos termos */}
              <div className="space-y-8">
                
                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">1</span>
                    <span>Nossos Serviços</span>
                  </h2>
                  <p>A AbaPlay concede a você uma licença limitada, não exclusiva e intransferível para usar nosso software de gestão de pacientes e terapias ("Plataforma"), em regime de Software como Serviço (SaaS). O objetivo da Plataforma é auxiliar no gerenciamento dos tratamentos de seus pacientes.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">2</span>
                    <span>Acesso e Segurança da Conta</span>
                  </h2>
                  <p>Seu acesso será liberado após a confirmação do primeiro pagamento. Você é o único responsável por todas as atividades em sua conta e pela segurança de suas senhas. A senha do usuário Administrador só poderá ser redefinida mediante solicitação formal ao nosso suporte oficial.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">3</span>
                    <span>Pagamento e Reajuste</span>
                  </h2>
                  <p>O valor mensal do serviço é de R$ 34,90 por paciente contratado. O pagamento deve ser feito na data de vencimento acordada. O atraso implicará em multa de 2% e juros de 1% ao mês. O valor será reajustado anualmente pelo índice IPCA/IBGE.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">4</span>
                    <span>Inadimplência</span>
                  </h2>
                  <p>O acesso à Plataforma será suspenso após 10 dias corridos de atraso no pagamento. Se o atraso persistir por 30 dias corridos, o contrato será rescindido e o acesso cancelado, sem prejuízo da cobrança dos valores devidos.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-sm">5</span>
                    <span>Cancelamento</span>
                  </h2>
                  <p>Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento, bastando nos notificar por e-mail com 30 dias de antecedência. Os serviços continuarão ativos e serão cobrados normalmente durante este período de aviso prévio.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">6</span>
                    <span>Disponibilidade do Serviço (SLA)</span>
                  </h2>
                  <p>Nosso objetivo é manter a Plataforma disponível (uptime) em 99% do tempo. Manutenções programadas serão avisadas com antecedência. A medição do uptime é feita por nossos servidores e exclui fatores externos (como a sua conexão com a internet).</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">7</span>
                    <span>Proteção de Dados (LGPD)</span>
                  </h2>
                  <p>Você, ao utilizar a Plataforma, é o Controlador dos dados de seus pacientes e usuários. A AbaPlay atua como Operadora, processando os dados apenas para o funcionamento do serviço. Você garante que possui a base legal necessária (como o consentimento) para inserir e tratar quaisquer dados pessoais na Plataforma, isentando a AbaPlay de responsabilidade por uso indevido.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm">8</span>
                    <span>Propriedade Intelectual</span>
                  </h2>
                  <p>A Plataforma, seu conteúdo e a marca AbaPlay são de nossa propriedade exclusiva. Você não pode copiar, modificar ou tentar recriar nossa tecnologia.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">9</span>
                    <span>Limitação de Responsabilidade</span>
                  </h2>
                  <p>Nossa responsabilidade total por quaisquer danos ou prejuízos decorrentes do uso da Plataforma está limitada ao valor pago por você nos últimos 3 meses.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 font-bold text-sm">10</span>
                    <span>Portabilidade e Exclusão de Dados</span>
                  </h2>
                  <p>Após o cancelamento, você pode solicitar uma cópia de seus dados em formato CSV, que será fornecida em até 15 dias úteis. Seus dados serão mantidos por 60 dias após o término do contrato e depois serão excluídos permanentemente.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-sm">11</span>
                    <span>Encerramento da Plataforma</span>
                  </h2>
                  <p>Caso a AbaPlay seja descontinuada, notificaremos todos os usuários com no mínimo 60 dias de antecedência, garantindo tempo para a transição e exportação de dados.</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">12</span>
                    <span>Contato e Foro</span>
                  </h2>
                  <p>O canal oficial para comunicações é o e-mail <strong>ABAPLAYOFICIAL@GMAIL.COM</strong>. Fica eleito o foro da Comarca de São Paulo, SP, para resolver quaisquer disputas.</p>
                </section>

              </div>

              {/* Conclusão */}
              <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <div className="flex items-start space-x-4">
                  <FontAwesomeIcon icon={faGavel} className="text-blue-600 text-2xl mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">Concordância</h3>
                    <p className="text-blue-700">
                      Ao clicar em "Aceitar" ou ao continuar usando a Plataforma, você confirma que leu, entendeu e concorda em cumprir estes Termos de Serviço.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-3xl">
          
          {/* Warning when not scrolled */}
          {!hasScrolledToBottom && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600" />
                <p className="text-yellow-800 text-sm font-medium">
                  Você precisa ler todos os termos antes de prosseguir
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onDecline}
              disabled={isLoading}
              className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Não Aceito
            </button>
            
            <button
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || isLoading || isAccepting}
              className={`flex-1 py-3 px-6 font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 ${
                hasScrolledToBottom && !isLoading && !isAccepting
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isAccepting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>Aceito os Termos</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TermsModal;