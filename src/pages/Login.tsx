import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [rgpm, setRgpm] = useState('');
  const [senha, setSenha] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('rgpm');
    if (saved) {
      setRgpm(saved);
      setRemember(true);
    }
  }, []);

  const usuariosValidos: Record<string, string> = {
    '123456': '123456',
    '000001': 'admin',
    '987654': 'senha123'
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rgpm || !senha) {
      setError('Preencha RGPM e senha.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const ok = usuariosValidos[rgpm] === senha;
      if (ok) {
        if (remember) {
          localStorage.setItem('rgpm', rgpm);
        } else {
          sessionStorage.setItem('rgpm', rgpm);
        }
        navigate('/');
      } else {
        setError('RGPM ou senha incorretos.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-page-root">
      <div className="login-container">
        <div className="login-header">
          <div className="logo"><i className="fas fa-shield-alt" /></div>
          <h1 className="login-title">SimplificaTCO</h1>
          <p className="login-subtitle">Termo Circunstanciado de Ocorrência</p>
        </div>
        <div className="login-body">
          <form onSubmit={onSubmit}>
            <div className="login-form-group">
              <label htmlFor="rgpm">RGPM</label>
              <div className="input-wrapper">
                <i className="fas fa-id-badge" />
                <input type="text" id="rgpm" placeholder="000000" value={rgpm} onChange={e => setRgpm(e.target.value)} />
              </div>
            </div>
            <div className="login-form-group">
              <label htmlFor="senha">Senha</label>
              <div className="input-wrapper">
                <i className="fas fa-lock" />
                <input type="password" id="senha" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} />
              </div>
              {error && <div className="error-message">{error}</div>}
            </div>
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                Lembrar-me
              </label>
            </div>
            <button type="submit" className={`btn-login${loading ? ' loading' : ''}`}>
              <span>{loading ? 'Entrando...' : 'Entrar'}</span>
              {loading ? <i className="fas fa-spinner" /> : <i className="fas fa-arrow-right" />}
            </button>
          </form>
        </div>
        <div className="login-footer">© 2025 - Todos os direitos reservados</div>
      </div>
    </div>
  );
};

export default Login;