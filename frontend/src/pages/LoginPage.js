// frontend/src/pages/LoginPage.js

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, setPassword, checkUser } from '../api/authApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faKey, faUser, faSpinner, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPasswordState] = useState(''); // Renomeado para evitar conflito de nomes
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState('enter_username'); // 'enter_username', 'enter_password', 'set_password'
  const [userForPasswordSet, setUserForPasswordSet] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // <<< CORREÇÃO: Removido o estado 'successMessage' que não era utilizado >>>

  // A variável 'from' é mantida para casos genéricos, mas será sobrescrita por regras específicas de role.
  // No entanto, para roles desconhecidas, o fallback será '/' e não 'from'.
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
        console.error("Erro ao verificar utilizador:", err.message); // Log de erro
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

      console.log("Dados de login recebidos:", data);
      
      let redirectPath = '/';

      if (data.user && data.user.role) {
        const userRole = data.user.role.toLowerCase(); 
        console.log("Role do utilizador (normalizada):", userRole);
        switch (userRole) {
          case 'admin':
          case 'therapist':
            redirectPath = '/dashboard'; 
            break;
          case 'pai': // CORRIGIDO: Agora corresponde à string 'pai' vinda do backend
            redirectPath = '/parent-dashboard';
            break;
          default:
            redirectPath = '/';
            console.warn(`Role desconhecida '${data.user.role}'. Redirecionando para a raiz.`);
            break;
        }
      } else {
        console.warn("Role do utilizador não encontrada nos dados de login. Redirecionando para a raiz.");
        redirectPath = '/';
      }
      
      console.log("Redirecionando para:", redirectPath);
      navigate(redirectPath, { replace: true });

    } catch (err) {
      console.error("Erro no login:", err.message);
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

        console.log("Dados de definição de senha recebidos:", data);

        let redirectPath = '/';

        if (data.user && data.user.role) {
          const userRole = data.user.role.toLowerCase();
          console.log("Role do utilizador (normalizada, após definir senha):", userRole);
          switch (userRole) {
            case 'admin':
            case 'therapist':
              redirectPath = '/dashboard';
              break;
            case 'pai': // CORRIGIDO: Agora corresponde à string 'pai' vinda do backend
              redirectPath = '/parent-dashboard';
              break;
            default:
              redirectPath = '/';
              console.warn(`Role desconhecida '${data.user.role}'. Redirecionando para a raiz.`);
              break;
          }
        } else {
          console.warn("Role do utilizador não encontrada nos dados de definição de senha. Redirecionando para a raiz.");
          redirectPath = '/';
        }

        console.log("Redirecionando para (após definir senha):", redirectPath);
        navigate(redirectPath, { replace: true });

      } else {
        setError("Não foi possível fazer o login automático. Por favor, tente novamente.");
        setView('enter_username');
      }
    } catch (err) {
      console.error("Erro ao definir senha:", err?.message || "Ocorreu um erro desconhecido ao definir a senha.");
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
                    <div className="text-left">
                        <button type="button" onClick={() => { setView('enter_username'); setError(''); }} className="text-sm text-indigo-600 hover:underline">Voltar</button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Utilizador</label>
                        <p className="font-semibold text-gray-800 mt-1">{username}</p>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FontAwesomeIcon icon={faKey} className="text-gray-400" /> </div>
                            <input id="password" name="password" type="password" required autoFocus value={password} onChange={(e) => setPasswordState(e.target.value)} className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                            {isLoading ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Entrar'}
                        </button>
                    </div>
                </form>
            );
        case 'set_password':
            return (
                <form onSubmit={handleSetPasswordSubmit} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-bold">Bem-vindo(a), {userForPasswordSet.fullName || userForPasswordSet.username}!</h2>
                        <p className="text-sm text-gray-600 mt-1">Este é o seu primeiro acesso. Por favor, defina uma senha segura.</p>
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                        <input id="newPassword" type="password" required autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                        <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
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
                        <div className="mt-1 relative rounded-md shadow-sm">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <FontAwesomeIcon icon={faUser} className="text-gray-400" /> </div>
                           <input id="username" name="username" type="text" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                           {isLoading ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <>Continuar <FontAwesomeIcon icon={faArrowRight} className="ml-2" /></>}
                        </button>
                    </div>
                </form>
            );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
            <FontAwesomeIcon icon={faBrain} className="mx-auto h-12 w-auto text-indigo-600" />
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">ABAplay</h1>
        </div>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">{error}</div>}
            {/* O successMessage foi removido do JSX para eliminar o warning */}
            {renderFormContent()}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
