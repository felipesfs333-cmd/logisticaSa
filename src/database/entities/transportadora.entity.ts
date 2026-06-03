import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('transportadoras')
export class Transportadora {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @Column({ default: true })
  ativo: boolean;

  // ---- Campos de integracao com a API da transportadora ----

  // URL base da API da transportadora (ex: https://api.quick.com.br)
  @Column({ nullable: true })
  api_url: string;

  // Token / chave de autenticacao na API da transportadora
  @Column({ nullable: true })
  token: string;

  // Se a integracao via API esta ligada (vs. so usar tabela importada)
  @Column({ default: false })
  integracao_ativa: boolean;

  // Status da ultima verificacao de conexao: "ok", "erro" ou null (nunca testado)
  @Column({ nullable: true })
  status_conexao: string;

  // ---- Autenticacao flexivel (suporta varios tipos de API) ----

  // Tipo de autenticacao:
  //  "token_fixo"   -> usa o campo token direto no header
  //  "login_senha"  -> faz POST de login pra GERAR o token (ex: Rodonaves)
  //  "nenhuma"      -> API aberta, sem autenticacao
  @Column({ default: 'token_fixo' })
  auth_tipo: string;

  // Para auth "login_senha": endpoint de login (ex: https://api.rte.com.br/token)
  @Column({ nullable: true })
  auth_url: string;

  // Para auth "login_senha": usuario e senha de acesso
  @Column({ nullable: true })
  auth_usuario: string;

  @Column({ nullable: true })
  auth_senha: string;

  // Campos extras em JSON (ex: companyId, grant_type, auth_type da Rodonaves).
  // Guardado como texto; o codigo faz parse quando precisa.
  @Column({ type: 'text', nullable: true })
  auth_extra: string;

  // Formato do corpo do login: "form" (x-www-form-urlencoded) ou "json"
  @Column({ default: 'form' })
  auth_formato: string;

  // Como o token vai no header das chamadas:
  //  "bearer"  -> Authorization: Bearer TOKEN
  //  "header"  -> um header customizado (nome em auth_header_nome)
  @Column({ default: 'bearer' })
  token_envio: string;

  // Nome do header customizado, quando token_envio = "header" (ex: "x-api-key")
  @Column({ nullable: true })
  auth_header_nome: string;

  // Ultima resposta crua do teste de conexao (pra voce ver e, no futuro,
  // configurar o mapeamento da Camada 3). Guardado como texto.
  @Column({ type: 'text', nullable: true })
  ultimo_teste_resposta: string;
}
