import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { Transportadora } from '../database/entities/transportadora.entity';
import { RegrasService } from './regras.service';
import { FreteGratisService } from '../frete-gratis/frete-gratis.service';
import { ufPorCep } from './uf-por-cep';

// Formato do que chega na requisicao de cotacao
export interface CotacaoInput {
  cep_destino: string; // ex: "30110000" ou "30110-000"
  peso: number; // em KG (ex: 18.5)
  valor_nf: number; // valor da nota fiscal em R$ (ex: 1200)
}

// Formato de cada opcao de frete devolvida
export interface CotacaoResultado {
  transportadora: string;
  valor: number;
  prazo: number;
  frete_gratis?: boolean;
}

@Injectable()
export class CotacaoService {
  constructor(
    @InjectRepository(TabelaFrete)
    private tabelaRepo: Repository<TabelaFrete>,
    @InjectRepository(Transportadora)
    private transpRepo: Repository<Transportadora>,
    private regrasService: RegrasService,
    private freteGratisService: FreteGratisService,
  ) {}

  async cotar(input: CotacaoInput) {
    // 1. Normaliza as entradas
    const cep = this.limparCep(input.cep_destino);
    const pesoG = Math.round(input.peso * 1000); // converte KG -> gramas
    const valorNf = Number(input.valor_nf) || 0;

    if (!cep || cep.length !== 8) {
      throw new BadRequestException('CEP de destino invalido.');
    }
    if (pesoG <= 0) {
      throw new BadRequestException('Peso deve ser maior que zero.');
    }

    // 2. Busca, para cada transportadora ATIVA, a faixa que cobre
    //    esse CEP e esse peso. Uma query soh, filtrando no banco.
    const cepNum = Number(cep);

    const faixas = await this.tabelaRepo
      .createQueryBuilder('t')
      .innerJoin(Transportadora, 'tr', 'tr.id = t.transportadora_id')
      .where('tr.ativo = true')
      .andWhere('t.cep_inicio <= :cep AND t.cep_fim >= :cep', { cep: cepNum })
      .andWhere('t.peso_inicio_g <= :peso AND t.peso_fim_g >= :peso', {
        peso: pesoG,
      })
      .select([
        't.transportadora_id AS transportadora_id',
        't.frete_base AS frete_base',
        't.ad_valorem AS ad_valorem',
        't.extra_kg AS extra_kg',
        't.prazo_dias AS prazo_dias',
        'tr.nome AS nome',
      ])
      .getRawMany();

    if (faixas.length === 0) {
      return {
        cep_destino: cep,
        peso_kg: input.peso,
        opcoes: [],
        aviso: 'Nenhuma transportadora atende esse CEP/peso.',
      };
    }

    // 3. Calcula o frete BRUTO de cada faixa encontrada (antes das regras)
    const brutos = faixas.map((f) => {
      const base = Number(f.frete_base);
      const adValorem = Number(f.ad_valorem) * valorNf; // % sobre a nota
      const pesoKg = pesoG / 1000;
      const extra = Number(f.extra_kg) * pesoKg;

      const total = base + adValorem + extra;

      return {
        transportadora: f.nome,
        transportadora_id: Number(f.transportadora_id),
        valor: Math.round(total * 100) / 100,
        prazo: Number(f.prazo_dias),
      };
    });

    // 4. Descobre o estado (UF) do destino e carrega regras + fretes gratis
    const uf = ufPorCep(cepNum);
    const regras = await this.regrasService.carregarTodas();
    const fretesGratis = await this.freteGratisService.carregarAtivas();

    // 5. Aplica a regra de cada transportadora para o estado do destino.
    //    Quem estiver DESATIVADA no estado retorna null e e removida (filter).
    //    Depois, verifica frete gratis: se o pedido casa com alguma regra de
    //    frete gratis, o valor vai a zero (mas mantemos prazo e transportadora).
    const opcoes: CotacaoResultado[] = brutos
      .map((f) => this.regrasService.aplicar(f, uf, regras))
      .filter((f) => f !== null)
      .map((f) => {
        const gratis = this.freteGratisService.elegivel(
          fretesGratis,
          f.transportadora_id,
          cepNum,
          valorNf,
        );
        return {
          transportadora: f.transportadora,
          valor: gratis ? 0 : f.valor,
          prazo: f.prazo,
          frete_gratis: gratis,
        };
      });

    if (opcoes.length === 0) {
      return {
        cep_destino: cep,
        estado: uf,
        peso_kg: input.peso,
        opcoes: [],
        aviso: 'Nenhuma transportadora ativa atende esse CEP/peso.',
      };
    }

    // 6. Se a mesma transportadora aparecer mais de uma vez, fica a mais barata
    const porTransportadora = new Map<string, CotacaoResultado>();
    for (const op of opcoes) {
      const atual = porTransportadora.get(op.transportadora);
      if (!atual || op.valor < atual.valor) {
        porTransportadora.set(op.transportadora, op);
      }
    }
    const finais = Array.from(porTransportadora.values());

    // 7. Ordena da mais barata para a mais cara (ja com as regras aplicadas)
    finais.sort((a, b) => a.valor - b.valor);

    // 8. Identifica o mais barato e o mais rapido (atalho util pro checkout)
    const maisBarato = finais[0];
    const maisRapido = [...finais].sort((a, b) => a.prazo - b.prazo)[0];

    return {
      cep_destino: cep,
      estado: uf,
      peso_kg: input.peso,
      valor_nf: valorNf,
      opcoes: finais,
      mais_barato: maisBarato,
      mais_rapido: maisRapido,
    };
  }

  // Remove tudo que nao for numero do CEP
  private limparCep(cep: string): string {
    return String(cep || '').replace(/\D/g, '');
  }
}
