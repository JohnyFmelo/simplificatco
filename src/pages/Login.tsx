import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Loader2, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";

const isMissingUsageDefinedAtColumnError = (error: any) => {
  const message = String(error?.message || '');
  return message.includes('prazo_utilizacao_definido_em') && message.includes('does not exist');
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const hashPassword = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};
const doesPasswordMatch = async (candidate: string, storedPassword?: string | null) => {
  const normalizedCandidate = candidate.trim();
  const normalizedStored = String(storedPassword || '').trim();
  if (!normalizedCandidate || !normalizedStored) return false;
  if (normalizedCandidate === normalizedStored) return true;
  return (await hashPassword(normalizedCandidate)) === normalizedStored;
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailInput = normalizeEmail(email);
    const passInput = senha.trim();

    if (!emailInput || !passInput) {
      toast.error('Preencha Email e Senha.');
      return;
    }

    setLoading(true);
    try {
      let { data: militaryData, error: militaryError } = await supabase
        .from('militares' as any)
        .select('rgpm, email, senha, nome_completo, prazo_utilizacao_ate, prazo_utilizacao_definido_em')
        .eq('email', emailInput)
        .limit(1);

      if (militaryError && isMissingUsageDefinedAtColumnError(militaryError)) {
        const fallback = await supabase
          .from('militares' as any)
          .select('rgpm, email, senha, nome_completo, prazo_utilizacao_ate')
          .eq('email', emailInput)
          .limit(1);
        militaryData = fallback.data;
        militaryError = fallback.error;
      }

      if (militaryError) throw militaryError;

      const { data: loginByEmail, error: loginByEmailError } = await supabase
        .from('usuarios_login' as any)
        .select('rgpm, email, senha, nivel_acesso')
        .eq('email', emailInput)
        .limit(1);

      if (loginByEmailError) throw loginByEmailError;

      const militaryRow = (militaryData as any[] | null)?.[0];
      const loginRowFromEmail = (loginByEmail as any[] | null)?.[0];
      const referenceRgpm = String(militaryRow?.rgpm || loginRowFromEmail?.rgpm || '').trim();

      if (!referenceRgpm) {
        toast.error('Email não encontrado. Contate o administrador.');
        setLoading(false);
        return;
      }

      const militaryPassword = String(militaryRow?.senha || '').trim();
      const loginPassword = String(loginRowFromEmail?.senha || '').trim();
      const passwordMatches =
        await doesPasswordMatch(passInput, militaryPassword) ||
        await doesPasswordMatch(passInput, loginPassword);

      if (!passwordMatches) {
        toast.error('Senha incorreta.');
        setLoading(false);
        return;
      }

      let nivelClient = 'Padrão';
      try {
        const { data: loginData, error: loginDataError } = await supabase
          .from('usuarios_login' as any)
          .select('nivel_acesso')
          .eq('rgpm', referenceRgpm)
          .limit(1);
        if (loginDataError) throw loginDataError;
        const loginRow = loginData && (loginData as any[])[0];
        if (loginRow?.nivel_acesso === 'Bloqueado') {
          toast.error('Seu acesso está bloqueado. Contate o administrador.');
          setLoading(false);
          return;
        }
        if (loginRow?.nivel_acesso) {
          nivelClient = loginRow.nivel_acesso;
        }
        if (militaryRow?.prazo_utilizacao_ate) {
          sessionStorage.setItem('prazo_utilizacao_ate', militaryRow.prazo_utilizacao_ate);
        } else {
          sessionStorage.removeItem('prazo_utilizacao_ate');
        }
        if (militaryRow?.prazo_utilizacao_definido_em) {
          sessionStorage.setItem('prazo_utilizacao_definido_em', militaryRow.prazo_utilizacao_definido_em);
        } else {
          sessionStorage.removeItem('prazo_utilizacao_definido_em');
        }
      } catch {}

      sessionStorage.setItem('rgpm', referenceRgpm);
      sessionStorage.setItem('nivel_acesso', nivelClient);
      sessionStorage.setItem('email', String(militaryRow?.email || loginRowFromEmail?.email || emailInput));
      sessionStorage.setItem('nome_completo', String(militaryRow?.nome_completo || ''));
      
      toast.success('Login realizado com sucesso!');
      navigate('/home');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao realizar login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 flex flex-col items-center text-center pb-2">
          <div className="w-20 h-20 bg-blue-900 rounded-full flex items-center justify-center mb-4 shadow-lg ring-4 ring-blue-100">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">SimplificaTCO</CardTitle>
          <CardDescription className="text-slate-500">
            Termo Circunstanciado de Ocorrência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input 
                  id="email" 
                  type="email"
                  placeholder="seu.email@gmail.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value.toLowerCase())}
                  className="pl-10 border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-slate-700">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input 
                  id="senha" 
                  type={showPass ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={senha} 
                  onChange={e => setSenha(e.target.value)}
                  className="pl-10 pr-10 border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPass ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-6 mt-6 transition-all duration-200 shadow-md hover:shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar no Sistema
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center border-t pt-6 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} - Todos os direitos reservados</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
