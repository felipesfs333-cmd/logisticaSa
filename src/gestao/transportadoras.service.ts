import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transportadora } from '../database/entities/transportadora.entity';
import { TabelaFrete } from '../database/entities/tabela-frete.entity';
import { RegraComercial } from '../database/entities/regra-comercial.entity';
import { CarrierAuthService } from './carrier-auth.service';

@Injectable()
export class TransportadorasService {
  constructor(
    @InjectRepository(Transportadora)
    private transpRepo: Repository<Transportadora>,
    @InjectRepository(TabelaFrete)
    private tabelaRepo: Repository<TabelaFrete>,
    @InjectRepository(RegraComercial)
    private regraRepo: Repository<RegraComercial>,
    private carrierAuth: CarrierAuthService,
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

  // Salva os dados de integracao (url, token, tipo de auth, credenciais, etc.)
  async salvarIntegracao(
    id: number,
    dados: {
      api_url?: string;
      token?: string;
      integracao_ativa?: boolean;
      auth_tipo?: string;
      auth_url?: string;
      auth_usuario?: string;
      auth_senha?: string;
      auth_extra?: string;
      auth_formato?: string;
      token_envio?: string;
      auth_header_nome?: string;
    },
  ) {
    const t = await this.transpRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transportadora nao encontrada.');
    if (dados.api_url !== undefined) t.api_url = dados.api_url;
    if (dados.token !== undefined) t.token = dados.token;
    if (dados.integracao_ativa !== undefined)
      t.integracao_ativa = dados.integracao_ativa;
    if (dados.auth_tipo !== undefined) t.auth_tipo = dados.auth_tipo;
    if (dados.auth_url !== undefined) t.auth_url = dados.auth_url;
    if (dados.auth_usuario !== undefined) t.auth_usuario = dados.auth_usuario;
    if (dados.auth_senha !== undefined) t.auth_senha = dados.auth_senha;
    if (dados.auth_extra !== undefined) t.auth_extra = dados.auth_extra;
    if (dados.auth_formato !== undefined) t.auth_formato = dados.auth_formato;
    if (dados.token_envio !== undefined) t.token_envio = dados.token_envio;
    if (dados.auth_header_nome !== undefined)
      t.auth_header_nome = dados.auth_header_nome;
    await this.transpRepo.save(t);
    return t;
  }

  /**
   * Testa a conexao com a API da transportadora.
   * 1) Autentica conforme o tipo (token fixo, ou login que gera token).
   * 2) Se ha api_url, faz uma chamada de teste com o token.
   * Guarda e retorna a RESPOSTA CRUA, pra voce inspecionar.
   */
  async testarConexao(id: number) {
    const t = await this.transpRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Transportadora nao encontrada.');

    // --- Passo 1: autenticar (gera/obtem o token conforme o tipo) ---
    const auth = await this.carrierAuth.obterToken(t);
    if (!auth.ok) {
      t.status_conexao = 'erro';
      t.ultimo_teste_resposta = auth.resposta_crua || auth.mensagem;
      await this.transpRepo.save(t);
      return {
        ok: false,
        etapa: 'autenticacao',
        mensagem: auth.mensagem,
        status_http: auth.status_http,
        resposta_crua: auth.resposta_crua || null,
      };
    }

    const token = auth.token_obtido || '';

    // Se nao ha URL de chamada cadastrada, paramos aqui (mas o login funcionou)
    if (!t.api_url) {
      t.status_conexao = 'ok';
      t.ultimo_teste_resposta = auth.resposta_crua || auth.mensagem;
      await this.transpRepo.save(t);
      return {
        ok: true,
        etapa: 'autenticacao',
        mensagem:
          t.auth_tipo === 'login_senha'
            ? 'Login OK. Cadastre uma URL de chamada (api_url) para testar um endpoint.'
            : auth.mensagem,
        resposta_crua: auth.resposta_crua || null,
      };
    }

    // --- Passo 2: chamada de teste na api_url, usando o token ---
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const headers = this.carrierAuth.montarHeaderAuth(t, token);
      const resp = await fetch(t.api_url, {
        method: 'GET',
        headers,
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      const textoCru = (await resp.text()).slice(0, 3000);
      const ok = resp.status < 500;
      t.status_conexao = ok ? 'ok' : 'erro';
      t.ultimo_teste_resposta = textoCru;
      await this.transpRepo.save(t);

      return {
        ok,
        etapa: 'chamada',
        status_http: resp.status,
        mensagem: ok
          ? `Conexao OK (HTTP ${resp.status}).`
          : `Servidor respondeu com erro (HTTP ${resp.status}).`,
        resposta_crua: textoCru,
      };
    } catch (e: any) {
      t.status_conexao = 'erro';
      const motivo =
        e.name === 'AbortError'
          ? 'Tempo esgotado (a API nao respondeu em 10s).'
          : 'Nao foi possivel conectar na URL informada.';
      t.ultimo_teste_resposta = motivo;
      await this.transpRepo.save(t);
      return { ok: false, etapa: 'chamada', mensagem: motivo };
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
