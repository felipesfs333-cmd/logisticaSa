import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transportadora } from '../database/entities/transportadora.entity';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { ufPorCep } from '../cotacao/uf-por-cep';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Transportadora)
    private transpRepo: Repository<Transportadora>,
    @InjectRepository(TabelaFrete)
    private tabelaRepo: Repository<TabelaFrete>,
    private dataSource: DataSource,
  ) {}

  /**
   * Resumo geral para os cards do topo do dashboard.
   * Tudo aqui vem de dados REAIS (tabelas de frete importadas).
   */
  async resumo() {
    const totalTransportadoras = await this.transpRepo.count();
    const ativas = await this.transpRepo.count({ where: { ativo: true } });
    const totalFaixas = await this.tabelaRepo.count();

    // Prazo medio e frete medio base, calculados sobre todas as faixas
    const medias = await this.tabelaRepo
      .createQueryBuilder('t')
      .select('AVG(t.prazo_dias)', 'prazo_medio')
      .addSelect('AVG(t.frete_base)', 'frete_medio')
      .getRawOne();

    return {
      transportadoras: {
        total: totalTransportadoras,
        ativas,
        inativas: totalTransportadoras - ativas,
      },
      faixas_frete: totalFaixas,
      prazo_medio_dias: Math.round(Number(medias.prazo_medio) * 10) / 10,
      frete_medio_base: Math.round(Number(medias.frete_medio) * 100) / 100,
      // Estes dependem de pedidos reais (Nuvemshop). Ainda nao disponiveis.
      pendente_de_pedidos: {
        faturamento_por_transportadora: null,
        lead_time_real: null,
        pedidos_no_periodo: null,
      },
    };
  }

  /**
   * Cobertura e frete medio por transportadora.
   * Util para o grafico "comparativo por transportadora".
   */
  async porTransportadora() {
    const rows = await this.tabelaRepo
      .createQueryBuilder('t')
      .innerJoin(Transportadora, 'tr', 'tr.id = t.transportadora_id')
      .select('tr.nome', 'transportadora')
      .addSelect('COUNT(*)', 'faixas')
      .addSelect('AVG(t.frete_base)', 'frete_medio')
      .addSelect('AVG(t.prazo_dias)', 'prazo_medio')
      .groupBy('tr.nome')
      .getRawMany();

    return rows.map((r) => ({
      transportadora: r.transportadora,
      faixas: Number(r.faixas),
      frete_medio: Math.round(Number(r.frete_medio) * 100) / 100,
      prazo_medio: Math.round(Number(r.prazo_medio) * 10) / 10,
    }));
  }

  /**
   * Cobertura por estado: quantas faixas de CEP cada estado tem.
   * Como mapear CEP->UF e logica de aplicacao, fazemos em memoria
   * sobre uma amostra de faixas (as tabelas tem o cep_inicio).
   */
  async porEstado() {
    // Pega o cep_inicio de todas as faixas (apenas a coluna, leve)
    const faixas = await this.tabelaRepo
      .createQueryBuilder('t')
      .select('t.cep_inicio', 'cep')
      .getRawMany();

    const contagem: Record<string, number> = {};
    for (const f of faixas) {
      const uf = ufPorCep(Number(f.cep));
      if (!uf) continue;
      contagem[uf] = (contagem[uf] || 0) + 1;
    }

    // Transforma em array ordenado por quantidade
    return Object.entries(contagem)
      .map(([estado, faixas]) => ({ estado, faixas }))
      .sort((a, b) => b.faixas - a.faixas);
  }
}
