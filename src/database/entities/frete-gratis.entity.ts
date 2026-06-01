import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Regra de frete gratis. Quando um pedido casa com todas as condicoes
 * (transportadora, faixa de CEP, periodo e valor minimo), o frete e zerado.
 */
@Entity('fretes_gratis')
export class FreteGratis {
  @PrimaryGeneratedColumn()
  id: number;

  // Transportadora a que se aplica. null = todas.
  @Column({ nullable: true })
  transportadora_id: number;

  // Faixa de CEP de destino (numerica, 8 digitos)
  @Column('bigint')
  cep_inicio: number;

  @Column('bigint')
  cep_fim: number;

  // Valor minimo do pedido para liberar o frete gratis. Ex: 200.00
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  valor_minimo: number;

  // Periodo de validade (datas ISO). null = sem limite naquele extremo.
  @Column({ type: 'date', nullable: true })
  data_inicio: string;

  @Column({ type: 'date', nullable: true })
  data_fim: string;

  @Column({ default: true })
  ativo: boolean;
}
