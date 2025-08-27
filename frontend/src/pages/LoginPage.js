import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, setPassword, checkUser, acceptTerms } from '../api/authApi';
import TermsModal from '../components/shared/TermsModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBrain, faKey, faUser, faSpinner, faArrowRight, faEye, faEyeSlash,
  faChartLine, faComments, faUsers, faClock, faAward, faHeart,
  faLightbulb, faRocket, faShieldAlt, faGraduationCap, faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

// Componente de animação de fundo modernizado
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
    
    {/* Elementos geométricos animados */}
    <div className="absolute inset-0">
      {/* Círculos flutuantes */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-blue-400/10 rounded-full blur-lg animate-bounce" style={{animationDuration: '3s'}}></div>
      <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-purple-400/10 rounded-full blur-md animate-ping" style={{animationDuration: '2s'}}></div>
      
      {/* Formas geométricas */}
      <div className="absolute top-20 right-20 w-20 h-20 border border-white/10 rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
      <div className="absolute bottom-20 left-20 w-16 h-16 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 transform rotate-12 animate-pulse"></div>
    </div>

    {/* Ondas animadas */}
    <div className="absolute bottom-0 left-0 w-full h-32">
      <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M0,60 C300,100 900,20 1200,60 L1200,120 L0,120 Z" 
              fill="rgba(255,255,255,0.05)" 
              className="animate-pulse">
          <animate attributeName="d" 
                   dur="10s" 
                   repeatCount="indefinite"
                   values="M0,60 C300,100 900,20 1200,60 L1200,120 L0,120 Z;
                           M0,80 C300,40 900,80 1200,40 L1200,120 L0,120 Z;
                           M0,60 C300,100 900,20 1200,60 L1200,120 L0,120 Z"/>
        </path>
      </svg>
    </div>
  </div>
);

