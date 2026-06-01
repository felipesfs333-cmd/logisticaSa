import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegraComercial } from '../database/entities/regra-comercial.entity';

// As 27 UFs do Brasil
export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export interface FreteBruto {
  transportadora: string;
  transportadora_id: number;
  valor: number;
  prazo: number;
}

@Injectable()
export class RegrasService {
  constructor(
    @InjectRepository(RegraComercial)
    private regraRepo: Repository<RegraComercial>,
  ) {}

  // Lista as regras de UMA transportadora, garantindo as 27 UFs.
  async porTransportadora(transportadoraId: number) {
    const existentes = await this.regraRepo.find({
      where: { transportadora_id: transportadoraId },
    });
    const mapa = new Map(existentes.map((r) => [r.estado, r]));

    return UFS.map((uf) => {
      const r = mapa.get(uf);
      return {
        estado: uf,
        markup: r ? Number(r.markup) : 0,
        dias_extras: r ? r.dias_extras : 0,
        frete_minimo: r ? Number(r.frete_minimo) : 0,
        ativo_no_estado: r ? r.ativo_no_estado : true,
      };
    });
  }

  // Salva (cria ou atualiza) a regra de uma transportadora em um estado.
  async salvar(transportadoraId, estado, dados) {
    let regra = await this.regraRepo.findOne({
      where: { transportadora_id: transportadoraId, estado },
    });
    if (!regra) {
      regra = this.regraRepo.create({ transportadora_id: transportadoraId, estado });
    }
    if (dados.markup !== undefined) regra.markup = dados.markup;
    if (dados.dias_extras !== undefined) regra.dias_extras = dados.dias_extras;
    if (dados.frete_minimo !== undefined) regra.frete_minimo = dados.frete_minimo;
    if (dados.ativo_no_estado !== undefined) regra.ativo_no_estado = dados.ativo_no_estado;
    return this.regraRepo.save(regra);
  }

  async removerDaTransportadora(transportadoraId) {
    await this.regraRepo.delete({ transportadora_id: transportadoraId });
  }

  carregarTodas() {
    return this.regraRepo.find();
  }

  // Aplica a regra; retorna null se a transportadora estiver desativada no estado.
  aplicar(frete, uf, regras) {
    const regra = regras.find(
      (r) => r.transportadora_id === frete.transportadora_id && r.estado === uf,
    );
    if (!regra) return frete;
    if (!regra.ativo_no_estado) return null;

    let valor = frete.valor;
    let prazo = frete.prazo;
    if (Number(regra.markup) > 0) valor = valor * (1 + Number(regra.markup) / 100);
    if (Number(regra.dias_extras) > 0) prazo = prazo + Number(regra.dias_extras);
    if (Number(regra.frete_minimo) > 0 && valor < Number(regra.frete_minimo)) {
      valor = Number(regra.frete_minimo);
    }
    return { ...frete, valor: Math.round(valor * 100) / 100, prazo };
  }
}
