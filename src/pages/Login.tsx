import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Lock, Loader2, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailInput = email.toLowerCase().trim();
    const passInput = senha.trim();

    if (!emailInput || !passInput) {
      toast.error('Preencha Email e Senha.');
      return;
    }

    setLoading(true);
    try {
      // First try to find the user by email to give better error messages
      // and verify if RLS is blocking access
      const { data: userCheck, error: userError } = await supabase
        .from('militares' as any)
        .select('email')
        .eq('email', emailInput.trim())
        .limit(1);

      if (userError) throw userError;

      if (!userCheck || userCheck.length === 0) {
        // If we can't find the email, it's either invalid email OR RLS blocking
        console.warn("User not found or RLS blocking access");
        toast.error('Email não encontrado ou erro de permissão. Contate o administrador.');
        setLoading(false);
        return;
      }

      // If email exists, check password
      const { data, error } = await supabase
        .from('militares' as any)
        .select('rgpm, email, senha')
        .eq('email', emailInput.trim())
        .eq('senha', passInput.trim())
        .limit(1);

      if (error) throw error;

      const rows = data as any[];
      const row = rows && rows[0];
      if (!row) {
        toast.error('Senha incorreta.');
        setLoading(false);
        return;
      }

      // Buscar nivel_acesso real da tabela usuarios_login
      let nivelClient = 'Padrão';
      try {
        const { data: loginData } = await supabase
          .from('usuarios_login' as any)
          .select('nivel_acesso')
          .eq('rgpm', row.rgpm)
          .limit(1);
        const loginRow = loginData && (loginData as any[])[0];
        if (loginRow?.nivel_acesso) {
          nivelClient = loginRow.nivel_acesso;
        }
      } catch {}

      sessionStorage.setItem('rgpm', row.rgpm);
      sessionStorage.setItem('nivel_acesso', nivelClient);
      sessionStorage.setItem('email', row.email);
      
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
