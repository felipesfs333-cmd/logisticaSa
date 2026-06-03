import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('lojas_nuvemshop')
export class LojaNuvemshop {
  // store_id da Nuvemshop (vem como user_id na resposta do OAuth)
  @PrimaryColumn('bigint')
  store_id: string;

  // Token de acesso da loja (nao expira, segundo a doc da Nuvemshop)
  @Column()
  access_token: string;

  // ID do carrier criado nessa loja (para nao duplicar)
  @Column({ nullable: true })
  carrier_id: string;

  // ID da opcao de frete criada dentro do carrier
  @Column({ nullable: true })
  shipping_option_id: string;

  @CreateDateColumn()
  criado_em: Date;
}
