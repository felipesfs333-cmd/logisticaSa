import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('tabelas_frete')
// Indice para acelerar a busca por CEP + peso na hora de cotar
@Index(['transportadora_id', 'cep_inicio', 'cep_fim'])
export class TabelaFrete {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  transportadora_id: number;

  // CEPs guardados como numero (sem o traco) para comparar faixas
  @Column('bigint')
  cep_inicio: number;

  @Column('bigint')
  cep_fim: number;

  // Faixa de peso em GRAMAS (igual ao Excel).
  // Usamos decimal porque algumas linhas tem casas decimais (ex: 1000.01).
  @Column('decimal', { precision: 18, scale: 2 })
  peso_inicio_g: number;

  @Column('decimal', { precision: 18, scale: 2 })
  peso_fim_g: number;

  @Column('decimal', { precision: 12, scale: 4 })
  frete_base: number;

  @Column('decimal', { precision: 8, scale: 6, default: 0 })
  ad_valorem: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  extra_kg: number;

  @Column({ default: 0 })
  prazo_dias: number;
}
