// Importa o Model que interage com o banco de dados.
const CaseDiscussion = require('../models/caseDiscussionModel');

// O objeto controller agrupa os métodos que lidam com as requisições.
const caseDiscussionController = {};

/**
 * Lida com a requisição para buscar todas as mensagens de um paciente.
 * @param {object} req - O objeto de requisição do Express.
 * @param {object} res - O objeto de resposta do Express.
 */
caseDiscussionController.getMessagesByPatient = async (req, res) => {
  try {
    // O ID do paciente é pego dos parâmetros da URL (ex: /api/discussions/patient/123).
    const { patientId } = req.params;

    // Usa o Model para buscar as mensagens no banco de dados.
    const messages = await CaseDiscussion.findByPatientId(patientId);

    // Retorna as mensagens encontradas com status 200 (OK).
    res.status(200).json(messages);
  } catch (error) {
    // Em caso de erro no servidor, loga o erro e retorna uma resposta genérica.
    console.error('Erro ao buscar mensagens da discussão:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Lida com a requisição para criar uma nova mensagem na discussão.
 * @param {object} req - O objeto de requisição do Express.
 * @param {object} res - O objeto de resposta do Express.
 */
caseDiscussionController.createMessage = async (req, res) => {
  try {
    // O ID do paciente vem dos parâmetros da URL.
    const { patientId } = req.params;
    // O conteúdo da mensagem vem do corpo da requisição.
    const { content } = req.body;
    // O ID do usuário vem do token JWT, que foi decodificado pelo middleware 'verifyToken'.
    const userId = req.user.id;

    // Validação simples para garantir que o conteúdo não está vazio.
    if (!content) {
      return res.status(400).json({ errors: [{ msg: 'O conteúdo da mensagem não pode ser vazio.' }] });
    }

    // Usa o Model para criar a nova mensagem no banco de dados.
    const newMessage = await CaseDiscussion.create(patientId, userId, content);

    // Para uma melhor experiência no frontend, a resposta inclui o nome do usuário.
    // O `req.user` já tem o nome, então podemos adicioná-lo ao objeto de resposta.
    const responseMessage = {
      ...newMessage,
      user_name: req.user.name
    };

    // Retorna a mensagem recém-criada com status 201 (Created).
    res.status(201).json(responseMessage);
  } catch (error) {
    // Em caso de erro no servidor, loga o erro e retorna uma resposta genérica.
    console.error('Erro ao criar mensagem de discussão:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

// Exporta o controller para ser usado no arquivo de rotas.
module.exports = caseDiscussionController;
