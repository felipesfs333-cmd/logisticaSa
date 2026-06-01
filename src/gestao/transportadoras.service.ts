import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transportadora } from '../database/entities/transportadora.entity';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { RegraComercial } from '../database/entities/regra-comercial.entity';

@Injectable()
export class TransportadorasService {
  constructor(
    @InjectRepository(Transportadora)
    private transpRepo: Repository<Transportadora>,
    @InjectRepository(TabelaFrete)
    private tabelaRepo: Repository<TabelaFrete>,
    @InjectRepository(RegraComercial)
    private regraRepo: Repository<RegraComercial>,
  ) {}

  // Lista as transportadoras, ja com a contagem de faixas de frete de cada uma
  async listar() {
    const transportadoras = await this.transpRepo.find({ order: { id: 'ASC' } });
    const resultado = [];
    for (const t of transportadoras) {
      const faixas = await this.tabelaRepo.count({
        where: { transportadora_id: t.id },
      });
      resultado.push({
        id: t.id,
        nome: t.nome,
        ativo: t.ativo,
        faixas_frete: faixas,
        api_url: t.api_url || '',
        token: t.token || '',
        integracao_ativa: t.integracao_ativa,
        status_conexao: t.status_conexao || null,
      });
    }
    return resultado;
  }

  // Ativa ou desativa (liga/desliga) uma transportadora
  async alternarAtivo(id: number, ativo: boolean) {
    const t = await this.transpRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transportadora nao encontrada.');
    t.ativo = ativo;
    await this.transpRepo.save(t);
    return { id: t.id, nome: t.nome, ativo: t.ativo };
  }

  // Cria uma transportadora vazia (sem tabela de frete ainda)
  async criar(nome: string) {
    const t = this.transpRepo.create({ nome, ativo: true });
    await this.transpRepo.save(t);
    return { id: t.id, nome: t.nome, ativo: t.ativo, faixas_frete: 0 };
  }

  // Exclui a transportadora, suas tabelas de frete e suas regras
  async excluir(id: number) {
    const t = await this.transpRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transportadora nao encontrada.');
    await this.tabelaRepo.delete({ transportadora_id: id });
    await this.regraRepo.delete({ transportadora_id: id });
    await this.transpRepo.delete(id);
    return { excluido: true, id };
  }

  // Salva os dados de integracao (url, token, liga/desliga integracao)
  async salvarIntegracao(
    id: number,
    dados: { api_url?: string; token?: string; integracao_ativa?: boolean },
  ) {
    const t = await this.transpRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transportadora nao encontrada.');
    if (dados.api_url !== undefined) t.api_url = dados.api_url;
    if (dados.token !== undefined) t.token = dados.token;
    if (dados.integracao_ativa !== undefined)
      t.integracao_ativa = dados.integracao_ativa;
    await this.transpRepo.save(t);
    return t;
  }

  /**
   * Testa a conexao com a API da transportadora.
   * Faz uma requisicao simples a api_url e reporta se respondeu.
   * Salva o resultado em status_conexao.
   */
  async testarConexao(id: number) {
    const t = await this.transpRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transportadora nao encontrada.');
    if (!t.api_url) {
      return { ok: false, mensagem: 'Nenhuma URL de API cadastrada.' };
    }

    try {
      // Timeout de 8s para nao travar caso a API nao responda
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const resp = await fetch(t.api_url, {
        method: 'GET',
        headers: t.token ? { Authorization: `Bearer ${t.token}` } : {},
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      const ok = resp.status < 500; // 2xx/3xx/4xx = servidor respondeu
      t.status_conexao = ok ? 'ok' : 'erro';
      await this.transpRepo.save(t);
      return {
        ok,
        status_http: resp.status,
        mensagem: ok
          ? `Conexao estabelecida (HTTP ${resp.status}).`
          : `Servidor respondeu com erro (HTTP ${resp.status}).`,
      };
    } catch (e: any) {
      t.status_conexao = 'erro';
      await this.transpRepo.save(t);
      const motivo =
        e.name === 'AbortError'
          ? 'Tempo esgotado (a API nao respondeu em 8s).'
          : 'Nao foi possivel conectar na URL informada.';
      return { ok: false, mensagem: motivo };
    }
  }

  // Edita os dados de uma transportadora (nome, api_url, token)
  async editar(id: number, dados: Partial<Transportadora>) {
    const t = await this.transpRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transportadora nao encontrada.');
    if (dados.nome !== undefined) t.nome = dados.nome;
    if (dados.api_url !== undefined) t.api_url = dados.api_url;
    if (dados.token !== undefined) t.token = dados.token;
    await this.transpRepo.save(t);
    return t;
  }
}
