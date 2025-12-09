import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [rgpm, setRgpm] = useState('');
  const [senha, setSenha] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rgpm');
    if (saved) {
      setRgpm(saved);
      setRemember(true);
    }
  }, []);

  const onlyDigits = (s: string) => s.replace(/\D+/g, '');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rg = onlyDigits(rgpm).slice(0, 12);
    const pass = senha.trim();
    if (!rg || !pass) {
      setError('Preencha RGPM e senha.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios_login' as any)
        .select('rgpm, senha, nivel_acesso')
        .eq('rgpm', rg)
        .eq('senha', pass)
        .limit(1);
      if (error) throw error;
      const row = data && data[0];
      if (!row) {
        setError('RGPM ou senha incorretos.');
        setLoading(false);
        return;
      }
      const nivelDb = String((row as any).nivel_acesso || '').trim();
      if (nivelDb === 'Bloqueado') {
        setError('Perfil bloqueado. Contate o administrador.');
        setLoading(false);
        return;
      }
      const nivelClient = (nivelDb === 'Administrador') ? 'Administrador' : ((nivelDb === 'Padrão' || nivelDb === 'Operacional') ? 'Padrão' : 'Operador');
      if (remember) {
        localStorage.setItem('rgpm', rg);
        localStorage.setItem('nivel_acesso', nivelClient);
      } else {
        sessionStorage.setItem('rgpm', rg);
        sessionStorage.setItem('nivel_acesso', nivelClient);
      }
      navigate('/');
    } catch (err: any) {
      setError(err?.message || String(err));
      setLoading(false);
    }
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
                <input type={showPass ? 'text' : 'password'} id="senha" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} className="pass-input" />
                <button type="button" className="toggle-pass" onClick={() => setShowPass(v => !v)} aria-label="Mostrar/ocultar senha">
                  <i className={showPass ? 'fas fa-eye' : 'fas fa-eye-slash'} />
                </button>
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
