import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface PersonalInfoFieldsProps {
  data: {
    nome: string;
    sexo: string;
    estadoCivil: string;
    profissao: string;
    endereco: string;
    dataNascimento: string;
    naturalidade: string;
    filiacaoMae: string;
    filiacaoPai: string;
    rg: string;
    cpf: string;
    celular: string;
    email: string;
    laudoPericial: string; // Novo campo: "Sim" ou "Não"
    relato?: string; // For victim and witness testimony
    semCpf?: string; // Flag: "true" se não possui CPF
  };
  onChangeHandler: (index: number | null, field: string, value: string) => void;
  prefix?: string;
  index: number;
  isAuthor?: boolean;
  isVictim?: boolean; // Novo prop para Vítimas
  isWitness?: boolean; // New prop for witnesses
}

const PersonalInfoFields: React.FC<PersonalInfoFieldsProps> = ({
  data,
  onChangeHandler,
  prefix = "",
  index,
  isAuthor = false,
  isVictim = false,
  isWitness = false
}) => {
  const [ageWarning, setAgeWarning] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [cepPessoa, setCepPessoa] = useState<string>("");
  const [cepStatus, setCepStatus] = useState<string>("");

  const buscarEnderecoPessoa = async () => {
    const nums = cepPessoa.replace(/\D/g, "");
    if (nums.length !== 8) {
      setCepStatus("Informe 8 dígitos.");
      return;
    }
    try {
      setCepStatus("Buscando...");
      const resp = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await resp.json();
      if (data?.erro) {
        setCepStatus("CEP não encontrado.");
        return;
      }
      const enderecoBase = [data.logradouro, data.bairro].filter(Boolean).join(", ");
      const cidadeUf = [data.localidade, data.uf].filter(Boolean).join("/");
      const enderecoCompleto = [enderecoBase, cidadeUf].filter(Boolean).join(", ");
      const novoEndereco = enderecoCompleto ? `${enderecoCompleto}${cepPessoa ? `, CEP ${cepPessoa}` : ""}` : data.cep;
      onChangeHandler(index !== undefined ? index : null, 'endereco', novoEndereco);
      setCepStatus(`CEP: ${data.cep} • ${data.logradouro} • ${data.bairro}`);
    } catch {
      setCepStatus("Erro ao buscar CEP.");
    }
  };

  // Format CPF: 000.000.000-00
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // Format phone: (00) 00000-0000
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Validate CPF
  const validateCPF = (cpf: string) => {
    const stripped = cpf.replace(/\D/g, '');

    // Se marcado que não possui CPF, não validar
    if (data.semCpf === 'true') {
      setCpfError(null);
      return;
    }
    
    // For authors, CPF is required
    if (isAuthor && stripped.length === 0) {
      setCpfError('CPF é obrigatório para o autor do fato');
      return;
    }
    
    if (stripped.length > 0 && stripped.length !== 11) {
      setCpfError('CPF deve conter 11 dígitos');
      return;
    }

    // Check for repeated digits (simple validation)
    if (stripped.length === 11 && /^(\d)\1+$/.test(stripped)) {
      setCpfError('CPF inválido');
      return;
    }
    setCpfError(null);
  };

  // Validate phone number
  const validatePhone = (phone: string) => {
    const stripped = phone.replace(/\D/g, '');
    if (stripped.length > 0 && stripped.length !== 11) {
      setPhoneError('Celular deve conter 11 dígitos (com DDD)');
      return;
    }
    setPhoneError(null);
  };

  // Calculate age from birthdate
  useEffect(() => {
    if (data.dataNascimento && isAuthor) {
      const m = data.dataNascimento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) { setAgeWarning(null); return; }
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10) - 1; // 0-based
      const yyyy = parseInt(m[3], 10);
      const birthDate = new Date(yyyy, mm, dd);
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      let days = today.getDate() - birthDate.getDate();
      if (months < 0 || (months === 0 && days < 0)) {
        years--;
        months = months < 0 ? 12 + months : 11;
      }
      if (days < 0) {
        const prevMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        days = prevMonthDays + days;
        months = months - 1;
        if (months < 0) months = 11;
      }
      if (years < 18) {
        setAgeWarning(`ATENÇÃO: O Autor é menor de idade (${years} anos, ${months} meses e ${days} dias). Avalie corretamente se cabe TCO contra esse suspeito.`);
      } else {
        setAgeWarning(null);
      }
    }
  }, [data.dataNascimento, isAuthor]);

  // Validate CPF when component mounts or data changes
  useEffect(() => {
    if (isAuthor) {
      validateCPF(data.cpf);
    }
  }, [data.cpf, isAuthor]);

  return (
    <div className="space-y-4">
      {isAuthor && ageWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            {ageWarning}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}nome_${index}`}>Nome completo *</Label>
          <Input 
            id={`${prefix}nome_${index}`} 
            value={data.nome} 
            onChange={e => onChangeHandler(index !== undefined ? index : null, 'nome', e.target.value)} 
          />
        </div>
        
        <div>
          <Label htmlFor={`${prefix}sexo_${index}`}>Sexo</Label>
          <Select 
            value={data.sexo || ""} 
            onValueChange={value => onChangeHandler(index !== undefined ? index : null, 'sexo', value)}
          >
            <SelectTrigger id={`${prefix}sexo_${index}`}>
              <SelectValue placeholder="Selecione o sexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MASCULINO">Masculino</SelectItem>
              <SelectItem value="FEMININO">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}estadoCivil_${index}`}>Estado Civil</Label>
          <Select value={data.estadoCivil || ""} onValueChange={value => onChangeHandler(index !== undefined ? index : null, 'estadoCivil', value)}>
            <SelectTrigger id={`${prefix}estadoCivil_${index}`}>
              <SelectValue placeholder="Selecione o estado civil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOLTEIRO">Solteiro</SelectItem>
              <SelectItem value="UNIÃO ESTÁVEL">União Estável</SelectItem>
              <SelectItem value="CASADO">Casado</SelectItem>
              <SelectItem value="DIVORCIADO">Divorciado</SelectItem>
              <SelectItem value="VIÚVO">Viúvo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor={`${prefix}profissao_${index}`}>Profissão</Label>
          <Input id={`${prefix}profissao_${index}`} value={data.profissao} onChange={e => onChangeHandler(index !== undefined ? index : null, 'profissao', e.target.value)} />
        </div>
      </div>

      <div className="two-columns cep-address">
        <div>
          <Label>Buscar por CEP</Label>
          <div className="input-row">
            <Input
              className="cep-input"
              placeholder="Ex: 78118-007"
              inputMode="numeric"
              value={cepPessoa}
              onChange={e => {
                const nums = e.target.value.replace(/\D/g, '').slice(0,8);
                const masked = nums.length > 5 ? `${nums.slice(0,5)}-${nums.slice(5)}` : nums;
                setCepPessoa(masked);
              }}
              onKeyDown={e => { if (e.key === 'Enter') buscarEnderecoPessoa(); }}
            />
            <button type="button" className="icon-button" onClick={buscarEnderecoPessoa} aria-label="Buscar CEP"><i className="fas fa-search"></i></button>
          </div>
          {cepStatus && <small className="field-hint">{cepStatus}</small>}
        </div>

        <div>
          <Label htmlFor={`${prefix}endereco_${index}`}>Endereço</Label>
          <Input 
            id={`${prefix}endereco_${index}`} 
            placeholder="Ex: Rua, n°, Quadra, Bairro, Lote, Coordenadas..." 
            value={data.endereco} 
            onChange={e => onChangeHandler(index !== undefined ? index : null, 'endereco', e.target.value)} 
          />
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}dataNascimento_${index}`}>Data de Nascimento</Label>
          <Input id={`${prefix}dataNascimento_${index}`} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={data.dataNascimento} onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0,8);
            const dd = v.slice(0,2);
            const mm = v.slice(2,4);
            const yyyy = v.slice(4,8);
            const formatted = [dd, mm, yyyy].filter(Boolean).join('/');
            onChangeHandler(index !== undefined ? index : null, 'dataNascimento', formatted);
          }} />
        </div>
        
        <div>
          <Label htmlFor={`${prefix}naturalidade_${index}`}>Naturalidade</Label>
          <Input id={`${prefix}naturalidade_${index}`} placeholder="Município" value={data.naturalidade} onChange={e => onChangeHandler(index !== undefined ? index : null, 'naturalidade', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}filiacaoMae_${index}`}>Filiação - Mãe</Label>
          <Input id={`${prefix}filiacaoMae_${index}`} placeholder="Nome Completo" value={data.filiacaoMae} onChange={e => onChangeHandler(index !== undefined ? index : null, 'filiacaoMae', e.target.value)} />
        </div>
        
        <div>
          <Label htmlFor={`${prefix}filiacaoPai_${index}`}>Filiação - Pai</Label>
          <Input id={`${prefix}filiacaoPai_${index}`} placeholder="Nome Completo" value={data.filiacaoPai} onChange={e => onChangeHandler(index !== undefined ? index : null, 'filiacaoPai', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}rg_${index}`}>RG ou Documento</Label>
          <Input 
            id={`${prefix}rg_${index}`} 
            placeholder="RG 00000000 UF" 
            value={data.rg} 
            onChange={e => onChangeHandler(index !== undefined ? index : null, 'rg', e.target.value)} 
          />
        </div>
        
        <div>
          <Label htmlFor={`${prefix}cpf_${index}`}>
            CPF {isAuthor && <span className="text-red-500">*</span>}
          </Label>
          <Input 
            id={`${prefix}cpf_${index}`} 
            placeholder="000.000.000-00" 
            value={data.cpf} 
            onChange={e => {
              const formatted = formatCPF(e.target.value);
              onChangeHandler(index !== undefined ? index : null, 'cpf', formatted);
            }} 
            onBlur={() => validateCPF(data.cpf)}
            className={cpfError ? "border-red-500" : ""}
            required={isAuthor && data.semCpf !== 'true'}
            disabled={data.semCpf === 'true'}
          />
          {cpfError && <p className="text-red-500 text-xs mt-1">{cpfError}</p>}
          <div className="mt-2 flex items-center gap-2">
            <Checkbox
              id={`${prefix}semcpf_${index}`}
              checked={data.semCpf === 'true'}
              onCheckedChange={(checked) => {
                const flag = checked ? 'true' : 'false';
                onChangeHandler(index !== undefined ? index : null, 'semCpf', flag);
                if (checked) {
                  onChangeHandler(index !== undefined ? index : null, 'cpf', '');
                  setCpfError(null);
                } else {
                  validateCPF(data.cpf);
                }
              }}
            />
            <Label htmlFor={`${prefix}semcpf_${index}`} className="text-xs">Não possui CPF</Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}celular_${index}`}>Celular</Label>
          <Input id={`${prefix}celular_${index}`} placeholder="(65) 90000-0000" value={data.celular} onChange={e => {
          const formatted = formatPhone(e.target.value);
          onChangeHandler(index !== undefined ? index : null, 'celular', formatted);
        }} onBlur={() => validatePhone(data.celular)} />
          {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
        </div>
        
        <div>
          <Label htmlFor={`${prefix}email_${index}`}>E-mail</Label>
          <Input id={`${prefix}email_${index}`} type="email" placeholder="contato@exemplo.com" value={data.email} onChange={e => onChangeHandler(index !== undefined ? index : null, 'email', e.target.value)} />
        </div>
      </div>

      {(isAuthor || isVictim) && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${prefix}laudoPericial_${index}`}>Solicitar Corpo de Delito?</Label>
            <Select value={data.laudoPericial || "Não"} onValueChange={value => onChangeHandler(index !== undefined ? index : null, 'laudoPericial', value)}>
              <SelectTrigger id={`${prefix}laudoPericial_${index}`}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>}
    </div>
  );
};

export default PersonalInfoFields;
