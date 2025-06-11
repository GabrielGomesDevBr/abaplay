ABAplay: Plataforma de Intervenção Infantil (SaaS)
O ABAplay é uma aplicação SaaS (Software as a Service) desenvolvida para clínicas de tratamento infantil, com foco em terapias de intervenção baseadas em ABA (Análise do Comportamento Aplicada). A plataforma visa otimizar o gerenciamento de pacientes, atribuição de programas de intervenção, registro de evolução e comunicação entre terapeutas e pais.

Visão Geral da Aplicação
A aplicação é dividida em dois módulos principais:

Backend: Construído com Node.js e Express, utilizando PostgreSQL como banco de dados. Gerencia dados de usuários, clínicas, pacientes, atribuições de programas e sessões de terapia.

Frontend: Desenvolvido com React, oferece interfaces intuitivas para diferentes perfis de usuário, consumindo a API do backend.

Principais Funcionalidades por Perfil:
Administrador:

Cadastro e gerenciamento de clínicas.

Cadastro e gerenciamento de usuários (terapeutas e pais).

Atribuição de pacientes a terapeutas.

Visão consolidada de todos os pacientes e programas.

Terapeuta:

Gerenciamento de pacientes atribuídos.

Atribuição de programas de intervenção para pacientes.

Registro detalhado da evolução das sessões.

Anotações gerais sobre o paciente.

Visualização de gráficos de progresso.

Geração de relatórios consolidados (PDF).

Pais/Responsáveis:

Acesso ao dashboard do(s) filho(s) atribuído(s).

Visualização de anotações feitas pelo terapeuta.

Acompanhamento do progresso da criança através de gráficos de evolução, separados por área de intervenção.

Tecnologias Utilizadas
Frontend:

React.js

Tailwind CSS (para estilização e responsividade)

Chart.js (para gráficos de evolução)

Axios (para requisições HTTP)

React Router DOM (para roteamento)

Backend:

Node.js

Express.js

PostgreSQL (banco de dados)

pg (driver Node.js para PostgreSQL)

JWT (JSON Web Tokens para autenticação)

Bcrypt (para hash de senhas)

Express-validator (para validação de dados)

Configuração e Execução do Projeto
Pré-requisitos
Node.js (versão 14 ou superior)

npm (gerenciador de pacotes do Node.js)

PostgreSQL (servidor de banco de dados)

1. Configuração do Banco de Dados (PostgreSQL)
Crie um banco de dados PostgreSQL para a aplicação.

No diretório backend/src/config/, crie um arquivo .env com as seguintes variáveis de ambiente, substituindo pelos seus dados:

DB_USER=seu_usuario
DB_HOST=seu_host_db
DB_DATABASE=seu_nome_db
DB_PASSWORD=sua_senha_db
DB_PORT=5432
JWT_SECRET=sua_chave_secreta_jwt

Observação: O arquivo .env não está incluído no repositório por conter dados sensíveis. Certifique-se de preenchê-lo corretamente.

2. Configuração e Execução do Backend
No diretório backend/:

npm install
npm start

O servidor backend estará rodando em http://localhost:3000.

3. Configuração e Execução do Frontend
No diretório frontend/:

npm install
npm start

O aplicativo frontend estará rodando em http://localhost:3001.

Melhoras e Refatorações Recentes
Durante o desenvolvimento colaborativo, diversas melhorias e correções foram implementadas para aprimorar a estabilidade e a experiência do usuário:

Redirecionamento Pós-Login: O redirecionamento de usuários após o login agora é consistente e baseado na role (administrador, terapeuta, pai), garantindo que cada perfil acesse a página correta, mesmo em transições rápidas ou após logout/login.

Salvamento de Anotações: O problema de não conseguir salvar anotações na página de notas foi corrigido através do alinhamento do método HTTP (de PUT para PATCH) na requisição do frontend para o backend.

Relatório Consolidado: Como resultado da correção das anotações, os relatórios consolidados (PDF) agora exibem corretamente as anotações feitas pelos terapeutas.

Persistência da Seleção do Cliente: O problema de a página de clientes "recarregar" e perder a seleção do cliente após ações (como atribuição de programa ou registro de sessão) foi resolvido com otimizações no PatientContext. A seleção do paciente agora é mantida, proporcionando uma experiência de usuário mais fluida.

Dashboard de Pais com Gráficos por Área: O dashboard dos pais agora exibe gráficos de evolução do progresso da criança, organizados e agrupados por "áreas" de intervenção (ex: Psicologia, Terapia Ocupacional, Musicoterapia), facilitando a visualização e a compreensão do progresso em diferentes especialidades. Isso foi alcançado garantindo que a informação da area seja corretamente processada e anexada aos dados do programa no ProgramContext.