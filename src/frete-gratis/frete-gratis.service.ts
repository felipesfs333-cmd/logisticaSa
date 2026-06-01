import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreteGratis } from '../database/entities/frete-gratis.entity';

@Injectable()
export class FreteGratisService {
  constructor(
    @InjectRepository(FreteGratis)
    private repo: Repository<FreteGratis>,
  ) {}

  listar() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  criar(dados: Partial<FreteGratis>) {
    const r = this.repo.create(dados);
    return this.repo.save(r);
  }

  async remover(id: number) {
    await this.repo.delete(id);
    return { removido: true, id };
  }

  carregarAtivas() {
    return this.repo.find({ where: { ativo: true } });
  }

  /**
   * Decide se um frete deve ser gratuito.
   * Recebe: transportadora, CEP destino (numero), valor do pedido e a data atual.
   * Retorna true se ALGUMA regra ativa casar com todas as condicoes.
   */
  elegivel(
    regras: FreteGratis[],
    transportadoraId: number,
    cep: number,
    valorPedido: number,
    hoje: Date = new Date(),
  ): boolean {
    for (const r of regras) {
      if (!r.ativo) continue;

      // Transportadora (null = qualquer)
      if (r.transportadora_id && r.transportadora_id !== transportadoraId) continue;

      // Faixa de CEP
      if (cep < Number(r.cep_inicio) || cep > Number(r.cep_fim)) continue;

      // Valor minimo do pedido
      if (valorPedido < Number(r.valor_minimo)) continue;

      // Periodo (se definido)
      if (r.data_inicio && hoje < new Date(r.data_inicio)) continue;
      if (r.data_fim) {
        // inclui o dia final inteiro
        const fim = new Date(r.data_fim);
        fim.setHours(23, 59, 59, 999);
        if (hoje > fim) continue;
      }

      // Passou em tudo -> frete gratis
      return true;
    }
    return false;
  }
}
