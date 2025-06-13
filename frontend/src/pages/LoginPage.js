import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, setPassword, checkUser } from '../api/authApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faKey, faUser, faSpinner, faArrowRight, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

// Adicionamos um componente de estilo para o fundo animado, mantendo o JSX limpo.
const AnimatedBackground = () => (
  <div className="absolute inset-0 w-full h-full bg-indigo-800 overflow-hidden">
    <div className="lines">
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
    </div>
  </div>
);

// Adicionamos o CSS diretamente no componente para encapsulamento.
const LoginStyles = () => (
    <style>{`
        .lines {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            margin: auto;
            width: 100%;
        }

        .line {
            position: absolute;
            width: 1px;
            height: 100%;
            top: 0;
            left: 50%;
            background: rgba(255, 255, 255, 0.1);
            overflow: hidden;
        }

        .line::after {
            content: '';
            display: block;
            position: absolute;
            height: 15vh;
            width: 100%;
            top: -50%;
            left: 0;
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, #ffffff 75%, #ffffff 100%);
            animation: drop 7s 0s infinite;
            animation-fill-mode: forwards;
            animation-timing-function: cubic-bezier(0.4, 0.26, 0, 0.97);
        }

        .line:nth-child(1) {
            margin-left: -25%;
        }
        .line:nth-child(1)::after {
            animation-delay: 2s;
        }

        .line:nth-child(3) {
            margin-left: 25%;
        }
        .line:nth-child(3)::after {
            animation-delay: 2.5s;
        }

        .line:nth-child(4) {
            margin-left: -40%;
        }
        .line:nth-child(4)::after {
            animation-delay: 4s;
        }

        .line:nth-child(5) {
            margin-left: 40%;
        }
        .line:nth-child(5)::after {
            animation-delay: 5.5s;
        }

        @keyframes drop {
            0% {
                top: -50%;
            }
            100% {
                top: 110%;
            }
        }
    `}</style>
);


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

  // A sua lógica funcional para lidar com os envios dos formulários foi mantida na íntegra.
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
        console.error("Erro ao verificar utilizador:", err.message);
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
      } else {
        redirectPath = '/';
      }
      
      navigate(redirectPath, { replace: true });

    } catch (err) {
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
        } else {
          redirectPath = '/';
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


  const renderFormContent = () => {
    switch(view) {
        case 'enter_password':
            return (
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="text-left mb-4">
                        <button type="button" onClick={() => { setView('enter_username'); setError(''); }} className="text-sm text-indigo-500 hover:text-indigo-700 font-medium">← Voltar para utilizador</button>
                    </div>
                     <div className="pb-4 border-b border-gray-200">
                        <label className="block text-sm font-medium text-gray-500">Utilizador</label>
                        <p className="font-semibold text-lg text-gray-800 mt-1">{username}</p>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
                        <div className="mt-1 relative">
                            <FontAwesomeIcon icon={faKey} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input id="password" name="password" type={showPassword ? 'text' : 'password'} required autoFocus value={password} onChange={(e) => setPasswordState(e.target.value)} className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600">
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-300">
                            {isLoading ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Entrar'}
                        </button>
                    </div>
                </form>
            );
        case 'set_password':
             return (
                <form onSubmit={handleSetPasswordSubmit} className="space-y-5">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-800">Bem-vindo(a), {userForPasswordSet.fullName || userForPasswordSet.username}!</h2>
                        <p className="text-sm text-gray-600 mt-1">Este é o seu primeiro acesso. Por favor, defina uma senha segura.</p>
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                         <div className="mt-1 relative">
                            <FontAwesomeIcon icon={faKey} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input id="newPassword" type={showPassword ? 'text' : 'password'} required autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600">
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                        <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-300">
                            {isLoading ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Definir Senha e Entrar'}
                        </button>
                    </div>
                </form>
            );
        case 'enter_username':
        default:
            return (
                <form onSubmit={handleUsernameSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">Utilizador ou Email</label>
                        <div className="mt-1 relative">
                           <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                           <input id="username" name="username" type="text" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} className="appearance-none block w-full pl-10 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-300">
                           {isLoading ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <>Continuar <FontAwesomeIcon icon={faArrowRight} className="ml-2" /></>}
                        </button>
                    </div>
                </form>
            );
    }
  };

  return (
    <>
      <LoginStyles />
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden md:grid md:grid-cols-2">
            
            {/* Painel Esquerdo: Identidade da Marca com Animação */}
            <div className="relative hidden md:block">
               <AnimatedBackground />
               <div className="relative p-10 flex flex-col justify-between h-full text-center">
                  <div className="text-white text-2xl font-bold flex items-center justify-center">
                      <FontAwesomeIcon icon={faBrain} className="mr-3" />
                      ABAplay
                  </div>
                  <div className="text-white">
                      <h2 className="text-4xl font-extrabold tracking-tight drop-shadow-lg">Potencializando a Intervenção Infantil.</h2>
                      <p className="mt-4 text-lg text-indigo-200 drop-shadow-md">A sua ferramenta de precisão para registro, análise e acompanhamento de progresso terapêutico.</p>
                  </div>
                  <div className="text-sm text-indigo-300">
                      &copy; {new Date().getFullYear()} ABAplay. Todos os direitos reservados.
                  </div>
               </div>
            </div>

            {/* Painel Direito: Formulário de Login */}
            <div className="p-8 sm:p-12 flex flex-col justify-center">
              <div>
                  <div className="mb-8 text-center md:hidden">
                      <FontAwesomeIcon icon={faBrain} className="mx-auto h-10 w-auto text-indigo-600" />
                      <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Bem-vindo(a) à ABAplay</h1>
                  </div>
                  
                  {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm transition-all">{error}</div>}
                  
                  {renderFormContent()}

                  <p className="mt-6 text-center text-xs text-gray-500">
                      Problemas com o acesso? <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Contacte o suporte</a>
                  </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
