import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * Regra comercial de uma transportadora em um estado especifico.
 * Cada combinacao (transportadora + estado) tem no maximo uma regra.
 */
@Entity('regras_comerciais')
@Index(['transportadora_id', 'estado'], { unique: true })
export class RegraComercial {
  @PrimaryGeneratedColumn()
  id: number;

  // A qual transportadora esta regra pertence
  @Column()
  transportadora_id: number;

  // UF do estado. Ex: "MG", "SP". Sempre preenchido.
  @Column()
  estado: string;

  // Markup: acrescimo percentual sobre o frete. Ex: 12 = +12%.
  @Column('decimal', { precision: 6, scale: 2, default: 0 })
  markup: number;

  // Dias extras somados ao prazo (lead time extra). Ex: 2 = +2 dias.
  @Column({ default: 0 })
  dias_extras: number;

  // Frete minimo neste estado. Ex: 19.90. Zero = sem minimo.
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  frete_minimo: number;

  // Se a transportadora esta ativa neste estado.
  // Se false, ela nao aparece nas cotacoes de CEPs deste estado.
  @Column({ default: true })
  ativo_no_estado: boolean;
}
