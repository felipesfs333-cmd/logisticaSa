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
}