// Componente do carrossel de benefícios
const BenefitCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      icon: faChartLine,
      title: "Progresso Visível em Tempo Real",
      description: "Gráficos interativos que mostram a evolução de cada criança",
      visual: (
        <div className="flex space-x-2 items-end justify-center h-16">
          <div className="w-3 bg-cyan-400 rounded-t animate-pulse" style={{height: '20%', animationDelay: '0s'}}></div>
          <div className="w-3 bg-blue-400 rounded-t animate-pulse" style={{height: '40%', animationDelay: '0.2s'}}></div>
          <div className="w-3 bg-indigo-400 rounded-t animate-pulse" style={{height: '60%', animationDelay: '0.4s'}}></div>
          <div className="w-3 bg-purple-400 rounded-t animate-pulse" style={{height: '80%', animationDelay: '0.6s'}}></div>
          <div className="w-3 bg-pink-400 rounded-t animate-pulse" style={{height: '100%', animationDelay: '0.8s'}}></div>
        </div>
      )
    },
    {
      icon: faComments,
      title: "Equipe e Pais Conectados",
      description: "Comunicação instantânea com sistema de menções inteligente",
      visual: (
        <div className="flex justify-center items-center space-x-4">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full animate-ping"></div>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
        </div>
      )
    },
    {
      icon: faLightbulb,
      title: "Decisões Baseadas em Dados",
      description: "Insights precisos para otimizar as intervenções terapêuticas",
      visual: (
        <div className="relative flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-yellow-400/30 rounded-full animate-spin" style={{animationDuration: '3s'}}>
            <div className="absolute inset-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faLightbulb} className="text-yellow-300 text-xl animate-pulse" />
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-48 flex flex-col items-center justify-center text-center">
      <div className="mb-6">
        {slides[currentSlide].visual}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-3">
          <FontAwesomeIcon icon={slides[currentSlide].icon} className="text-cyan-400 text-xl" />
          <h3 className="text-xl font-bold text-white">{slides[currentSlide].title}</h3>
        </div>
        <p className="text-blue-100 text-sm max-w-xs leading-relaxed">
          {slides[currentSlide].description}
        </p>
      </div>

      {/* Indicadores do carrossel */}
      <div className="flex space-x-2 mt-6">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-cyan-400 w-6' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

// Componente de estatísticas animadas
const AnimatedStats = () => {
  const [stats, setStats] = useState({
    sessions: 0,
    therapists: 0,
    improvement: 0
  });

  const targetStats = {
    sessions: 15247,
    therapists: 284,
    improvement: 87
  };

  useEffect(() => {
    const duration = 2000; // 2 segundos
    const steps = 60;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      setStats(prev => ({
        sessions: Math.min(prev.sessions + Math.ceil(targetStats.sessions / steps), targetStats.sessions),
        therapists: Math.min(prev.therapists + Math.ceil(targetStats.therapists / steps), targetStats.therapists),
        improvement: Math.min(prev.improvement + Math.ceil(targetStats.improvement / steps), targetStats.improvement)
      }));
    }, stepDuration);

    setTimeout(() => clearInterval(timer), duration);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-blue-100 text-sm">
          <span className="font-bold text-white">+{stats.sessions.toLocaleString()}</span> sessões registradas este mês
        </span>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <span className="text-blue-100 text-sm">
          <span className="font-bold text-white">+{stats.therapists}</span> terapeutas ativos hoje
        </span>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <span className="text-blue-100 text-sm">
          <span className="font-bold text-white">{stats.improvement}%</span> das crianças mostram melhoria em 30 dias
        </span>
      </div>
    </div>
  );
};

// Componente principal
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPasswordState] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState('enter_username');
  const [userForPasswordSet, setUserForPasswordSet] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para modal de termos
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const data = await checkUser(username);
      
      if (data.action === 'SET_PASSWORD') {
        setUserForPasswordSet(data.user);
        setView('set_password');
      } else if (data.action === 'REQUIRE_PASSWORD') {
        setView('enter_password');
      }
    } catch (err) {
      console.error("Erro em handleUsernameSubmit:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await loginUser({ username, password });
      
      // Verificar se é admin que precisa aceitar termos
      if (data.user && data.user.is_admin && !data.user.terms_accepted_at) {
        // Admin precisa aceitar termos antes de continuar
        setPendingLoginData(data);
        setShowTermsModal(true);
        setIsLoading(false);
        return;
      }
      
      // Login normal - fazer login e redirecionar
      login(data.token);
      
      let redirectPath = '/';
      if (data.user && data.user.role) {
        const userRole = data.user.role.toLowerCase();
        switch (userRole) {
          case 'admin':
          case 'therapist':
            redirectPath = '/dashboard';
            break;
          case 'pai':
            redirectPath = '/parent-dashboard';
            break;
          default:
            redirectPath = '/';
            break;
        }
      }
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error("Erro em handleLoginSubmit:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const data = await setPassword(userForPasswordSet.userId, newPassword);
      
      if (data && data.token) {
        // Verificar se é admin que precisa aceitar termos
        if (data.user && data.user.is_admin && !data.user.terms_accepted_at) {
          // Admin precisa aceitar termos antes de continuar
          setPendingLoginData(data);
          setShowTermsModal(true);
          setIsLoading(false);
          return;
        }
        
        // Login normal - fazer login e redirecionar
        login(data.token);
        let redirectPath = '/';
        if (data.user && data.user.role) {
          const userRole = data.user.role.toLowerCase();
          switch (userRole) {
            case 'admin':
            case 'therapist':
              redirectPath = '/dashboard';
              break;
            case 'pai':
              redirectPath = '/parent-dashboard';
              break;
            default:
              redirectPath = '/';
              break;
          }
        }
        navigate(redirectPath, { replace: true });
      } else {
        setError("Não foi possível fazer o login automático. Por favor, tente novamente.");
        setView('enter_username');
      }
    } catch (err) {
      setError(err?.message || "Ocorreu um erro desconhecido ao definir a senha.");
    } finally {
      setIsLoading(false);
    }
  };

  // Funções para lidar com o modal de termos
  const handleAcceptTerms = async () => {
    if (!pendingLoginData) return;
    
    try {
      await acceptTerms(pendingLoginData.user.id);
      
      // Fazer login e redirecionar após aceitar termos
      login(pendingLoginData.token);
      
      let redirectPath = '/';
      if (pendingLoginData.user && pendingLoginData.user.role) {
        const userRole = pendingLoginData.user.role.toLowerCase();
        switch (userRole) {
          case 'admin':
          case 'therapist':
            redirectPath = '/dashboard';
            break;
          case 'pai':
            redirectPath = '/parent-dashboard';
            break;
          default:
            redirectPath = '/';
            break;
        }
      }
      
      setShowTermsModal(false);
      setPendingLoginData(null);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
      setError('Erro ao processar aceitação dos termos. Tente novamente.');
      setShowTermsModal(false);
      setPendingLoginData(null);
    }
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setPendingLoginData(null);
    setError('É necessário aceitar os termos para continuar.');
  };

  const renderFormContent = () => {
    const baseInputClasses = "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-300 font-medium";
    const baseButtonClasses = "w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5";

    switch(view) {
      case 'enter_password':
        return (
          <form onSubmit={handleLoginSubmit} className="space-y-8">
            <div className="text-left">
              <button 
                type="button" 
                onClick={() => { setView('enter_username'); setError(''); }} 
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                <FontAwesomeIcon icon={faArrowRight} className="rotate-180" />
                <span>Voltar para utilizador</span>
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Utilizador</label>
                  <p className="font-bold text-xl text-gray-800">{username}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Senha de Acesso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faKey} className="text-gray-400" />
                </div>
                <input 
                  id="password" 
                  name="password" 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  autoFocus 
                  value={password} 
                  onChange={(e) => setPasswordState(e.target.value)} 
                  className={baseInputClasses}
                  placeholder="Digite sua senha"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={isLoading} className={baseButtonClasses}>
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-3" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <FontAwesomeIcon icon={faArrowRight} className="ml-3" />
                </>
              )}
            </button>
          </form>
        );
        
      case 'set_password':
        return (
          <form onSubmit={handleSetPasswordSubmit} className="space-y-8">
            <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faGraduationCap} className="text-white text-xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Bem-vindo(a), {userForPasswordSet?.fullName || userForPasswordSet?.username}!
              </h2>
              <p className="text-gray-600">
                Este é o seu primeiro acesso. Vamos criar uma senha segura para proteger sua conta.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700">Nova Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faKey} className="text-gray-400" />
                  </div>
                  <input 
                    id="newPassword" 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    autoFocus 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className={baseInputClasses}
                    placeholder="Crie uma senha segura"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">Confirmar Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faShieldAlt} className="text-gray-400" />
                  </div>
                  <input 
                    id="confirmPassword" 
                    type="password" 
                    required 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className={baseInputClasses}
                    placeholder="Confirme sua senha"
                  />
                </div>
              </div>
            </div>
            
            <button type="submit" disabled={isLoading} className={baseButtonClasses}>
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-3" />
                  <span>Configurando...</span>
                </>
              ) : (
                <>
                  <span>Definir Senha e Entrar</span>
                  <FontAwesomeIcon icon={faRocket} className="ml-3" />
                </>
              )}
            </button>
          </form>
        );
        
      case 'enter_username':
      default:
        return (
          <form onSubmit={handleUsernameSubmit} className="space-y-8">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700">Utilizador ou Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                </div>
                <input 
                  id="username" 
                  name="username" 
                  type="text" 
                  required 
                  autoFocus 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className={baseInputClasses}
                  placeholder="Digite seu utilizador ou email"
                />
              </div>
            </div>
            
            <button type="submit" disabled={isLoading} className={baseButtonClasses}>
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-3" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Continuar</span>
                  <FontAwesomeIcon icon={faArrowRight} className="ml-3" />
                </>
              )}
            </button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden lg:grid lg:grid-cols-5 border border-gray-100">
          
          {/* Painel Esquerdo - Vitrine Interativa */}
          <div className="relative hidden lg:block lg:col-span-3">
            <AnimatedBackground />
            
            <div className="relative z-10 p-12 flex flex-col justify-between h-full min-h-[700px]">
              {/* Header */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faBrain} className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-wide">ABAplay</h1>
                    <p className="text-blue-200 text-sm">Transformando Vidas através da Ciência</p>
                  </div>
                </div>
              </div>

              {/* Carrossel Principal */}
              <div className="flex-1 flex items-center justify-center">
                <BenefitCarousel />
              </div>

              {/* Estatísticas */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
                <h3 className="text-white font-semibold mb-4 text-center">Atividade em Tempo Real</h3>
                <AnimatedStats />
              </div>

              {/* Footer */}
              <div className="text-center">
                <p className="text-blue-200 text-sm mb-3">Usado por clínicas líderes em intervenção infantil</p>
                <div className="flex items-center justify-center space-x-6 opacity-60">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faAward} className="text-white text-sm" />
                  </div>
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faHeart} className="text-white text-sm" />
                  </div>
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faShieldAlt} className="text-white text-sm" />
                  </div>
                </div>
                <p className="text-blue-300 text-xs mt-4">
                  &copy; {new Date().getFullYear()} ABAplay. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>

          {/* Painel Direito - Formulário de Login Modernizado */}
          <div className="lg:col-span-2 p-8 lg:p-12 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">
              
              {/* Header Mobile */}
              <div className="text-center mb-10 lg:hidden">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={faBrain} className="text-2xl text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Bem-vindo à ABAplay</h1>
                <p className="text-gray-600">Sua plataforma de intervenção infantil</p>
              </div>

              {/* Header Desktop */}
              <div className="hidden lg:block text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  {view === 'enter_username' && 'Bem-vindo de volta'}
                  {view === 'enter_password' && 'Quase lá!'}
                  {view === 'set_password' && 'Primeiro Acesso'}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {view === 'enter_username' && 'Acesse sua conta e continue transformando vidas'}
                  {view === 'enter_password' && 'Digite sua senha para acessar a plataforma'}
                  {view === 'set_password' && 'Configure sua conta para começar'}
                </p>
              </div>
              
              {/* Mensagem de Erro */}
              {error && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}
              
              {/* Formulário */}
              <div className="space-y-6">
                {renderFormContent()}
              </div>

              {/* Footer Links */}
              <div className="mt-8 text-center space-y-4">
                <p className="text-sm text-gray-500">
                  Primeira vez na plataforma?{' '}
                  <a 
                    href="mailto:abaplayoficial@gmail.com?subject=Solicitar Acesso - ABAplay"
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Solicite seu acesso
                  </a>
                </p>
                
                {/* Seção de Suporte */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Problemas com o acesso?
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {/* Email de Suporte */}
                    <a
                      href="mailto:abaplayoficial@gmail.com?subject=Suporte - Problema de Acesso"
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-gray-700 hover:text-blue-700 group"
                    >
                      <FontAwesomeIcon 
                        icon={faEnvelope} 
                        className="text-gray-500 group-hover:text-blue-600 transition-colors" 
                      />
                      <span className="text-sm font-medium">Email Suporte</span>
                    </a>
                    
                    {/* WhatsApp */}
                    <a
                      href="https://wa.me/5511988543437?text=Olá! Preciso de ajuda com o acesso à plataforma ABAplay."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md group"
                    >
                      <FontAwesomeIcon 
                        icon={faWhatsapp} 
                        className="text-green-100 group-hover:text-white transition-colors" 
                      />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </a>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-3">
                    <FontAwesomeIcon icon={faEnvelope} className="mr-1" />
                    abaplayoficial@gmail.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Termos de Uso */}
      <TermsModal
        isOpen={showTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
        isLoading={isLoading}
        userInfo={pendingLoginData?.user}
      />
    </div>
  );
};

export default LoginPage;